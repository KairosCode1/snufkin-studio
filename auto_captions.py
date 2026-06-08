#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Auto Captions — Watcher v2
Captions con estilos mixtos: normal + momentos clave con tipografia creativa
"""

import os
import sys
import re
import time
import json
import shutil
import logging
import argparse
import threading
import subprocess
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
# faster_whisper y groq se importan de forma lazy (solo al procesar el primer video)
# → arranque del servidor mucho más rápido en frío

# ── Rutas ───────────────────────────────────────────────────────────────────────
# PyInstaller support: when frozen, __file__ is inside a temp dir — use exe location
if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys.executable).parent
else:
    BASE_DIR = Path(__file__).parent

# APP_WORKSPACE: writable workspace dir injected by Electron
# In packaged app: %APPDATA%\SnufkinStudio\workspace\
# In dev mode: falls back to BASE_DIR (project root)
_WORKSPACE   = Path(os.environ.get("APP_WORKSPACE", str(BASE_DIR)))
INPUT_DIR    = _WORKSPACE / "input"
OUTPUT_DIR   = _WORKSPACE / "output"
PROJECTS_DIR = _WORKSPACE / "projects"

DEFAULT_LANGUAGE = "es"
DEFAULT_MODEL    = "medium"
VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm"}

# ── Herramientas externas (paths inyectados por Electron via env vars) ───────────
FFMPEG_EXE  = os.environ.get("FFMPEG_EXE",  "ffmpeg")
FFPROBE_EXE = os.environ.get("FFPROBE_EXE", "ffprobe")


# ── GSAP local (CRÍTICO: evita depender del CDN durante el render headless) ──────
# El render de HyperFrames corre en Chrome headless SIN red garantizada. Si GSAP se
# carga desde CDN y la red falla/tarda, `gsap.timeline()` lanza "gsap is not defined",
# la timeline 'main' NUNCA se registra, y los captions se capturan en su estado CSS
# estático → TODOS los grupos visibles a la vez = superposición (texto doble/3 líneas).
# Embebemos GSAP inline para que SIEMPRE esté disponible offline.
_GSAP_INLINE_CACHE = None
def _load_gsap_inline() -> str:
    global _GSAP_INLINE_CACHE
    if _GSAP_INLINE_CACHE is not None:
        return _GSAP_INLINE_CACHE
    candidates = [
        BASE_DIR / "resources" / "vendor" / "gsap.min.js",          # dev: project root
        BASE_DIR.parent / "vendor" / "gsap.min.js",                  # frozen: <app>/resources/vendor
        BASE_DIR / "vendor" / "gsap.min.js",
        Path(__file__).parent / "resources" / "vendor" / "gsap.min.js",
    ]
    # Derivado de NPX_CMD (frozen): node vive en <app>/resources/tools/node → vendor hermano
    _npx = os.environ.get("NPX_CMD", "")
    if _npx:
        try:
            _tools = Path(_npx).parent.parent          # .../tools/node → .../tools
            candidates.append(_tools.parent / "vendor" / "gsap.min.js")  # resources/vendor
            candidates.append(_tools / "vendor" / "gsap.min.js")         # tools/vendor
        except Exception:
            pass
    for p in candidates:
        try:
            if p.is_file():
                src = p.read_text(encoding="utf-8")
                if "gsap" in src:
                    _GSAP_INLINE_CACHE = (
                        "<script>/* GSAP 3 (local/offline) — embebido para el render headless */\n"
                        + src + "\n</script>"
                    )
                    return _GSAP_INLINE_CACHE
        except Exception:
            pass
    # Fallback: CDN (mejor que nada, pero arriesgado sin red en el render).
    _GSAP_INLINE_CACHE = '<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>'
    return _GSAP_INLINE_CACHE


def _get_groq_key() -> str:
    """Lee la API key de Groq desde el entorno (seteada por Electron o config.json)."""
    key = os.environ.get("GROQ_API_KEY", "")
    if not key:
        # Fallback: leer config.json del workspace
        for cfg_path in (_WORKSPACE / "config.json", BASE_DIR / "config.json"):
            if cfg_path.exists():
                try:
                    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
                    key = cfg.get("groq_api_key", "")
                    if key:
                        os.environ["GROQ_API_KEY"] = key
                        break
                except Exception:
                    pass
    return key

# ── Logging ─────────────────────────────────────────────────────────────────────
_WORKSPACE.mkdir(parents=True, exist_ok=True)  # ensure writable dir exists
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(message)s",
    handlers=[
        logging.FileHandler(_WORKSPACE / "auto_captions.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)
log = logging.getLogger(__name__)


# ── Identificar momentos clave con Groq (dos niveles) ──────────────────────────
def identify_key_words(words: list) -> tuple:
    """Devuelve (top_words, secondary_words).
    top       → palabras que reciben el estilo BIG amarillo
    secondary → palabras que reciben subrayado tipo lapiz amarillo
    """
    try:
        from groq import Groq
        full_text = " ".join(w["text"] for w in words)
        client = Groq(api_key=_get_groq_key())
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{
                "role": "user",
                "content": f"""Dado este transcript en espanol:
"{full_text}"

Identifica DOS niveles de palabras importantes:

1. TOP (2-3 palabras): Las MAS impactantes del mensaje. Conceptos centrales con maximo peso semantico. Merecen destacarse visualmente con gran tamano.
2. SECONDARY (3-5 palabras): Palabras importantes pero que no llegan al nivel top. Sustantivos y adjetivos con carga conceptual relevante. Recibiran un subrayado sutil.

EVITA en ambos niveles: monosilabos (si, no, ya, me, se, lo, la, por, que, es, un, hay, son), verbos comunes sin carga semantica (hacer, tener, ser, estar, ir), articulos y preposiciones.
Las palabras TOP y SECONDARY NO deben solaparse.

Devuelve SOLO este JSON (sin texto adicional):
{{"top": ["palabra1", "palabra2"], "secondary": ["palabra3", "palabra4", "palabra5"]}}"""
            }],
            max_tokens=150,
            temperature=0.3
        )
        raw = response.choices[0].message.content.strip()
        # Extraer el JSON desde el primer { hasta el ultimo }
        start_idx = raw.find('{')
        end_idx   = raw.rfind('}')
        if start_idx != -1 and end_idx != -1:
            data = json.loads(raw[start_idx:end_idx + 1])
            top       = {w.lower().strip('.,!?;:') for w in data.get("top", [])}
            secondary = {w.lower().strip('.,!?;:') for w in data.get("secondary", [])}
            secondary -= top   # asegurar que no se solapen
            log.info(f"  Palabras TOP: {top}")
            log.info(f"  Palabras SECONDARY (subrayado): {secondary}")
            return top, secondary
    except Exception as e:
        log.warning(f"  Groq no disponible, sin estilos clave: {e}")
    return set(), set()


# ── Agrupar palabras en grupos de captions ──────────────────────────────────────
MIN_GROUPS_BETWEEN_EMPHASIS = 5   # Al menos 5 grupos normales entre dos enfasis
MAX_WITHIN_GROUP_GAP        = 0.75  # Segundos — si hay mas silencio entre palabras, corta el grupo
REPEAT_EMPHASIS_COOLDOWN    = 30.0  # Segundos — misma palabra no puede repetir BIG en este intervalo


def apply_gap_limit(chunk: list, max_gap: float) -> list:
    """Recorta el chunk si hay un silencio largo entre palabras consecutivas.

    Usa dos métricas porque Whisper a veces extiende el 'end' de una palabra
    hasta el 'start' de la siguiente, haciendo que end→start sea ~0 incluso
    con un segundo real de silencio.
    - end→start > max_gap  (gap de silencio real)
    - start→start > 1.2s   (las palabras están muy separadas en el tiempo)
    """
    if not chunk:
        return []
    result = [chunk[0]]
    for j in range(1, len(chunk)):
        gap_end_start   = chunk[j]["start"] - chunk[j-1]["end"]
        gap_start_start = chunk[j]["start"] - chunk[j-1]["start"]
        if gap_end_start > max_gap or gap_start_start > 1.2:
            break
        result.append(chunk[j])
    return result


def transcript_to_groups(words: list, key_words: set, secondary_words: set = None, max_words: int = 3) -> list:
    if secondary_words is None:
        secondary_words = set()

    groups = []
    last_emphasis_idx    = -MIN_GROUPS_BETWEEN_EMPHASIS
    recently_emphasized  = {}   # word_text → ultimo timestamp en que se mostro BIG

    # Posiciones globales de palabras clave (top y secondary)
    top_positions = {
        j for j, w in enumerate(words)
        if w["text"].lower().strip('.,!?;:') in key_words
    }
    secondary_positions = set(
        j for j, w in enumerate(words)
        if w["text"].lower().strip('.,!?;:') in secondary_words
    )

    i = 0
    while i < len(words):
        raw_chunk = words[i: i + max_words]
        if not raw_chunk:
            break

        chunk = apply_gap_limit(raw_chunk, MAX_WITHIN_GROUP_GAP)

        # Buscar palabra TOP dentro del chunk
        key_word_index = None
        for wi in range(len(chunk)):
            if (i + wi) in top_positions:
                key_word_index = wi
                break

        is_emphasis = key_word_index is not None

        # Filtro 1: distancia mínima entre grupos de énfasis
        if is_emphasis and (len(groups) - last_emphasis_idx) < MIN_GROUPS_BETWEEN_EMPHASIS:
            is_emphasis = False
            key_word_index = None

        # Filtro 2: cooldown — misma palabra ya fue BIG hace menos de 30s → degradar a subrayado
        if is_emphasis:
            kw_text = chunk[key_word_index]["text"].lower().strip('.,!?;:')
            kw_time = chunk[key_word_index]["start"]
            last_t  = recently_emphasized.get(kw_text)
            if last_t is not None and (kw_time - last_t) < REPEAT_EMPHASIS_COOLDOWN:
                # Degradar: marcar como subrayado en vez de BIG
                secondary_positions.add(i + key_word_index)
                is_emphasis    = False
                key_word_index = None
            else:
                recently_emphasized[kw_text] = kw_time

        if is_emphasis:
            last_emphasis_idx = len(groups)
            # Si la palabra clave está en índice 0, incluir la palabra anterior
            # para que quede centrada (índice 1) en el grupo de énfasis
            if key_word_index == 0 and i > 0:
                prev = words[i - 1]
                chunk = [prev] + chunk[:2]   # prev + KEY + siguiente (máx 3)
                key_word_index = 1
                next_i = i + len(chunk) - 1
            else:
                next_i = i + len(chunk)
        else:
            next_i = i + len(chunk)

        # Construir palabras del grupo; marcar secondary con style-underline
        group_words = []
        for wi, w in enumerate(chunk):
            style = None
            if not is_emphasis and (i + wi) in secondary_positions:
                style = "style-underline"
            group_words.append({
                "t":     w["text"].upper(),
                "s":     w["start"],
                "e":     w["end"],
                "style": style,
            })

        group_end = chunk[-1]["end"] + 0.05
        if next_i < len(words):
            group_end = min(group_end, words[next_i]["start"])

        groups.append({
            "end":            round(group_end, 3),
            "words":          group_words,
            "emphasis":       is_emphasis,
            "key_word_index": key_word_index,
        })
        i = next_i
    return groups


# ── Helpers para construccion del HTML ──────────────────────────────────────────

def get_word_style_py(is_emphasis: bool, word_index: int, total_words: int, key_word_index: int = 1) -> str:
    """La palabra clave recibe style-big, las demas style-small."""
    if not is_emphasis:
        return ''
    return 'style-big' if word_index == key_word_index else 'style-small'


def compute_display_timing(groups: list, duration: float,
                           extra_s: float = 0.5, min_gap: float = 0.05) -> list:
    """Pre-calcula display_start/display_dur para cada grupo.

    Usa data-start/data-duration de HyperFrames en lugar de GSAP tl.set(visibility).
    HyperFrames corta el clip exactamente a display_start+display_dur con independencia
    del estado de GSAP, eliminando el freeze de forma definitiva.

    Patron: wrapper-div con data-start/data-duration → gestionado por HyperFrames
            inner-div sin data-*                     → gestionado por GSAP (solo animacion)
    """
    last_emphasis_cleanup = 0.0
    last_active_group = None  # track last non-skipped group to prevent overlap
    for group in groups:
        raw_start = group["words"][0]["s"]
        raw_end   = min(group["end"], duration - 0.05)
        is_emph   = group.get("emphasis", False)

        delay         = max(0.0, last_emphasis_cleanup + min_gap - raw_start)
        display_start = round(raw_start + delay, 3)
        display_end   = round(
            min(raw_end + extra_s, duration - 0.05) if is_emph else raw_end,
            3
        )
        display_dur = round(display_end - display_start, 3)

        if display_start >= display_end - 0.05 or display_dur < 0.05:
            group["skip"] = True
        else:
            group["skip"]          = False
            group["display_start"] = display_start
            group["display_dur"]   = display_dur
            group["delay"]         = round(delay, 3)
            # Truncate the previous active clip if this one starts before it ends.
            # This happens when an emphasis group absorbs the previous word
            # (key_word_index==0), causing its display_start to fall inside the
            # previous clip's range → two clips visible simultaneously.
            if last_active_group is not None:
                prev_end = round(
                    last_active_group["display_start"] + last_active_group["display_dur"], 3
                )
                if prev_end > display_start:
                    last_active_group["display_dur"] = round(
                        max(0.05, display_start - last_active_group["display_start"] - 0.001), 3
                    )
            last_active_group = group

        if is_emph and not group.get("skip"):
            last_emphasis_cleanup = display_end

    return groups


# ── Helper: hex → rgba(r,g,b,a) ──────────────────────────────────────────────────
def _hex_to_rgba(hex_color: str, alpha: float) -> str:
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return f"rgba({r},{g},{b},{alpha})"

def _underline_neon_filter(hex_color: str) -> str:
    """CSS filter: drop-shadow neón para el subrayado SVG, igual de intenso que el glow del BIG."""
    c  = hex_color
    c2 = _hex_to_rgba(hex_color, 0.75)
    c3 = _hex_to_rgba(hex_color, 0.45)
    return f"drop-shadow(0 0 4px {c}) drop-shadow(0 0 10px {c2}) drop-shadow(0 0 22px {c3})"

# ── Glow presets por color de énfasis ────────────────────────────────────────────
_GLOW_S1 = {   # sombra de color para .style-big en style1
    "#FFE033": "0 0 50px rgba(255,220,0,0.45)",
    "#00E5FF": "0 0 50px rgba(0,229,255,0.45)",
    "#FF3D9A": "0 0 50px rgba(255,61,154,0.45)",
    "#4ADE80": "0 0 50px rgba(74,222,128,0.45)",
    "#FF3333": "0 0 50px rgba(255,51,51,0.45)",
    "#FF8C00": "0 0 50px rgba(255,140,0,0.45)",
}
_GLOW_S2 = {   # glow completo para .s2 .style-big
    "#FFE033": "0 0 5px #FFE033, 0 0 12px #FFD700, 0 0 26px #FFA500, 0 0 52px rgba(255,140,0,0.65), 0 0 90px rgba(255,100,0,0.30)",
    "#00E5FF": "0 0 5px #00E5FF, 0 0 12px #00CFFF, 0 0 26px #0090FF, 0 0 52px rgba(0,120,255,0.65), 0 0 90px rgba(0,60,200,0.30)",
    "#FF3D9A": "0 0 5px #FF3D9A, 0 0 12px #FF1080, 0 0 26px #CC0066, 0 0 52px rgba(200,0,100,0.65), 0 0 90px rgba(150,0,80,0.30)",
    "#4ADE80": "0 0 5px #4ADE80, 0 0 12px #20C060, 0 0 26px #108040, 0 0 52px rgba(20,160,60,0.65), 0 0 90px rgba(10,100,40,0.30)",
    "#FF3333": "0 0 5px #FF3333, 0 0 12px #FF0000, 0 0 26px #CC0000, 0 0 52px rgba(200,0,0,0.65), 0 0 90px rgba(150,0,0,0.30)",
    "#FF8C00": "0 0 5px #FF8C00, 0 0 12px #FF6600, 0 0 26px #CC4400, 0 0 52px rgba(200,80,0,0.65), 0 0 90px rgba(150,50,0,0.30)",
}

# ── Generar HTML ─────────────────────────────────────────────────────────────────
_FONT_CSS_MAP = {
    "outfit":   ("'Outfit', sans-serif",          "700"),
    "inter":    ("'Inter', sans-serif",            "700"),
    "raleway":  ("'Raleway', sans-serif",          "300"),
    "playfair": ("'Playfair Display', serif",      "700"),
}

def build_html(video_filename: str, duration: float, groups: list, lang: str = "es",
               style: str = "style1", orientation: str = "vertical",
               highlight_color: str = "#FFE033", enable_zoom: bool = True,
               caption_pos: int = 15, caption_font: str = "outfit",
               caption_anim: str = "default",
               caption_case: str = "lower", caption_size: int = 100,
               caption_stroke: bool = False) -> str:
    # Pre-calcular timing usando el sistema nativo de clips de HyperFrames
    groups = compute_display_timing(groups, duration)

    # ── HTML estatico: un wrapper-clip por grupo ─────────────────────────────
    # El wrapper (data-start/data-duration) es gestionado por HyperFrames:
    # se muestra/oculta de forma determinista sin intervención de GSAP.
    # El inner div (#cg-N) no tiene data-*, GSAP lo anima libremente.
    clip_parts = []
    for gi, group in enumerate(groups):
        if group.get("skip"):
            continue

        ds      = group["display_start"]
        dd      = group["display_dur"]
        is_emph = group.get("emphasis", False)
        words   = group["words"]
        n       = len(words)

        if style in ("style2", "style_doc", "style3", "style_retro", "style_sub", "style_bold"):
            group_cls = "caption-group"
        else:
            group_cls = "caption-group emphasis-group" if is_emph else "caption-group"
        kw_idx = group.get("key_word_index") if group.get("key_word_index") is not None else 1

        # Style1 emphasis: vertical layout — before above, big in center, after below
        # Horizontal styles (doc/sub/bold) SIEMPRE fila plana de 1 línea → excluidos
        if is_emph and style not in ("style2", "style_doc", "style3", "style_retro", "style_sub", "style_bold"):
            before_spans, big_span_html, after_spans = [], None, []
            for wi, word in enumerate(words):
                sc   = get_word_style_py(True, wi, n, kw_idx)
                cls  = f"caption-word{' ' + sc if sc else ''}"
                raw  = word["t"].upper() if sc == "style-big" else word["t"].lower()
                text = re.sub(r'[.,]', '', raw)
                span = f'<span id="cw-{gi}-{wi}" class="{cls}">{text}</span>'
                if wi < kw_idx:
                    before_spans.append(f'          {span}')
                elif wi == kw_idx:
                    big_span_html = f'        {span}'
                else:
                    after_spans.append(f'          {span}')
            html_parts = []
            if before_spans:
                html_parts.append(
                    '        <div class="emphasis-before">\n' +
                    '\n'.join(before_spans) + '\n        </div>'
                )
            if big_span_html:
                html_parts.append(big_span_html)
            if after_spans:
                html_parts.append(
                    '        <div class="emphasis-after">\n' +
                    '\n'.join(after_spans) + '\n        </div>'
                )
            spans_html = "\n".join(html_parts)
        else:
            spans = []
            for wi, word in enumerate(words):
                if style in ("style_doc", "style3", "style_retro", "style_sub", "style_bold"):
                    sc = ""
                elif is_emph:
                    sc = get_word_style_py(True, wi, n, kw_idx)
                else:
                    sc = word.get("style") or ""   # style-underline o vacío
                cls  = f"caption-word{' ' + sc if sc else ''}"
                if style in ("style2", "style_doc", "style3", "style_retro", "style_sub", "style_bold"):
                    raw = word["t"].lower()
                else:
                    raw  = word["t"].upper() if sc == "style-big" else word["t"].lower()
                text = re.sub(r'[.,]', '', raw)
                spans.append(f'        <span id="cw-{gi}-{wi}" class="{cls}">{text}</span>')
            spans_html = "\n".join(spans)
        lbl = "  <!-- ENFASIS -->" if is_emph else ""
        # Subtract 1 ms from duration to prevent floating-point overlap errors.
        # JS computes end = start + duration in IEEE-754, which can produce
        # 3.030 + 0.950 = 3.9800000000000004 → detected as overlap with next
        # clip starting at 3.980. The 1 ms gap is invisible to the viewer.
        dd_safe = round(max(0.05, dd - 0.001), 3)
        clip_parts.append(
            f'    <div id="cg-clip-{gi}"{lbl}\n'
            f'         data-start="{ds:.3f}" data-duration="{dd_safe:.3f}" data-track-index="5"\n'
            f'         style="position:absolute;left:0;top:0;width:100%;height:100%;'
            f'pointer-events:none;overflow:visible;">\n'
            f'      <div id="cg-{gi}" class="{group_cls}">\n'
            f'{spans_html}\n'
            f'      </div>\n'
            f'    </div>'
        )

    caption_clips_html = "\n".join(clip_parts)

    # ── Datos de animacion para JS ───────────────────────────────────────────
    anim_data = [
        {
            "gi":    gi,
            "ds":    group["display_start"],
            "dd":    group["display_dur"],
            "delay": group["delay"],
            "emph":  group.get("emphasis", False),
            "words": group["words"],
            "n":     len(group["words"]),
        }
        for gi, group in enumerate(groups)
        if not group.get("skip")
    ]
    anim_js = json.dumps(anim_data, ensure_ascii=False)

    # ── Colores dinámicos (deben calcularse antes de los bloques de estilo) ────
    ue_color = highlight_color.replace("#", "%23")
    glow_s1  = _GLOW_S1.get(highlight_color, _GLOW_S1["#FFE033"])
    glow_s2  = _GLOW_S2.get(highlight_color, _GLOW_S2["#FFE033"])
    ue_glow  = _underline_neon_filter(highlight_color)

    # ── Estilo-dependiente: CSS extra y bloque de animación ─────────────────
    if style == "style2":
        body_cls = ' class="s2"'
    elif style == "style_doc":
        body_cls = ' class="doc"'
    elif style == "style3":
        body_cls = ' class="s3"'
    elif style == "style_retro":
        body_cls = ' class="retro"'
    elif style == "style_cinematic":
        body_cls = ' class="cinematic"'
    elif style == "style_sub":
        body_cls = ' class="subdoc"'
    elif style == "style_bold":
        body_cls = ' class="boldstyle"'
    else:
        body_cls = ""

    if style == "style2":
        # Usamos body.s2 como prefijo → especificidad (0,2,0) > base (0,1,0)
        # Esto garantiza que estas reglas ganen SIN necesidad de !important
        extra_css = """
    /* ── STYLE 2 — prefijo .s2 para alta especificidad ─────────────────── */
    .s2 .caption-group.emphasis-group {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      gap: 0px 16px;
    }
    .s2 .caption-word {
      font-family: 'Outfit', sans-serif;
      font-weight: 400;
      font-style: italic;
      font-size: 58px;
      color: rgba(255,255,255,0.94);
      text-transform: none;
      letter-spacing: -0.2px;
      line-height: 1.2;
      -webkit-text-stroke: 0;
      paint-order: normal;
      text-shadow: 0 2px 10px rgba(0,0,0,0.90), 0 4px 24px rgba(0,0,0,0.65);
    }
    .s2 .caption-word.style-small {
      font-weight: 400;
      font-style: italic;
      font-size: 58px;
      color: rgba(255,255,255,0.94);
      -webkit-text-stroke: 0;
      text-shadow: 0 2px 10px rgba(0,0,0,0.90), 0 4px 24px rgba(0,0,0,0.65);
    }
    .s2 .caption-word.style-big {
      font-weight: 400;
      font-style: italic;
      font-size: 58px;
      color: """ + highlight_color + """;
      text-transform: none;
      letter-spacing: -0.2px;
      -webkit-text-stroke: 0;
      paint-order: normal;
      text-shadow: """ + glow_s2 + """;
    }
    .s2 .caption-word.style-underline {
      color: rgba(255,255,255,0.94);   /* blanco puro — sin tinte amarillo */
      text-shadow: 0 2px 10px rgba(0,0,0,0.90), 0 4px 24px rgba(0,0,0,0.65);
    }
    /* s2: subrayado neón habilitado (hereda ::after del base, no se oculta) */"""
        anim_code = """ANIM.forEach(function(g) {
      var gi = g.gi;
      var gs = '#cg-' + gi;
      var ds = g.ds;
      var dd = g.dd;
      tl.from(gs, { opacity: 0, y: 6, duration: 0.18, ease: 'power2.out' }, ds);
      tl.to(gs,   { opacity: 0,       duration: 0.14, ease: 'power1.in'  }, ds + dd - 0.14);
    });"""
    elif style == "style3":
        extra_css = """
    /* ── STYLE 3 — subtítulo blanco limpio sin énfasis ──────────────────── */
    .s3 .caption-group {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      gap: 0px 14px;
    }
    .s3 .caption-word {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-style: normal;
      font-size: 62px;
      color: #ffffff;
      text-transform: lowercase;
      letter-spacing: -0.5px;
      line-height: 1.2;
      -webkit-text-stroke: 0;
      paint-order: normal;
      text-shadow:
        0 2px 8px rgba(0,0,0,0.99),
        0 4px 24px rgba(0,0,0,0.80),
        0 8px 40px rgba(0,0,0,0.55);
    }
    .s3 .caption-word.style-big,
    .s3 .caption-word.style-small,
    .s3 .caption-word.style-underline {
      color: #ffffff;
      text-shadow:
        0 2px 8px rgba(0,0,0,0.99),
        0 4px 24px rgba(0,0,0,0.80);
    }"""
        anim_code = """ANIM.forEach(function(g) {
      var gi = g.gi;
      var gs = '#cg-' + gi;
      var ds = g.ds;
      var dd = g.dd;
      tl.from(gs, { opacity: 0, y: 6, duration: 0.18, ease: 'power2.out' }, ds);
      tl.to(gs,   { opacity: 0,       duration: 0.14, ease: 'power1.in'  }, ds + dd - 0.14);
    });"""
    elif style == "style_retro":
        extra_css = """
    /* ── STYLE RETRO — fansub anime español 90s/2000s ─────────────────────── */
    /* Times New Roman Bold Italic · amarillo degradado · contorno azul marino */
    .retro .caption-group {
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: center;
      gap: 0px 8px;
      white-space: nowrap;
      transform: scaleX(1.05) scaleY(0.94);
      filter:
        drop-shadow(2px 3px 5px rgba(0,0,0,0.45))
        drop-shadow(0   0   3px rgba(255,210,26,0.15));
    }
    .retro .caption-word {
      font-family: 'Times New Roman', Times, 'Georgia', serif;
      font-weight: bold;
      font-style: italic;
      font-size: 52px;
      letter-spacing: -0.5px;
      line-height: 1.2;
      white-space: nowrap;
      display: inline-block;
      /* Degradado vertical vintage */
      background: linear-gradient(to bottom, #FFE46B 0%, #FFD21A 48%, #E6B800 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      /* Contorno azul marino (fansub esencial) + borde exterior oscuro */
      text-shadow:
        -3px -3px 0 #1E2D73,  3px -3px 0 #1E2D73,
        -3px  3px 0 #1E2D73,  3px  3px 0 #1E2D73,
        -3px  0   0 #1E2D73,  3px  0   0 #1E2D73,
         0   -3px 0 #1E2D73,  0    3px 0 #1E2D73,
        -2px -2px 0 #1E2D73,  2px -2px 0 #1E2D73,
        -2px  2px 0 #1E2D73,  2px  2px 0 #1E2D73,
        -4px -4px 1px #0F1638, 4px -4px 1px #0F1638,
        -4px  4px 1px #0F1638, 4px  4px 1px #0F1638,
         0    0   8px rgba(255,210,26,0.20);
    }"""
        anim_code = """ANIM.forEach(function(g) {
      var gi = g.gi;
      var gs = '#cg-' + gi;
      var ds = g.ds;
      var dd = g.dd;
      tl.from(gs, { opacity: 0, duration: 0.18, ease: 'power1.out' }, ds);
      tl.to(gs,   { opacity: 0, duration: 0.14, ease: 'power1.in'  }, ds + dd - 0.14);
    });"""
    elif style == "style_doc":
        extra_css = """
    /* ── STYLE DOC — subtítulo documental elegante, Raleway ─────────────── */
    .doc .caption-group {
      opacity: 0;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: center;
      gap: 0px 14px;
      overflow: hidden;
    }
    .doc .caption-word {
      font-family: 'Raleway', 'Helvetica Neue', Arial, sans-serif;
      font-weight: 300;
      font-style: normal;
      font-size: 26px;
      color: #ffffff;
      text-transform: none;
      letter-spacing: 2.5px;
      line-height: 1.40;
      -webkit-text-stroke: 0;
      paint-order: normal;
      text-shadow:
        2px  2px 0 rgba(0,0,0,0.98),
        -2px -2px 0 rgba(0,0,0,0.98),
        2px -2px 0 rgba(0,0,0,0.98),
        -2px  2px 0 rgba(0,0,0,0.98),
        0    3px 0 rgba(0,0,0,0.98),
        0   -3px 0 rgba(0,0,0,0.98),
        3px  0   0 rgba(0,0,0,0.98),
        -3px  0   0 rgba(0,0,0,0.98),
        0    0  12px rgba(0,0,0,0.70);
    }"""
        anim_code = """ANIM.forEach(function(g) {
      var gi = g.gi;
      var gs = '#cg-' + gi;
      var ds = g.ds;
      var dd = g.dd;
      tl.to(gs, { opacity: 1, duration: 0.20, ease: 'power1.out' }, ds);
      tl.to(gs, { opacity: 0, duration: 0.15, ease: 'power1.in'  }, ds + dd - 0.15);
    });"""
    elif style == "style_cinematic":
        extra_css = """
    /* ── STYLE CINEMATIC — texto dorado sobre barra negra, estilo cine ────── */
    .cinematic .caption-group {
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: center;
      gap: 0 14px;
      background: rgba(0,0,0,0.92);
      padding: 18px 80px;
      left: 0 !important;
      right: 0 !important;
      overflow: hidden;
    }
    .cinematic .caption-word {
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      font-weight: 400;
      font-style: normal;
      font-size: 46px;
      color: #F5C518;
      text-transform: none;
      letter-spacing: 0.8px;
      line-height: 1.25;
      text-shadow: none;
    }"""
        anim_code = """ANIM.forEach(function(g) {
      var gs = '#cg-' + g.gi;
      var ds = g.ds;
      var dd = g.dd;
      tl.from(gs, { opacity: 0, duration: 0.22, ease: 'power1.out' }, ds);
      tl.to(gs,   { opacity: 0, duration: 0.15, ease: 'power1.in'  }, ds + dd - 0.15);
    });"""
    elif style == "style_sub":
        extra_css = """
    /* ── STYLE SUB — subtítulo limpio estilo Netflix / documental ────────── */
    .subdoc .caption-group {
      opacity: 0;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: center;
      gap: 0 12px;
      background: rgba(0,0,0,0.72);
      padding: 14px 60px;
      left: 0 !important;
      right: 0 !important;
      overflow: hidden;
    }
    .subdoc .caption-word {
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      font-weight: 400;
      font-style: normal;
      font-size: 22px;
      color: #ffffff;
      text-transform: none;
      letter-spacing: 0.3px;
      line-height: 1.25;
      text-shadow: none;
    }"""
        anim_code = """ANIM.forEach(function(g) {
      var gs = '#cg-' + g.gi;
      var ds = g.ds;
      var dd = g.dd;
      tl.to(gs, { opacity: 1, duration: 0.20, ease: 'power1.out' }, ds);
      tl.to(gs, { opacity: 0, duration: 0.15, ease: 'power1.in'  }, ds + dd - 0.15);
    });"""
    elif style == "style_bold":
        extra_css = """
    /* ── STYLE BOLD — subtítulo bold blanco, contundente ────────────────── */
    .boldstyle .caption-group {
      opacity: 0;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: center;
      gap: 0 10px;
      overflow: hidden;
    }
    .boldstyle .caption-word {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-style: normal;
      font-size: 29px;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      line-height: 1.15;
      text-shadow:
        -3px -3px 0 rgba(0,0,0,0.95),
         3px -3px 0 rgba(0,0,0,0.95),
        -3px  3px 0 rgba(0,0,0,0.95),
         3px  3px 0 rgba(0,0,0,0.95),
         0    3px 12px rgba(0,0,0,0.99),
         0    6px 28px rgba(0,0,0,0.80);
    }"""
        anim_code = """ANIM.forEach(function(g) {
      var gs = '#cg-' + g.gi;
      var ds = g.ds;
      var dd = g.dd;
      tl.to(gs, { opacity: 1, duration: 0.18, ease: 'power2.out' }, ds);
      tl.to(gs, { opacity: 0, duration: 0.14, ease: 'power1.in'  }, ds + dd - 0.14);
    });"""
    else:
        extra_css = ""
        _zoom_code = """
        var zoomIn  = Math.max(0, ds - 0.6);
        var zoomOut = ds + dd + 0.3;
        tl.to('#vid', { scale: 1.06, duration: 0.6, ease: 'power1.inOut',
                         transformOrigin: '50% 15%' }, zoomIn);
        tl.to('#vid', { scale: 1.0,  duration: 0.55, ease: 'power1.inOut' }, zoomOut);""" if enable_zoom else ""

        # ── Animation variants for caption_anim ──────────────────────────────
        if caption_anim == "slide":
            anim_code = f"""ANIM.forEach(function(g) {{
      var gs = '#cg-' + g.gi; var ds = g.ds; var dd = g.dd;
      tl.from(gs, {{ opacity: 0, x: -40, duration: 0.20, ease: 'power2.out' }}, ds);
      tl.to(gs,   {{ opacity: 0, x: 40,  duration: 0.15, ease: 'power2.in'  }}, ds + dd - 0.15);{_zoom_code and ""}
    }});"""
        elif caption_anim == "scale":
            anim_code = f"""ANIM.forEach(function(g) {{
      var gs = '#cg-' + g.gi; var ds = g.ds; var dd = g.dd;
      tl.from(gs, {{ opacity: 0, scale: 0.6, transformOrigin: 'center bottom',
                     duration: 0.22, ease: 'back.out(1.6)' }}, ds);
      tl.to(gs,   {{ opacity: 0, scale: 0.8, duration: 0.14, ease: 'power1.in' }}, ds + dd - 0.14);{_zoom_code and ""}
    }});"""
        elif caption_anim == "bounce":
            anim_code = f"""ANIM.forEach(function(g) {{
      var gs = '#cg-' + g.gi; var ds = g.ds; var dd = g.dd;
      tl.from(gs, {{ opacity: 0, y: 30, duration: 0.28, ease: 'elastic.out(1,0.5)' }}, ds);
      tl.to(gs,   {{ opacity: 0,        duration: 0.14, ease: 'power1.in'           }}, ds + dd - 0.14);{_zoom_code and ""}
    }});"""
        else:  # default
            anim_code = f"""ANIM.forEach(function(g) {{
      var gi = g.gi;
      var gs = '#cg-' + gi;
      var ds = g.ds;
      var dd = g.dd;
      var n  = g.n;

      if (g.emph) {{
        if (n >= 1) tl.from('#cw-' + gi + '-0',
          {{ opacity: 0, y: -28, duration: 0.18, ease: 'power3.out' }}, ds);
        if (n >= 2) tl.from('#cw-' + gi + '-1',
          {{ opacity: 0, scaleY: 0.3, scaleX: 0.7, transformOrigin: 'center top',
             duration: 0.22, ease: 'back.out(1.4)' }}, ds + 0.1);
        if (n >= 3) tl.from('#cw-' + gi + '-2',
          {{ opacity: 0, y: 28, duration: 0.18, ease: 'power3.out' }}, ds + 0.2);
        tl.to(gs, {{ opacity: 0, y: -12, duration: 0.18, ease: 'power2.in' }}, ds + dd - 0.18);{_zoom_code}
      }} else {{
        tl.from(gs, {{ opacity: 0, y: 8, duration: 0.15, ease: 'power2.out' }}, ds);
        tl.to(gs,   {{ opacity: 0,       duration: 0.12, ease: 'power1.in' }}, ds + dd - 0.12);
      }}
    }});"""

    vid_w = 1920 if orientation == "horizontal" else 1080
    vid_h = 1080 if orientation == "horizontal" else 1920
    _pos_px = max(0, int(caption_pos / 100 * vid_h))
    caption_pos_css = f"bottom: {_pos_px}px; top: auto;"
    # Override injected after all style-specific CSS so it always wins
    # (#root has id specificity → beats any class-only rule, even with !important)
    pos_override_css = f"""
    /* ── User position override (applied last, highest specificity) ── */
    #root .caption-group {{
      bottom: {_pos_px}px !important;
      top: auto !important;
    }}"""

    # ── nowrap enforcement for horizontal (always 1 line) ──────────────────────
    if orientation == "horizontal":
        pos_override_css += """
    /* ── Horizontal: siempre 1 línea ── */
    #root .caption-group {
      flex-wrap: nowrap !important;
      overflow: hidden !important;
    }"""

    # ── Text case override ───────────────────────────────────────────────────────
    if caption_case == "upper":
        pos_override_css += """
    /* ── Case: mayúsculas ── */
    #root .caption-word { text-transform: uppercase !important; }"""
    elif caption_case == "normal":
        pos_override_css += """
    /* ── Case: original ── */
    #root .caption-word { text-transform: none !important; }"""
    # "lower" → se mantiene el text-transform: lowercase del CSS base

    # ── Font-size override (caption_size 70-130 = % del default) ────────────────
    if caption_size != 100:
        _f = caption_size / 100.0
        _sz_normal = max(28, round(56 * _f))
        _sz_small  = max(32, round(66 * _f))
        _sz_big    = max(52, round(124 * _f))
        pos_override_css += f"""
    /* ── Size override ── */
    #root .caption-word {{ font-size: {_sz_normal}px !important; }}
    #root .caption-word.style-small {{ font-size: {_sz_small}px !important; }}
    #root .caption-word.style-big {{ font-size: {_sz_big}px !important; }}"""

    # ── Stroke override (horizontal only, opt-in) ──────────────────────────────
    if caption_stroke and orientation == "horizontal":
        pos_override_css += """
    /* ── Stroke horizontal ── */
    #root .caption-word {
      -webkit-text-stroke: 2px rgba(0,0,0,0.90) !important;
      paint-order: stroke fill !important;
    }"""

    # Font override — only for non-specialised styles (retro/doc/cinematic/sub use fixed fonts)
    _font_family, _font_weight = _FONT_CSS_MAP.get(caption_font, _FONT_CSS_MAP["outfit"])
    _is_generic_style = style not in ("style_retro", "style_doc", "style_cinematic", "style_sub")
    font_override_css = f"""
    /* ── Font override ── */
    #root .caption-word {{
      font-family: {_font_family} !important;
      font-weight: {_font_weight} !important;
    }}""" if _is_generic_style and caption_font != "outfit" else ""

    # GSAP local embebido — sin esto, gsap no carga en el render headless y los captions se superponen.
    gsap_inline = _load_gsap_inline()

    return f"""<!doctype html>
<html lang="{lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width={vid_w}, height={vid_h}" />
  <!-- Fonts: load async, never block render if CDN is unreachable -->
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Dancing+Script:wght@700&family=Raleway:wght@300;400&family=Playfair+Display:ital,wght@1,700;1,800;1,900&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  <!-- GSAP embebido LOCAL (offline): garantiza que gsap.timeline() existe en el render
       headless aunque no haya red. Sin esto, los captions se superponen. -->
  {gsap_inline}
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    html, body {{
      width: {vid_w}px; height: {vid_h}px;
      overflow: hidden; background: #0a0a0a;
    }}

    /* ── Grupos normales: fila horizontal centrada ── */
    .caption-group {{
      position: absolute;
      left: 60px; right: 60px;
      {caption_pos_css}
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px 16px;
    }}

    /* ── Grupos énfasis: columna centrada —
          palabra BIG al nivel del caption (pie del contenedor),
          small-words arriba y abajo en bloques absolutos ── */
    .caption-group.emphasis-group {{
      flex-direction: column;
      align-items: center;
      z-index: 10;
    }}
    .emphasis-before {{
      position: absolute;
      bottom: 100%;
      left: 0; right: 0;
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 0px 16px;
      padding-bottom: 6px;
    }}
    .emphasis-after {{
      position: absolute;
      top: 100%;
      left: 0; right: 0;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      gap: 0px 16px;
      padding-top: 6px;
    }}

    /* ── NORMAL: Outfit Bold — contorno via text-shadow (no text-stroke, evita artefactos) ── */
    .caption-word {{
      display: inline-block;
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 56px;
      color: #ffffff;
      text-transform: lowercase;
      letter-spacing: -0.5px;
      line-height: 1.15;
      text-shadow:
        -2px -2px 0 rgba(0,0,0,0.45),
         2px -2px 0 rgba(0,0,0,0.45),
        -2px  2px 0 rgba(0,0,0,0.45),
         2px  2px 0 rgba(0,0,0,0.45),
        0 2px 8px rgba(0,0,0,0.99),
        0 4px 24px rgba(0,0,0,0.80),
        0 8px 40px rgba(0,0,0,0.50);
    }}

    /* ── SMALL: italica fina ── */
    .caption-word.style-small {{
      font-family: 'Outfit', sans-serif;
      font-weight: 300;
      font-style: italic;
      font-size: 66px;
      color: rgba(255,255,255,0.92);
      text-transform: lowercase;
      letter-spacing: 0.5px;
      line-height: 1.2;
      text-shadow:
        -2px -2px 0 rgba(0,0,0,0.50),
         2px -2px 0 rgba(0,0,0,0.50),
        -2px  2px 0 rgba(0,0,0,0.50),
         2px  2px 0 rgba(0,0,0,0.50),
        0 2px 8px rgba(0,0,0,0.95),
        0 4px 20px rgba(0,0,0,0.75);
    }}

    /* ── BIG: enorme, bold, contorno via text-shadow (no text-stroke, evita artefactos) ── */
    .caption-word.style-big {{
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-style: normal;
      font-size: 124px;
      color: {highlight_color};
      text-transform: uppercase;
      letter-spacing: -4px;
      line-height: 1.0;
      text-shadow:
        -4px -4px 0 rgba(0,0,0,0.65),
         4px -4px 0 rgba(0,0,0,0.65),
        -4px  4px 0 rgba(0,0,0,0.65),
         4px  4px 0 rgba(0,0,0,0.65),
        {glow_s1},
        0 4px 12px rgba(0,0,0,0.99),
        0 8px 32px rgba(0,0,0,0.85);
    }}

    /* ── UNDERLINE: subrayado neón mismo color que el resaltado ── */
    .caption-word.style-underline {{
      position: relative;
      color: #ffffff;        /* palabra SIEMPRE blanca — sin tinte de color */
    }}
    .caption-word.style-underline::after {{
      content: '';
      position: absolute;
      bottom: -10px;
      left: -6px;
      right: -6px;
      height: 15px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 14' preserveAspectRatio='none'%3E%3Cpath d='M1,8 C12,5 22,11 38,7 C54,3 66,10 82,6 C98,2 112,10 128,6 C144,2 158,9 172,5 C183,4 193,8 199,6' stroke='{ue_color}' stroke-width='5.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M3,11 C18,9 35,12 55,10 C75,8 95,12 115,9 C135,7 155,11 175,9 C185,8 194,10 198,9' stroke='{ue_color}' stroke-width='2.2' fill='none' stroke-linecap='round' opacity='0.6' stroke-dasharray='9,5,14,3,8,6'/%3E%3Cpath d='M6,6 C35,5 65,7 95,5 C125,3 155,6 185,5' stroke='{ue_color}' stroke-width='1.2' fill='none' stroke-linecap='round' opacity='0.25'/%3E%3C%2Fsvg%3E");
      background-size: 100% 100%;
      background-repeat: no-repeat;
      pointer-events: none;
      filter: {ue_glow};
    }}

    /* ── GLOW: cursiva naranja neon (Dancing Script) ── */
    .caption-word.style-glow {{
      font-family: 'Dancing Script', cursive;
      font-weight: 700;
      font-size: 100px;
      color: #FF9500;
      text-transform: none;
      letter-spacing: 0px;
      line-height: 1.1;
      text-shadow:
        0 0 12px rgba(255,149,0,1),
        0 0 28px rgba(255,120,0,0.9),
        0 0 55px rgba(255,100,0,0.65),
        0 0 80px rgba(255,80,0,0.35),
        0 3px 6px rgba(0,0,0,0.9);
    }}
  {extra_css}
  {pos_override_css}
  {font_override_css}
  </style>
</head>
<body{body_cls}>
  <div id="root" data-composition-id="main" data-start="0"
       data-duration="{duration:.3f}" data-width="{vid_w}" data-height="{vid_h}">
    <video id="vid" src="{video_filename}" muted playsinline
      data-start="0" data-duration="{duration:.3f}" data-track-index="0"
      style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"></video>
    <audio id="aud" src="{video_filename}"
      data-start="0" data-duration="{duration:.3f}" data-track-index="2" data-volume="1"></audio>

{caption_clips_html}

  </div>

  <script>
    window.__timelines = window.__timelines || {{}};
    var tl = gsap.timeline({{ paused: true }});

    // ANIM: datos pre-calculados en Python (display_start/display_dur = data-start/data-duration
    // del wrapper). GSAP solo gestiona animacion; HyperFrames gestiona visibilidad.
    var ANIM = {anim_js};

    {anim_code}

    tl.seek(0);
    window.__timelines['main'] = tl;
  </script>
</body>
</html>
"""


def transcript_to_groups_plain(words, max_words=3):
    """Version sin enfasis (fallback)."""
    return transcript_to_groups(words, set(), set(), max_words)


def get_video_duration(video_path: Path) -> float:
    try:
        result = subprocess.run(
            f'"{FFPROBE_EXE}" -v quiet -print_format json -show_format "{video_path}"',
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, shell=True
        )
        data = json.loads(result.stdout.decode("utf-8", errors="ignore"))
        return float(data["format"]["duration"])
    except Exception:
        return 0.0


def _emit(progress_q, msg: str):
    """Emite progreso al queue (si existe) y al log."""
    log.info(msg)
    if progress_q is not None:
        progress_q.put(msg)


def _render_html_to_video(project_dir: Path, output_file: Path, progress_q=None) -> bool:
    """Runs the hyperframes render step. project_dir must contain index.html.
    Returns True on success, False on failure (after emitting ERROR to queue)."""
    render_log = project_dir / "render.log"

    npx_cmd = os.environ.get("NPX_CMD", "")
    base_dir = Path(__file__).parent

    if npx_cmd and Path(npx_cmd).exists():
        node_dir = Path(npx_cmd).parent
    else:
        node_dir = base_dir / "resources" / "tools" / "node"

    node_exe = node_dir / "node.exe"
    if not node_exe.exists():
        node_exe = Path("node")

    hf_cli = node_dir / "node_modules" / "hyperframes" / "dist" / "cli.js"
    if not hf_cli.exists():
        hf_cli = base_dir / "resources" / "tools" / "node" / "node_modules" / "hyperframes" / "dist" / "cli.js"

    sub_env = os.environ.copy()

    # Asegurar que PUPPETEER_CACHE_DIR está en el entorno del render
    # Electron lo pasa vía APP_WORKSPACE; si no, derivarlo del workspace
    if "PUPPETEER_CACHE_DIR" not in sub_env:
        workspace = os.environ.get("APP_WORKSPACE", "")
        if workspace:
            import pathlib as _pl
            # userData está un nivel arriba del workspace
            user_data = str(_pl.Path(workspace).parent)
            sub_env["PUPPETEER_CACHE_DIR"] = str(_pl.Path(user_data) / "puppeteer-cache")

    # Buscar Chrome Headless Shell instalado por doctor en el cache de Puppeteer
    if "HYPERFRAMES_BROWSER_PATH" not in sub_env or not Path(sub_env.get("HYPERFRAMES_BROWSER_PATH", "")).exists():
        pup_cache = sub_env.get("PUPPETEER_CACHE_DIR", "")
        if pup_cache:
            import glob as _glob
            shells = _glob.glob(str(Path(pup_cache) / "chrome-headless-shell" / "**" / "chrome-headless-shell.exe"), recursive=True)
            if shells:
                sub_env["HYPERFRAMES_BROWSER_PATH"] = shells[0]
                log.info(f"  Browser: Chrome Headless Shell @ {shells[0]}")

    def _locate_ffmpeg() -> str:
        import shutil as _shutil
        fe = os.environ.get("FFMPEG_EXE", "").strip()
        if fe and Path(fe).is_file():
            return fe
        bundled = Path(__file__).parent / "resources" / "tools" / "ffmpeg.exe"
        if bundled.is_file():
            return str(bundled)
        found = _shutil.which("ffmpeg")
        if found:
            return found
        try:
            r = subprocess.run("where ffmpeg", shell=True, capture_output=True, text=True, timeout=5)
            if r.returncode == 0:
                first = r.stdout.strip().splitlines()[0].strip()
                if first and Path(first).is_file():
                    return first
        except Exception:
            pass
        return ""

    ffmpeg_exe = _locate_ffmpeg()
    if ffmpeg_exe:
        ffmpeg_dir = str(Path(ffmpeg_exe).parent)
        existing_path = sub_env.get("PATH") or sub_env.get("Path") or sub_env.get("path") or ""
        if ffmpeg_dir.lower() not in existing_path.lower():
            sub_env["PATH"] = ffmpeg_dir + os.pathsep + existing_path
        sub_env["FFMPEG_PATH"]  = ffmpeg_exe
        sub_env["FFPROBE_PATH"] = os.environ.get("FFPROBE_EXE",
                                                  str(Path(ffmpeg_exe).parent / "ffprobe.exe"))

    if not hf_cli.exists():
        err = f"hyperframes CLI no encontrado en: {hf_cli}"
        log.error(f"  {err}")
        if progress_q is not None:
            progress_q.put(f"ERROR:{err}")
        return False

    cmd_list = [str(node_exe), str(hf_cli), "render", "--output", str(output_file)]
    log.info(f"  Render CMD: {cmd_list}")
    log.info(f"  Render CWD: {project_dir}")

    with open(render_log, "w", encoding="utf-8") as _lf:
        _lf.write(f"[v2] cmd={cmd_list}\n")
        _lf.write(f"[v2] cwd={project_dir}\n")
        _lf.write(f"[v2] node_exists={node_exe.exists()}, hf_exists={hf_cli.exists()}\n")
        _lf.write(f"[v2] ffmpeg_exe={ffmpeg_exe}\n")
        _lf.write(f"[v2] PATH_start={sub_env.get('PATH','')[:200]}\n\n")

    result_code = -1
    proc = None
    try:
        with open(render_log, "a", encoding="utf-8") as logf:
            proc = subprocess.Popen(
                cmd_list,
                cwd=str(project_dir),
                stdout=logf,
                stderr=logf,
                stdin=subprocess.DEVNULL,
                shell=False,
                env=sub_env,
            )

        _frame_re = re.compile(r'Capturing frame (\d+)/(\d+)')

        def _monitor():
            pos = 0
            while proc.poll() is None:
                try:
                    with open(render_log, "r", encoding="utf-8", errors="replace") as _f:
                        _f.seek(pos)
                        chunk = _f.read()
                        pos = _f.tell()
                    for ln in chunk.splitlines():
                        m = _frame_re.search(ln)
                        if m:
                            cur, tot = int(m.group(1)), int(m.group(2))
                            pct = 92 + round(cur / max(tot, 1) * 6)
                            _emit(progress_q, f"RENDER_PCT:{pct}")
                        elif "Encoding video" in ln or "Assembling" in ln:
                            _emit(progress_q, "RENDER_PCT:99")
                except Exception:
                    pass
                time.sleep(0.5)

        monitor = threading.Thread(target=_monitor, daemon=True)
        monitor.start()

        proc.wait(timeout=900)
        result_code = proc.returncode
        monitor.join(timeout=3)

    except subprocess.TimeoutExpired:
        if proc:
            proc.kill()
        result_code = -1
        with open(render_log, "a", encoding="utf-8") as _lf:
            _lf.write("\n[ERROR] Timeout: el render tardó más de 15 minutos\n")
    except Exception as exc:
        result_code = -1
        with open(render_log, "a", encoding="utf-8") as _lf:
            _lf.write(f"\n[ERROR] Excepción: {exc}\n")

    if result_code != 0:
        # Buscar línea de error relevante en el log (ignorar líneas de progreso y no-blocking)
        err_detail = f"código {result_code}"
        try:
            lines = render_log.read_text(encoding="utf-8", errors="replace").splitlines()
            for ln in reversed(lines):
                ln_clean = ln.strip()
                # Ignorar líneas de progreso y avisos no bloqueantes
                if not ln_clean:
                    continue
                if "non-blocking" in ln_clean or "Capturing frame" in ln_clean:
                    continue
                if ln_clean.startswith("[") or "%" in ln_clean:
                    continue
                err_detail = ln_clean[:120]  # máx 120 chars
                break
        except Exception:
            pass
        log.error(f"  Render falló (código {result_code}). Ver: {render_log}")
        if progress_q is not None:
            progress_q.put(f"ERROR:Render falló [#{result_code}] — {err_detail}")
        return False

    return True


def _srt_timestamp(seconds: float) -> str:
    """Convierte segundos a timestamp SRT: HH:MM:SS,mmm"""
    if seconds < 0:
        seconds = 0
    ms = int(round(seconds * 1000))
    h = ms // 3_600_000
    ms -= h * 3_600_000
    m = ms // 60_000
    ms -= m * 60_000
    s = ms // 1000
    ms -= s * 1000
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def transcribe_to_files(video_path: Path, language: str, model: str, progress_q=None) -> dict:
    """
    Transcribe un audio/vídeo con Whisper y genera ficheros SRT + TXT.
    NO renderiza vídeo ni captions — solo extrae el texto.

    Devuelve:
      {"srt": Path, "txt": Path, "preview": str, "segments": int, "duration": float}
    """
    name = video_path.stem
    _emit(progress_q, f">> Transcribiendo: {video_path.name}")

    project_dir = PROJECTS_DIR / name
    project_dir.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Cargar modelo
    _emit(progress_q, "TSTEP:1:Cargando modelo Whisper...")
    try:
        from faster_whisper import WhisperModel
        whisper_model = WhisperModel(model, device="cpu", compute_type="int8")
    except Exception as e:
        _emit(progress_q, f"ERROR:No se pudo cargar Whisper: {e}")
        raise

    # 2. Transcribir
    _emit(progress_q, "TSTEP:2:Transcribiendo audio...")
    try:
        segments, audio_info = whisper_model.transcribe(
            str(video_path),
            language=language,
            word_timestamps=False,
            vad_filter=True,
            condition_on_previous_text=False,
            beam_size=5,
        )
        duration = round(float(audio_info.duration), 3)
    except Exception as e:
        _emit(progress_q, f"ERROR:Error en transcripción: {e}")
        raise

    # 3. Iterar el generador — aquí ocurre la transcripción real (faster-whisper es lazy)
    srt_lines = []
    txt_parts = []
    idx = 0
    for seg in segments:
        text = (seg.text or "").strip()
        if not text:
            continue
        idx += 1
        srt_lines.append(str(idx))
        srt_lines.append(f"{_srt_timestamp(seg.start)} --> {_srt_timestamp(seg.end)}")
        srt_lines.append(text)
        srt_lines.append("")          # línea en blanco separadora
        txt_parts.append(text)

    if idx == 0:
        _emit(progress_q, "ERROR:No se detectó voz en el archivo")
        raise ValueError("Transcripción vacía")

    # 4. Escribir ficheros (rápido — la transcripción ya terminó)
    _emit(progress_q, "TSTEP:3:Generando ficheros...")
    srt_content = "\n".join(srt_lines).strip() + "\n"
    txt_content = " ".join(txt_parts).strip() + "\n"

    srt_path = OUTPUT_DIR / f"{name}.srt"
    txt_path = OUTPUT_DIR / f"{name}.txt"
    srt_path.write_text(srt_content, encoding="utf-8")
    txt_path.write_text(txt_content, encoding="utf-8")

    # Preview: primeros ~600 caracteres del texto plano
    preview = txt_content.strip()
    if len(preview) > 1200:
        preview = preview[:1200].rsplit(" ", 1)[0] + " …"

    _emit(progress_q, f"TDONE:{idx}")
    log.info(f"  Transcripción: {idx} segmentos, {duration}s → {srt_path.name}, {txt_path.name}")

    return {
        "srt": srt_path,
        "txt": txt_path,
        "preview": preview,
        "full_text": txt_content.strip(),
        "segments": idx,
        "duration": duration,
    }


def process_video(video_path: Path, language: str, model: str, progress_q=None,
                  caption_style: str = "style1", orientation: str = "vertical",
                  highlight_color: str = "#FFE033", enable_zoom: bool = True,
                  caption_pos: int = 15, caption_font: str = "outfit",
                  caption_anim: str = "default", reuse_captions: bool = False,
                  caption_case: str = "lower", caption_size: int = 100,
                  caption_stroke: bool = False):
    name = video_path.stem
    _emit(progress_q, f">> Procesando: {video_path.name}")

    project_dir = PROJECTS_DIR / name
    project_dir.mkdir(parents=True, exist_ok=True)

    dest_video = project_dir / video_path.name
    if not dest_video.exists():
        shutil.copy2(video_path, dest_video)
    else:
        shutil.copy2(video_path, dest_video)  # always refresh source
    _emit(progress_q, "STEP:1:Video recibido")

    # ── Re-render mode: skip transcription, use existing captions.json ──────────
    if reuse_captions:
        import json as _json_rr
        caps_file = project_dir / "captions.json"
        if not caps_file.exists():
            _emit(progress_q, "ERROR:captions.json no encontrado para re-render")
            return
        with open(caps_file, encoding="utf-8") as _cf:
            caps_data = _json_rr.load(_cf)
        if not caps_data:
            _emit(progress_q, "ERROR:captions.json vacío")
            return
        duration = get_video_duration(dest_video)
        if duration == 0.0:
            _emit(progress_q, "ERROR:No se pudo obtener duración del video")
            return
        # Reconstruct minimal groups from captions.json (no re-transcription)
        # IMPORTANT: always use cap["text"] for displayed text (respects user edits),
        # and use words[] only for timing data.
        groups = []
        for cap in caps_data:
            edited_text = cap.get("text", "").strip()
            if not edited_text:
                continue
            txt_words = edited_text.split()
            words_raw = cap.get("words", [])
            if words_raw and len(words_raw) == len(txt_words):
                # Same word count: use edited text + original per-word timing + restore styles
                gw = [{"t": txt_words[i], "s": words_raw[i]["start"],
                       "e": words_raw[i]["end"],
                       "style": words_raw[i].get("style")}
                      for i in range(len(txt_words))]
            else:
                # Different word count (edited) or no word data: distribute timing evenly
                n = max(1, len(txt_words))
                dp = (cap["end"] - cap["start"]) / n
                gw = [{"t": w,
                       "s": round(cap["start"] + i * dp, 3),
                       "e": round(cap["start"] + (i + 1) * dp, 3),
                       "style": None}
                      for i, w in enumerate(txt_words)]
            if gw:
                # Use word-based raw end to avoid using inflated display_end
                # (captions.json stores display_end which for emphasis groups includes extra_s=0.5)
                group_end = round(min(gw[-1]["e"] + 0.05, duration - 0.05), 3)
                groups.append({
                    "words": gw,
                    "end": group_end,
                    # Restore emphasis metadata so BIG/SMALL word styling is preserved
                    "emphasis":       cap.get("emphasis", False),
                    "key_word_index": cap.get("key_word_index"),
                })

        # Clip group ends to prevent display overlap with the next group's start
        for _i in range(len(groups) - 1):
            _next_start = groups[_i + 1]["words"][0]["s"]
            if groups[_i]["end"] > _next_start:
                groups[_i]["end"] = round(_next_start, 3)
        if not groups:
            _emit(progress_q, "ERROR:No hay grupos para re-renderizar")
            return
        _emit(progress_q, "STEP:4:Regenerando captions...")
        html = build_html(video_path.name, duration, groups, lang=language,
                          style=caption_style, orientation=orientation,
                          highlight_color=highlight_color, enable_zoom=enable_zoom,
                          caption_pos=caption_pos, caption_font=caption_font,
                          caption_anim=caption_anim,
                          caption_case=caption_case, caption_size=caption_size,
                          caption_stroke=caption_stroke)
        html_path = project_dir / "index.html"
        with open(html_path, "w", encoding="utf-8") as _hf:
            _hf.write(html)
        _emit(progress_q, "STEP:5:Re-renderizando video...")
        output_file = OUTPUT_DIR / f"{name}-captions.mp4"
        ok = _render_html_to_video(project_dir, output_file, progress_q)
        if ok:
            _emit(progress_q, f"DONE:{output_file.stat().st_size / 1024 / 1024:.1f}MB")
        return

    # 1. Transcribir
    _emit(progress_q, "STEP:2:Transcribiendo audio con Whisper...")
    transcript_path = project_dir / "transcript.json"
    try:
        from faster_whisper import WhisperModel
        _emit(progress_q, f"STEP:2:Cargando modelo Whisper '{model}'...")
        whisper_model = WhisperModel(model, device="cpu", compute_type="int8")
        _emit(progress_q, "STEP:2:Transcribiendo audio...")
        segments, audio_info = whisper_model.transcribe(  # audio_info.duration = duracion real
            str(dest_video),
            language=language,
            word_timestamps=True,
            vad_filter=False,
            condition_on_previous_text=False,
            no_speech_threshold=0.7,
            beam_size=5,
        )
        # audio_info.duration es la duracion real del audio medida por Whisper
        # Es la fuente mas fiable — ffprobe puede fallar en algunos sistemas
        whisper_duration = round(float(audio_info.duration), 3)

        words = []
        for segment in segments:
            if segment.words:
                for word in segment.words:
                    cleaned = word.word.strip()
                    if cleaned:
                        words.append({
                            "text": cleaned,
                            "start": round(word.start, 3),
                            "end": round(word.end, 3)
                        })
            else:
                # Fallback: segmento sin word timestamps (audio dificil)
                seg_text = segment.text.strip()
                seg_words = [w for w in seg_text.split() if w]
                if seg_words:
                    n = len(seg_words)
                    dur = (segment.end - segment.start) / n
                    for j, w in enumerate(seg_words):
                        words.append({
                            "text": w,
                            "start": round(segment.start + j * dur, 3),
                            "end": round(segment.start + (j + 1) * dur - 0.01, 3)
                        })

        with open(transcript_path, "w", encoding="utf-8") as f:
            json.dump(words, f, ensure_ascii=False, indent=2)
        log.info(f"  {len(words)} palabras transcritas (duracion audio: {whisper_duration}s)")
    except Exception as e:
        log.error(f"  Error en transcripcion: {e}")
        _emit(progress_q, f"ERROR:Error en transcripción Whisper: {e}")
        return

    if not words:
        log.error("  Transcript vacio, abortando.")
        _emit(progress_q, "ERROR:No se detectó audio en el vídeo (transcript vacío)")
        return

    # 2. Obtener duracion fiable ANTES de generar grupos (para clampar palabras)
    duration = get_video_duration(dest_video)
    if duration == 0.0 or abs(duration - whisper_duration) > 1.0:
        duration = whisper_duration
    log.info(f"  Duracion: {duration:.1f}s")

    # Clampar timestamps de palabras a la duracion real ANTES de generar grupos.
    # El fallback de Whisper puede generar palabras mas alla del fin del audio.
    words = [w for w in words if w["start"] < duration - 0.05]
    for w in words:
        w["end"] = min(w["end"], duration - 0.05)

    if not words:
        log.error("  Sin palabras validas tras clampar a duracion. Abortando.")
        return

    # 3. Identificar momentos clave con Groq
    _emit(progress_q, "STEP:3:Analizando palabras clave con IA...")
    top_words, secondary_words = identify_key_words(words)

    # 4. Generar grupos con estilos (ya con palabras clampadas)
    groups = transcript_to_groups(words, top_words, secondary_words,
                                   max_words=5 if orientation == "horizontal" else 3)
    emphasis_count  = sum(1 for g in groups if g.get("emphasis"))
    underline_count = sum(1 for g in groups for w in g["words"] if w.get("style") == "style-underline")
    log.info(f"  {len(groups)} grupos ({emphasis_count} BIG, {underline_count} palabras con subrayado)")

    # 5. Generar index.html
    _emit(progress_q, "STEP:4:Generando captions...")
    html = build_html(video_path.name, duration, groups, lang=language, style=caption_style,
                      orientation=orientation, highlight_color=highlight_color,
                      enable_zoom=enable_zoom, caption_pos=caption_pos,
                      caption_font=caption_font, caption_anim=caption_anim,
                      caption_case=caption_case, caption_size=caption_size,
                      caption_stroke=caption_stroke)
    html_path = project_dir / "index.html"
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    log.info(f"  index.html generado ({duration:.1f}s)")

    # Save captions.json for the post-render editor
    import json as _json_caps
    captions_data = []
    for gi, group in enumerate(groups):
        if group.get("skip"):
            continue
        ds   = group.get("display_start", 0)
        dd   = group.get("display_dur", 0)
        text = " ".join(w["t"] for w in group["words"])
        captions_data.append({
            "id":    gi,
            "start": ds,
            "end":   round(ds + dd, 3),
            "text":  text,
            "words": [
                {"word": w["t"], "start": w.get("s", 0), "end": w.get("e", 0),
                 "style": w.get("style")}
                for w in group["words"]
            ],
            # Preserve emphasis metadata so re-renders can restore BIG/SMALL styling
            "emphasis":       group.get("emphasis", False),
            "key_word_index": group.get("key_word_index"),
        })
    caps_path = project_dir / "captions.json"
    with open(caps_path, "w", encoding="utf-8") as f:
        _json_caps.dump(captions_data, f, ensure_ascii=False, indent=2)
    log.info(f"  captions.json guardado ({len(captions_data)} grupos)")

    # 5. Renderizar
    _emit(progress_q, "STEP:5:Renderizando video...")
    output_file = OUTPUT_DIR / f"{name}-captions.mp4"

    ok = _render_html_to_video(project_dir, output_file, progress_q)
    if ok:
        _emit(progress_q, f"DONE:{output_file.stat().st_size / 1024 / 1024:.1f}MB")


# ══════════════════════════════════════════════════════════════════════════════════
# AUTO CLIPS — detección automática de mejores momentos + corte + captions
# ══════════════════════════════════════════════════════════════════════════════════

# Rangos de duración disponibles para clips
CLIP_DUR_RANGES = {
    'short':  {"min": 20,  "max": 60,  "ideal": "30-50s",   "fallback": 40,  "label": "20s a 1 min"},
    'medium': {"min": 60,  "max": 120, "ideal": "70-90s",   "fallback": 80,  "label": "1 a 2 min"},
    'long':   {"min": 120, "max": 300, "ideal": "150-200s", "fallback": 160, "label": "2 a 5 min"},
}


def snap_clip_boundaries(s: float, e: float, words: list) -> tuple:
    """
    Ancla start/end a límites reales de FRASES detectados por pausas en el audio.

    Lógica de detección:
      - Una pausa ≥ PAUSE_STRONG (0.55s) entre dos palabras = fin/inicio de frase claro.
      - Una pausa ≥ PAUSE_WEAK  (0.30s) entre dos palabras = fin/inicio de cláusula.

    Reglas de snap:
      start → inicio de la frase más cercana a s, ventana [-3s, +1s]
      end   → fin de la frase más cercana a e, ventana [-14s, +3s]
              Prioridad: pausa fuerte > pausa débil > fin de última palabra (nunca mid-word)

    GARANTÍA ABSOLUTA: el clip NUNCA termina en mitad de una palabra.
    OBJETIVO: el clip termina siempre al final de una frase o cláusula completa.
    """
    if not words:
        return max(0.0, s - 0.15), e + 0.50

    PAUSE_STRONG = 0.55   # pausa clara = fin de oración / pensamiento completo
    PAUSE_WEAK   = 0.30   # pausa menor = fin de cláusula, coma, respiración

    # ── Pre-calcular bordes de frase usando gaps entre palabras ──────────────
    frase_ends_strong   = []   # ends con pausa_siguiente >= PAUSE_STRONG
    frase_ends_weak     = []   # ends con pausa_siguiente >= PAUSE_WEAK
    frase_starts_strong = [words[0]["start"]]  # inicio del audio siempre es inicio de frase
    frase_starts_weak   = []

    for i in range(len(words) - 1):
        gap = words[i + 1]["start"] - words[i]["end"]
        we  = words[i]["end"]
        if gap >= PAUSE_STRONG:
            frase_ends_strong.append(we)
            frase_starts_strong.append(words[i + 1]["start"])
        elif gap >= PAUSE_WEAK:
            frase_ends_weak.append(we)
            frase_starts_weak.append(words[i + 1]["start"])

    # El último word siempre es fin de frase
    frase_ends_strong.append(words[-1]["end"])

    # ── Snap START ────────────────────────────────────────────────────────────
    best_s      = s
    best_s_dist = float('inf')

    for cands in (frase_starts_strong, frase_starts_weak):
        for ws in cands:
            if s - 3.0 <= ws <= s + 1.0:
                d = abs(ws - s)
                if d < best_s_dist:
                    best_s_dist, best_s = d, ws
        if best_s_dist < 1.0:
            break   # encontrado uno suficientemente cercano

    # Fallback: palabra más cercana si no hay inicio de frase en ventana
    if best_s_dist > 3.5:
        for w in words:
            if s - 2.0 <= w["start"] <= s + 1.0:
                d = abs(w["start"] - s)
                if d < best_s_dist:
                    best_s_dist, best_s = d, w["start"]

    # ── Snap END ──────────────────────────────────────────────────────────────
    # Buscamos SIEMPRE el fin de frase más cercano al objetivo,
    # con ventana generosa [-14s, +3s] para nunca cortar a mitad de frase.
    best_e      = None
    window_lo   = e - 14.0
    window_hi   = e + 3.0

    # Prioridad 1: fin de frase fuerte (pausa >= 0.55s después)
    for we in reversed(sorted(frase_ends_strong)):
        if window_lo <= we <= window_hi:
            best_e = we
            break

    # Prioridad 2: fin de cláusula (pausa >= 0.30s después)
    if best_e is None:
        for we in reversed(sorted(frase_ends_strong + frase_ends_weak)):
            if window_lo <= we <= window_hi:
                best_e = we
                break

    # Prioridad 3 (FALLBACK ABSOLUTO): fin de la última palabra antes de e+2s
    # → nunca en mitad de una palabra, aunque sea a mitad de frase
    if best_e is None:
        for w in reversed(words):
            if w["end"] <= e + 2.0:
                best_e = w["end"]
                break

    if best_e is None:
        best_e = e

    log.info(f"  snap_boundaries: s={s:.1f}→{best_s:.2f}  e={e:.1f}→{best_e:.2f}  "
             f"(frases_fuertes={len(frase_ends_strong)} débiles={len(frase_ends_weak)})")

    # 0.15s de silencio antes del inicio y 0.50s de silencio después del fin
    return max(0.0, best_s - 0.15), best_e + 0.50


def detect_best_clips(words: list, duration: float,
                      min_dur: float = 60.0, max_dur: float = 120.0,
                      ideal_str: str = "70-90s", fallback_dur: float = 80.0) -> list:
    """Llama a Groq para detectar los 3-5 mejores momentos virales del video."""
    # Construir transcripción compacta con timestamps en SEGUNDOS cada ~8 segundos
    # IMPORTANTE: usamos "[Xs]" (segundos enteros) para que Groq devuelva segundos en el JSON
    # NOTA: buf_start se actualiza al inicio del PRIMER word de cada bloque nuevo,
    #       no al start del último word del bloque anterior (error que desplazaba todos los timestamps).
    lines, buf, buf_start = [], [], words[0]["start"] if words else 0.0
    for w in words:
        if not buf:
            buf_start = w["start"]   # timestamp correcto: primer word del nuevo bloque
        buf.append(w["text"])
        if len(buf) >= 20 or (w["end"] - buf_start) > 8:
            lines.append(f"[{int(buf_start)}s] {' '.join(buf)}")
            buf = []
    if buf:
        lines.append(f"[{int(buf_start)}s] {' '.join(buf)}")
    transcript_text = "\n".join(lines)

    total_min, total_sec = int(duration // 60), int(duration % 60)
    try:
        from groq import Groq
        client = Groq(api_key=_get_groq_key())
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{
                "role": "user",
                "content": f"""Eres un editor experto en clips virales para TikTok, Instagram Reels y YouTube Shorts.

Analiza esta transcripción de {total_min}:{total_sec:02d} minutos ({int(duration)} segundos en total) y encuentra 3-5 fragmentos.

CRITERIOS DE SELECCIÓN:
- Idea completa y autosuficiente (se entiende sin ver el resto del video)
- Gancho fuerte: revelación, dato impactante, historia, humor o emoción intensa
- El inicio debe coincidir con el arranque claro de un pensamiento nuevo

REGLAS CRÍTICAS PARA LOS TIEMPOS — LEE CON ATENCIÓN:
- Los timestamps de la transcripción están en SEGUNDOS (ej: [65s] = segundo 65 del video)
- "start" y "end" en el JSON deben ser SEGUNDOS TOTALES desde el inicio del video (número entero o decimal)
  → NUNCA uses formato minutos:segundos, SIEMPRE segundos totales (ej: 125, no 2.05)
- "start": el segundo donde empieza la PRIMERA palabra del clip (0.5s antes si hay pausa)
- "end": el segundo donde termina la ÚLTIMA PALABRA de la última frase COMPLETA del clip
  → Después del "end" NO puede quedar ninguna palabra a medias ni frase incompleta
  → NUNCA termines cuando alguien está hablando o en medio de una frase
  → Si hay duda, pon el "end" 2-3 segundos MÁS TARDE (mejor largo que corto)
  → El clip DEBE terminar en cierre natural: fin de argumento, conclusión, pausa larga
- Duración: mínimo {int(min_dur)} segundos, ideal {ideal_str}, máximo {int(max_dur)} segundos
  → TODOS los clips deben tener entre {int(min_dur)} y {int(max_dur)} segundos SIN EXCEPCIÓN

TRANSCRIPCIÓN ({total_min}:{total_sec:02d} minutos — timestamps en segundos):
{transcript_text}

Responde ÚNICAMENTE con este JSON sin ningún texto adicional (start y end en SEGUNDOS TOTALES):
{{"clips": [{{"start": 45, "end": 112, "title": "Título descriptivo corto"}}]}}"""
            }],
            max_tokens=600,
            temperature=0.2
        )
        raw = response.choices[0].message.content.strip()
        start_idx, end_idx = raw.find('{'), raw.rfind('}')
        if start_idx != -1 and end_idx != -1:
            data = json.loads(raw[start_idx:end_idx + 1])
            raw_clips = data.get("clips", [])[:5]
            log.info(f"  detect_best_clips raw: {raw_clips}")
            result = []
            for c in raw_clips:
                s_raw = max(0.0, float(c.get("start", 0)))
                e_raw = min(duration, float(c.get("end", duration)))
                # Anclar a palabras reales del transcript
                s, e = snap_clip_boundaries(s_raw, e_raw, words)
                e = min(duration - 0.1, e)   # nunca superar la duración del video
                clip_dur = e - s
                log.info(f"    clip candidate: s_raw={s_raw:.1f} e_raw={e_raw:.1f} → s={s:.2f} e={e:.2f} dur={clip_dur:.1f}s")
                # Filtro con margen del 20% para no rechazar clips casi válidos
                if (min_dur * 0.8) <= clip_dur <= (max_dur * 1.25):
                    result.append({
                        "start": round(s, 2),
                        "end":   round(e, 2),
                        "title": str(c.get("title", "Clip"))[:60],
                    })
            log.info(f"  detect_best_clips: {len(result)} clips válidos")
            return result
    except Exception as e:
        log.warning(f"  detect_best_clips error: {e}")

    # ── Fallback: si Groq falla o devuelve 0 clips válidos, generar clips equidistantes ──
    log.warning("  detect_best_clips fallback: generando clips equidistantes")
    usable    = duration - 10
    num_clips = min(5, max(2, int(usable // (fallback_dur * 1.3))))
    clip_len  = min(fallback_dur, usable / (num_clips + 0.5))
    gap       = (usable - num_clips * clip_len) / (num_clips + 1)
    fallback  = []
    for i in range(num_clips):
        s = round(gap + i * (clip_len + gap), 1)
        e = round(min(duration - 1, s + clip_len), 1)
        if e - s >= min_dur * 0.7:
            fallback.append({"start": s, "end": e, "title": f"Clip {i+1}"})
    log.info(f"  fallback clips: {len(fallback)}")
    return fallback


def detect_layout_type(clip_path: Path, brightness_threshold: float = 150.0) -> str:
    """
    Detecta si el clip muestra solo cámara ('full_face') o cámara+pantalla ('split').
    Mide el brillo del centro del frame (zona libre de pips en esquinas).
    - TradingView/pantalla oscura → brillo bajo  → 'split'
    - Solo cámara con fondo claro → brillo alto → 'full_face'
    """
    try:
        dr = subprocess.run(
            [FFPROBE_EXE, '-v', 'quiet', '-print_format', 'json', '-show_format', str(clip_path)],
            capture_output=True, timeout=10
        )
        duration = 5.0
        if dr.returncode == 0:
            data = json.loads(dr.stdout.decode('utf-8', errors='ignore'))
            duration = float(data.get('format', {}).get('duration', 5.0))

        sample_t = duration * 0.2   # Samplear al 20% del clip

        # Centro 40% del frame (nunca tiene pip, siempre es contenido de pantalla o fondo)
        cmd = [
            FFMPEG_EXE, '-ss', str(sample_t), '-i', str(clip_path),
            '-vframes', '1',
            '-vf', 'crop=iw*0.40:ih*0.40:iw*0.30:ih*0.30,scale=32:18',
            '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1'
        ]
        r = subprocess.run(cmd, capture_output=True, timeout=15)
        if r.returncode == 0 and r.stdout:
            brightness = sum(r.stdout) / max(len(r.stdout), 1)
            result = 'full_face' if brightness > brightness_threshold else 'split'
            log.info(f"  detect_layout: brightness={brightness:.1f} → {result}")
            return result
    except Exception as e:
        log.warning(f"  detect_layout error: {e}")
    return 'split'


def _find_pip_face_crop_x(clip_path: Path,
                           xf: float, yf: float, wf: float, hf: float,
                           out_w: int, out_h: int):
    """
    Extrae un frame del pip, detecta la cara con OpenCV y devuelve
    el offset horizontal (px) para centrar la cara en `out_w` píxeles.
    Devuelve None para señalar "usar crop centrado" como fallback.
    """
    try:
        import cv2
        import numpy as np
    except ImportError:
        log.info("  cv2 no disponible — instala opencv-python para centrado preciso de cara")
        return None

    # ── Probar dimensiones del video ────────────────────────────────────────
    try:
        pr = subprocess.run(
            [FFPROBE_EXE, '-v', 'quiet', '-print_format', 'json',
             '-show_streams', str(clip_path)],
            capture_output=True, timeout=10
        )
        vid_w, vid_h = 1920, 1080
        if pr.returncode == 0:
            for s in json.loads(pr.stdout.decode('utf-8', errors='ignore')).get('streams', []):
                if s.get('codec_type') == 'video':
                    vid_w = int(s.get('width', 1920))
                    vid_h = int(s.get('height', 1080))
                    break
    except Exception:
        vid_w, vid_h = 1920, 1080

    # ── Obtener duración para elegir frame de muestra ───────────────────────
    try:
        dr = subprocess.run(
            [FFPROBE_EXE, '-v', 'quiet', '-print_format', 'json', '-show_format', str(clip_path)],
            capture_output=True, timeout=10
        )
        duration = 5.0
        if dr.returncode == 0:
            data = json.loads(dr.stdout.decode('utf-8', errors='ignore'))
            duration = float(data.get('format', {}).get('duration', 5.0))
    except Exception:
        duration = 5.0

    sample_t = max(0.5, duration * 0.25)
    SAMPLE_W, SAMPLE_H = 320, 240

    # ── Extraer frame del pip como BGR raw ─────────────────────────────────
    cmd = [
        FFMPEG_EXE, '-ss', str(sample_t), '-i', str(clip_path),
        '-vframes', '1',
        '-vf', f'crop=iw*{wf}:ih*{hf}:iw*{xf}:ih*{yf},scale={SAMPLE_W}:{SAMPLE_H}',
        '-f', 'rawvideo', '-pix_fmt', 'bgr24', 'pipe:1'
    ]
    r = subprocess.run(cmd, capture_output=True, timeout=15)
    if r.returncode != 0 or len(r.stdout) < SAMPLE_W * SAMPLE_H * 3:
        log.warning("  _find_pip_face_crop_x: no se pudo extraer el frame del pip")
        return None

    # ── Detectar cara con Haar Cascade ────────────────────────────────────
    try:
        frame = np.frombuffer(r.stdout, dtype=np.uint8).reshape(SAMPLE_H, SAMPLE_W, 3)
        gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        faces = cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=3,
            minSize=(int(SAMPLE_W * 0.08), int(SAMPLE_H * 0.08))
        )
        if len(faces) == 0:
            log.info("  _find_pip_face_crop_x: ninguna cara detectada — usando centro")
            return None

        fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
        face_cx_norm = (fx + fw / 2) / SAMPLE_W   # posición normalizada [0, 1]
        log.info(f"  Cara detectada en pip: cx_norm={face_cx_norm:.3f}")
    except Exception as e:
        log.warning(f"  Haar cascade error: {e}")
        return None

    # ── Calcular ancho escalado del pip con force_original_aspect_ratio=increase ──
    pip_ar    = (vid_w * wf) / (vid_h * hf)
    target_ar = out_w / out_h
    if pip_ar > target_ar:
        scaled_w = int(pip_ar * out_h)      # escala por altura → exceso horizontal
    else:
        scaled_w = out_w                    # escala por anchura → sin exceso

    # ── Offset de crop para centrar la cara ─────────────────────────────────
    face_px = face_cx_norm * scaled_w
    crop_x  = int(face_px - out_w / 2)
    excess  = max(0, scaled_w - out_w)
    crop_x  = max(0, min(excess, crop_x))
    log.info(f"  Face crop offset: {crop_x}px (scaled_w={scaled_w}, excess={excess})")
    return crop_x


def compose_youtube_layout(clip_path: Path, output_path: Path, pip_position: str = 'bottom-right') -> bool:
    """
    Convierte un clip landscape a portrait 9:16.

    Modo 'full_face' (solo cámara detectada, fondo claro):
      → Face zoom a 1080×1920

    Modo 'split' (cámara + pantalla detectada):
      → Top  45% (864px):  cara extraída del pip, con zoom
      → Bot  55% (1056px): pantalla SIN pip, con zoom (excluye la esquina del pip)

    Si pip_position='none': face full screen sin detección.
    """
    OUT_W, OUT_H = 1080, 1920
    face_h   = 864
    screen_h = 1056

    # (x_frac, y_frac, w_frac, h_frac) del pip en el source
    pip_configs = {
        'bottom-right': (0.72, 0.62, 0.28, 0.38),
        'bottom-left':  (0.00, 0.62, 0.28, 0.38),
        'top-right':    (0.72, 0.00, 0.28, 0.38),
        'top-left':     (0.00, 0.00, 0.28, 0.38),
    }

    # Área de pantalla a mostrar en el bottom (excluye la esquina del pip)
    screen_crop_filter = {
        'bottom-right': 'crop=iw*0.76:ih:0:0',            # left 76% (sin pip derecha)
        'bottom-left':  'crop=iw*0.76:ih:iw*0.24:0',      # right 76% (sin pip izquierda)
        'top-right':    'crop=iw*0.76:ih:0:0',            # left 76%
        'top-left':     'crop=iw*0.76:ih:iw*0.24:0',      # right 76%
    }

    try:
        if pip_position not in pip_configs:
            # Sin cámara o modo 'none': face full screen con zoom
            layout = 'full_face'
        else:
            layout = detect_layout_type(clip_path)

        # Offset de crop horizontal para full_face según posición del pip
        # (la cara tiende a estar donde estaba el pip)
        full_face_crop_x = {
            'bottom-right': 'iw*44/100',   # cara en zona derecha → crop desplazado
            'top-right':    'iw*44/100',
            'bottom-left':  '0',            # cara en zona izquierda → desde el inicio
            'top-left':     '0',
        }

        if layout == 'full_face':
            # Cámara completa: crop centrado en donde está la cara
            cx = full_face_crop_x.get(pip_position, '(iw-1080)/2')
            vf = (
                f"scale={OUT_W}:{OUT_H}:force_original_aspect_ratio=increase,"
                f"crop={OUT_W}:{OUT_H}:{cx}:0"
            )
            cmd = [
                FFMPEG_EXE, '-y', '-i', str(clip_path), '-vf', vf,
                '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
                '-c:a', 'aac', '-b:a', '192k', str(output_path)
            ]
        else:
            xf, yf, wf, hf = pip_configs[pip_position]
            scrop = screen_crop_filter[pip_position]

            # TOP — cara: detectar posición de cara → crop preciso centrado en el rostro
            face_crop_x = _find_pip_face_crop_x(
                clip_path, xf, yf, wf, hf, OUT_W, face_h
            )
            cx_expr = str(face_crop_x) if face_crop_x is not None else f"(iw-{OUT_W})/2"
            face_f = (
                f"crop=iw*{wf}:ih*{hf}:iw*{xf}:ih*{yf},"
                f"scale={OUT_W}:{face_h}:force_original_aspect_ratio=increase,"
                f"crop={OUT_W}:{face_h}:{cx_expr}:(ih-{face_h})/2"
            )
            # BOT — pantalla: crop sin pip → zoom → crop centrado
            screen_f = (
                f"{scrop},"
                f"scale={OUT_W}:{screen_h}:force_original_aspect_ratio=increase,"
                f"crop={OUT_W}:{screen_h}:(iw-{OUT_W})/2:(ih-{screen_h})/2"
            )
            filter_str = (
                f"[0:v]{face_f}[face];"
                f"[0:v]{screen_f}[screen];"
                f"[face][screen]vstack[out]"
            )
            cmd = [
                FFMPEG_EXE, '-y', '-i', str(clip_path),
                '-filter_complex', filter_str,
                '-map', '[out]', '-map', '0:a',
                '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
                '-c:a', 'aac', '-b:a', '192k', str(output_path)
            ]

        r = subprocess.run(cmd, capture_output=True, timeout=300)
        if r.returncode != 0:
            log.error(f"  compose_youtube error: {r.stderr.decode(errors='ignore')[:400]}")
        return r.returncode == 0
    except Exception as e:
        log.error(f"  compose_youtube exception: {e}")
        return False


def cut_clip_ffmpeg(source: Path, start: float, end: float, output: Path) -> bool:
    """
    Corta un fragmento del video con ffmpeg usando dos fases de seek:
      1. Input seek rápido (keyframe) a (start - pre_roll) para no decodificar desde 0
      2. Output seek fino de pre_roll segundos para llegar al frame exacto de start
      3. -t con la duración exacta del clip

    Esto evita el bug del keyframe: sin este método, ffmpeg se adelanta hasta el
    keyframe anterior y el clip empieza antes del punto deseado.
    """
    try:
        duration  = round(end - start, 3)
        pre_roll  = min(6.0, start)            # cuánto retrocedemos antes del start
        fast_seek = round(start - pre_roll, 3) # seek rápido de input
        fine_seek = round(pre_roll, 3)          # seek fino en output

        cmd = [
            FFMPEG_EXE, "-y",
            "-ss", str(fast_seek),   # 1) seek rápido al keyframe previo
            "-i",  str(source),
            "-ss", str(fine_seek),   # 2) seek fino frame-accurate en el output
            "-t",  str(duration),    # 3) duración exacta
            "-c:v", "libx264", "-preset", "fast", "-crf", "18",
            "-c:a", "aac", "-b:a", "192k",
            str(output)
        ]
        log.info(f"  cut_clip: start={start:.2f} end={end:.2f} dur={duration:.2f}s "
                 f"(fast_seek={fast_seek} fine_seek={fine_seek})")
        r = subprocess.run(cmd, capture_output=True, timeout=300)
        if r.returncode != 0:
            log.error(f"  ffmpeg error: {r.stderr.decode(errors='ignore')[:300]}")
        return r.returncode == 0
    except Exception as e:
        log.error(f"  cut_clip_ffmpeg exception: {e}")
        return False


def detect_caption_pos_for_clip(clip_path: Path) -> int:
    """
    Analiza el clip para determinar la posición óptima de subtítulos.
    Extrae un fotograma central, mide el brillo de la zona inferior (30% del frame)
    vs el brillo medio total. Si la zona inferior es brillante/ocupada, sube los subs.
    Devuelve caption_pos (% desde abajo, 0-100):
      10-15 → zona inferior libre, subtítulos abajo
      50-60 → zona inferior ocupada, subtítulos arriba
    """
    try:
        # Duración del clip
        r = subprocess.run(
            [FFPROBE_EXE, "-v", "quiet", "-print_format", "json", "-show_format", str(clip_path)],
            capture_output=True, timeout=10
        )
        duration = float(json.loads(r.stdout.decode("utf-8", errors="ignore"))["format"]["duration"])
        mid = max(0.5, duration / 2)

        # Brillo zona inferior (30% del frame)
        r_bottom = subprocess.run([
            FFMPEG_EXE, "-ss", str(mid), "-i", str(clip_path),
            "-frames:v", "1",
            "-vf", "crop=iw:ih*0.30:0:ih*0.70,format=gray,scale=16:16",
            "-f", "rawvideo", "pipe:1"
        ], capture_output=True, timeout=15)

        # Brillo zona superior (30% del frame)
        r_top = subprocess.run([
            FFMPEG_EXE, "-ss", str(mid), "-i", str(clip_path),
            "-frames:v", "1",
            "-vf", "crop=iw:ih*0.30:0:0,format=gray,scale=16:16",
            "-f", "rawvideo", "pipe:1"
        ], capture_output=True, timeout=15)

        def avg(data):
            return sum(data) / len(data) if data else 128.0

        bottom_brightness = avg(r_bottom.stdout)
        top_brightness    = avg(r_top.stdout)

        log.info(f"  [pos-detect] {clip_path.name}: bottom={bottom_brightness:.1f} top={top_brightness:.1f}")

        # Decisión: si zona inferior es significativamente más brillante → mover subs arriba
        if bottom_brightness > 160 or bottom_brightness > top_brightness * 1.35:
            return 58   # subs en zona superior del frame
        else:
            return 12   # subs en zona inferior (default)

    except Exception as e:
        log.warning(f"  [pos-detect] error para {clip_path.name}: {e}")
        return 12   # posición segura por defecto


def process_long_video(video_path: Path, language: str, model: str, progress_q=None,
                       video_type: str = 'generic', pip_position: str = 'bottom-right',
                       caption_style: str = 'style1', clip_dur_range: str = 'medium',
                       highlight_color: str = '#FFE033'):
    """
    Pipeline completo para video largo:
    1. Transcribir
    2. Detectar mejores clips con Groq
    3. Cortar cada clip con ffmpeg
    4. Añadir captions a cada clip con el pipeline normal
    Devuelve lista de dicts con info de cada clip procesado.
    """
    name = video_path.stem
    _emit(progress_q, f">> Procesando video largo: {video_path.name}")

    project_dir = PROJECTS_DIR / f"{name}-clips"
    project_dir.mkdir(parents=True, exist_ok=True)
    clips_dir = project_dir / "clips"
    clips_dir.mkdir(exist_ok=True)

    dest_video = project_dir / video_path.name
    shutil.copy2(video_path, dest_video)
    _emit(progress_q, "CSTEP:1")

    # ── 1. Transcribir video completo ──
    _emit(progress_q, "CSTEP:2")
    try:
        from faster_whisper import WhisperModel
        wmodel = WhisperModel(model, device="cpu", compute_type="int8")
        segments, audio_info = wmodel.transcribe(
            str(dest_video), language=language,
            word_timestamps=True, vad_filter=False,
            condition_on_previous_text=False,
            no_speech_threshold=0.7, beam_size=5,
        )
        whisper_duration = round(float(audio_info.duration), 3)
        words = []
        for seg in segments:
            if seg.words:
                for w in seg.words:
                    t = w.word.strip()
                    if t:
                        words.append({"text": t, "start": round(w.start, 3), "end": round(w.end, 3)})
        duration = get_video_duration(dest_video)
        if duration == 0.0 or abs(duration - whisper_duration) > 1.0:
            duration = whisper_duration
        words = [w for w in words if w["start"] < duration - 0.05]
        for w in words:
            w["end"] = min(w["end"], duration - 0.05)
        log.info(f"  {len(words)} palabras, duración {duration:.1f}s")
    except Exception as e:
        _emit(progress_q, f"ERROR:{e}")
        return []

    if not words:
        _emit(progress_q, "ERROR:Transcript vacío")
        return []

    # ── 2. Detectar mejores clips ──
    _emit(progress_q, "CSTEP:3")
    dur_cfg = CLIP_DUR_RANGES.get(clip_dur_range, CLIP_DUR_RANGES['medium'])
    clips = detect_best_clips(
        words, duration,
        min_dur=dur_cfg["min"], max_dur=dur_cfg["max"],
        ideal_str=dur_cfg["ideal"], fallback_dur=dur_cfg["fallback"],
    )
    if not clips:
        _emit(progress_q, "ERROR:No se detectaron clips válidos. Intenta con un video más largo.")
        return []

    _emit(progress_q, f"CSTEP:4:{len(clips)}")

    # ── 3. Cortar + procesar cada clip ──
    output_clips = []
    for i, clip_info in enumerate(clips):
        title  = clip_info["title"]
        start  = clip_info["start"]
        end    = clip_info["end"]
        _emit(progress_q, f"CCLIP:{i+1}:{len(clips)}:{title}")

        clip_filename = f"{name}-clip-{i+1:02d}.mp4"
        clip_path     = clips_dir / clip_filename

        if not cut_clip_ffmpeg(dest_video, start, end, clip_path):
            log.warning(f"  Error cortando clip {i+1}, saltando")
            _emit(progress_q, f"CCLIP_DONE:{i+1}:{len(clips)}:error")
            continue

        # Aplicar layout YouTube si corresponde
        if video_type == 'youtube':
            composed_name = f"{name}-clip-{i+1:02d}-yt.mp4"
            composed_path = clips_dir / composed_name
            if compose_youtube_layout(clip_path, composed_path, pip_position):
                source_for_captions = composed_path
                log.info(f"  Layout YouTube aplicado a clip {i+1} (pip={pip_position})")
            else:
                log.warning(f"  Layout YouTube falló en clip {i+1}, usando original")
                source_for_captions = clip_path
        else:
            source_for_captions = clip_path

        # Copiar a input/ para que process_video lo encuentre
        clip_input = INPUT_DIR / source_for_captions.name
        shutil.copy2(source_for_captions, clip_input)

        # Detectar posición óptima de subtítulos para este clip
        _clip_pos = detect_caption_pos_for_clip(clip_input)
        log.info(f"  [pos-detect] clip {i+1}: usando caption_pos={_clip_pos}")

        # Añadir captions (sin relay de progreso interno)
        process_video(clip_input, language, model, progress_q=None, caption_style=caption_style,
                      highlight_color=highlight_color, caption_pos=_clip_pos)

        # Limpiar archivo temporal de input
        try:
            clip_input.unlink()
        except Exception:
            pass

        output_file = OUTPUT_DIR / f"{clip_input.stem}-captions.mp4"
        if output_file.exists():
            output_clips.append({
                "idx":      i,
                "title":    title,
                "path":     output_file,
                "start":    start,
                "end":      end,
                "duration": round(end - start, 1),
            })
            _emit(progress_q, f"CCLIP_DONE:{i+1}:{len(clips)}:ok")
        else:
            _emit(progress_q, f"CCLIP_DONE:{i+1}:{len(clips)}:error")

    if output_clips:
        clips_json = json.dumps([
            {"idx": c["idx"], "title": c["title"], "duration": c["duration"]}
            for c in output_clips
        ], ensure_ascii=False)
        _emit(progress_q, f"CDONE:{clips_json}")
    else:
        _emit(progress_q, "ERROR:No se pudo procesar ningún clip")

    return output_clips


# ── Audio Sync ───────────────────────────────────────────────────────────────────

def _extract_mono_wav(src: Path, dst: Path, sample_rate: int = 8000) -> None:
    """Extrae primera pista de audio a WAV mono a la sample_rate dada."""
    subprocess.run([
        FFMPEG_EXE, "-y", "-i", str(src),
        "-vn", "-ac", "1", "-ar", str(sample_rate),
        "-f", "wav", str(dst)
    ], check=True, capture_output=True)


def _read_wav_float(wav_path: Path) -> tuple:
    """Lee WAV a numpy float32 array. Retorna (samples, sample_rate)."""
    import wave as _wave
    import numpy as np
    with _wave.open(str(wav_path), "rb") as wf:
        sr   = wf.getframerate()
        nch  = wf.getnchannels()
        sw   = wf.getsampwidth()
        raw  = wf.readframes(wf.getnframes())
    dtype = {1: np.int8, 2: np.int16, 4: np.int32}.get(sw, np.int16)
    data  = np.frombuffer(raw, dtype=dtype).astype(np.float32)
    if nch > 1:
        data = data.reshape(-1, nch).mean(axis=1)
    return data, sr


def find_audio_offset(video_path: Path, audio_path: Path) -> tuple:
    """
    Calcula el desfase temporal entre el audio del video de cámara y el audio
    de OBS mediante CONSENSO MULTI-VENTANA sobre el envelope RMS (10 ms/frame).

    El problema del método anterior:
      - Una sola cross-correlación global puede engancharse a un PICO ESPURIO.
        El habla es auto-similar (el ritmo de una frase se parece al de otra), así
        que un máximo falso a N segundos del verdadero puede ganar globalmente.
        → Resultado: desfase incorrecto de varios segundos.

    La solución (consenso por votación):
      - Se toman muchas ventanas-ancla independientes del audio de la CÁMARA y
        cada una se busca por separado dentro del audio de OBS.
      - Un pico espurio es una coincidencia que NO se repite en el mismo offset
        entre ventanas distintas; el offset VERDADERO sí es consistente en todas.
      - Se toma la MEDIANA de los offsets → descarta automáticamente los outliers.
      - La confianza = fracción de ventanas que están de acuerdo con la mediana.

    Robustez adicional:
      - High-pass >120 Hz: elimina hum de red y ruido grave de sala.
      - Envelope de energía: sólo mide CUÁNDO suena, idéntico entre micros distintos.
      - Cross-correlación normalizada (NCC): inmune a diferencias de volumen.
      - Ventana de búsqueda ±MAX_OFFSET_S: descarta picos imposiblemente lejanos.

    Retorna (offset_seconds: float, confidence: float 0-1).
      offset > 0 → OBS empieza DESPUÉS que el video → hay que retrasarlo
      offset < 0 → OBS empieza ANTES que el video → hay que recortarlo
    """
    import tempfile, numpy as np

    SR           = 8000   # Hz — suficiente para el envelope
    FRAME_MS     = 10     # ms por frame → resolución ±5 ms (imperceptible)
    MAX_OFFSET_S = 30     # buscar desfase sólo dentro de ±30 s
    WIN_S        = 8      # duración de cada ventana-ancla
    N_ANCHORS    = 13     # nº de ventanas-ancla repartidas por el audio
    CAP_S        = 300    # considerar hasta 5 min de material

    frame_size = max(1, SR * FRAME_MS // 1000)   # 80 muestras a 8 kHz
    ENV_SR     = 1000 // FRAME_MS                # 100 frames/s

    # ── 1. Extraer audio mono ──
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        v_wav = tmp / "cam.wav"
        a_wav = tmp / "obs.wav"
        _extract_mono_wav(video_path, v_wav, SR)
        _extract_mono_wav(audio_path, a_wav, SR)
        v_raw, _ = _read_wav_float(v_wav)
        a_raw, _ = _read_wav_float(a_wav)

    # ── 2. High-pass >120 Hz (quita hum/ruido grave) ──
    def _hp(sig, cutoff_hz=120):
        n = len(sig)
        if n == 0:
            return sig
        f     = np.fft.rfft(sig)
        freqs = np.fft.rfftfreq(n, 1.0 / SR)
        f[freqs < cutoff_hz] = 0.0
        return np.fft.irfft(f, n=n)

    # ── 3. Envelope RMS por frame ──
    def _envelope(sig):
        nf = len(sig) // frame_size
        if nf == 0:
            return np.zeros(1, dtype=np.float32)
        b = sig[:nf * frame_size].reshape(nf, frame_size)
        return np.sqrt(np.mean(b * b, axis=1)).astype(np.float32)

    v_env = _envelope(_hp(v_raw))
    a_env = _envelope(_hp(a_raw))

    cap_f = CAP_S * ENV_SR
    v_env = v_env[:cap_f]
    a_env = a_env[:cap_f]

    # Restar la media → cross-correlación centrada (ignora el nivel DC)
    v_env = v_env - float(v_env.mean())
    a_env = a_env - float(a_env.mean())

    win_f   = WIN_S * ENV_SR
    max_lag = MAX_OFFSET_S * ENV_SR

    # ── NCC deslizante: posición del template dentro de signal ──
    def _ncc(template, signal):
        L, M = len(template), len(signal)
        if M < L:
            return None, None
        nfft = 1 << (M + L - 1).bit_length()
        T    = np.fft.rfft(template[::-1], n=nfft)
        S    = np.fft.rfft(signal,        n=nfft)
        full = np.fft.irfft(S * T, n=nfft)
        num  = full[L - 1:M]                              # length M-L+1
        t_norm = float(np.sqrt(np.sum(template * template))) + 1e-9
        csq    = np.concatenate([[0.0], np.cumsum(signal * signal)])
        win_e  = csq[L:M + 1] - csq[0:M - L + 1]
        s_norm = np.sqrt(np.maximum(win_e, 0.0)) + 1e-9
        ncc    = num / (t_norm * s_norm)
        idx    = int(np.argmax(ncc))
        return idx, float(ncc[idx])

    # ── 4. Consenso multi-ventana ──
    offsets, strengths = [], []
    usable = len(v_env) - win_f
    if usable > win_f:   # hay material suficiente para varias ventanas
        starts = np.linspace(0, usable, N_ANCHORS).astype(int)
        for s in starts:
            cam = v_env[s:s + win_f]
            if float(cam.std()) < 1e-3:   # ventana prácticamente en silencio
                continue
            lo  = max(0, s - max_lag)
            hi  = min(len(a_env), s + win_f + max_lag)
            reg = a_env[lo:hi]
            idx, peak = _ncc(cam, reg)
            if idx is None:
                continue
            obs_pos = lo + idx                 # posición del ancla dentro de OBS
            offsets.append((s - obs_pos) / ENV_SR)
            strengths.append(peak)

    if len(offsets) >= 3:
        offs = np.array(offsets, dtype=np.float64)
        strn = np.array(strengths, dtype=np.float64)
        med  = float(np.median(offs))
        inl  = np.abs(offs - med) <= 0.05      # de acuerdo ±50 ms
        if inl.sum() == 0:
            inl = np.abs(offs - med) <= 0.10
        final     = float(np.mean(offs[inl]))
        agree     = float(inl.sum()) / len(offs)
        mean_peak = float(np.mean(strn[inl])) if inl.sum() else 0.0
        # confianza = acuerdo entre ventanas, escalado por la fuerza media del match
        confidence = round(min(1.0, agree * (0.4 + 0.6 * mean_peak)), 3)
        try:
            print(f"  [sync] offsets={[round(o,3) for o in offsets]} "
                  f"→ median={med:.3f} final={final:.3f} agree={agree:.2f}")
        except Exception:
            pass
        return round(final, 3), confidence

    # ── 5. Fallback: correlación global (audio demasiado corto) ──
    n     = len(v_env) + len(a_env) - 1
    n_fft = 1 << (n - 1).bit_length()
    V     = np.fft.rfft(v_env, n=n_fft)
    A     = np.fft.rfft(a_env, n=n_fft)
    corr  = np.fft.irfft(V * np.conj(A), n=n_fft)[:n]
    corr_full = np.concatenate([corr[-(len(a_env) - 1):], corr[:len(v_env)]])

    center = len(a_env) - 1
    lo = max(0, center - max_lag)
    hi = min(len(corr_full), center + max_lag + 1)
    search = np.full_like(corr_full, -1e30)
    search[lo:hi] = corr_full[lo:hi]
    peak_idx = int(np.argmax(search))
    offset   = round((peak_idx - center) / ENV_SR, 3)

    window_vals = corr_full[lo:hi]
    peak_val    = float(corr_full[peak_idx])
    mean_abs    = float(np.mean(np.abs(window_vals)))
    std_abs     = float(np.std(np.abs(window_vals))) + 1e-8
    confidence  = min(1.0, max(0.0, round((peak_val - mean_abs) / (std_abs * 3 + 1e-8), 3)))
    return offset, confidence


def _obs_has_video(obs_path: Path) -> bool:
    """Devuelve True si el archivo OBS contiene una pista de vídeo."""
    try:
        result = subprocess.run(
            [FFPROBE_EXE, "-v", "quiet", "-select_streams", "v:0",
             "-show_entries", "stream=codec_type", "-of", "csv=p=0", str(obs_path)],
            capture_output=True, text=True, timeout=15
        )
        return result.stdout.strip() == "video"
    except Exception:
        return False


def sync_audio_tracks(video_path: Path, obs_path: Path, output_path: Path,
                      progress_q=None):
    """
    Sincroniza el audio de OBS con el vídeo de cámara y los combina.

    Genera hasta DOS salidas:
      - output_path         → vídeo de CÁMARA + audio OBS sincronizado
      - output_path (obs)   → vídeo de PANTALLA (OBS) + audio OBS  (solo si OBS tiene vídeo)

    Retorna (offset_float, has_obs_video: bool).
    La ruta del segundo archivo es output_path con sufijo _obs antes del .mp4.
    """
    _emit(progress_q, "SYNC_STEP:1:Analizando audio...")

    offset, confidence = find_audio_offset(video_path, obs_path)

    _emit(progress_q, f"SYNC_OFFSET:{offset:.3f}:{confidence:.3f}")
    _emit(progress_q, "SYNC_STEP:2:Aplicando sincronización...")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    # ── Construir offset ffmpeg ──────────────────────────────────────────────
    if offset >= 0:
        audio_input = ["-itsoffset", f"{offset:.3f}", "-i", str(obs_path)]
    else:
        audio_input = ["-ss", f"{-offset:.3f}", "-i", str(obs_path)]

    # ── Salida A: cámara + audio OBS ────────────────────────────────────────
    cmd_cam = [
        FFMPEG_EXE, "-y",
        "-i", str(video_path),
        *audio_input,
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        str(output_path)
    ]
    result = subprocess.run(cmd_cam, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg sync (cam) error: {result.stderr[-600:]}")

    # ── Salida B: pantalla OBS + audio OBS (solo si OBS tiene vídeo) ────────
    has_obs_video = _obs_has_video(obs_path)
    if has_obs_video:
        stem = output_path.stem          # ej. "sync_abc_cam-synced"
        obs_out = output_path.with_name(stem.replace("_cam-synced", "_obs-synced") + ".mp4")

        # El vídeo OBS ya tiene su audio en sync consigo mismo — solo remuxear.
        # Si el offset es grande se puede querer alinear el inicio, pero para
        # el caso normal (misma grabación) basta con copiar los streams.
        cmd_obs = [
            FFMPEG_EXE, "-y",
            "-i", str(obs_path),
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "192k",
            str(obs_out)
        ]
        res_obs = subprocess.run(cmd_obs, capture_output=True, text=True)
        if res_obs.returncode != 0:
            # No es fatal — solo advertimos
            log.warning(f"ffmpeg obs remux warning: {res_obs.stderr[-300:]}")
            has_obs_video = False

    _emit(progress_q, f"SYNC_HAS_OBS_VIDEO:{'1' if has_obs_video else '0'}")
    _emit(progress_q, "SYNC_STEP:3:Listo")
    return offset, has_obs_video


# ── Watchdog ─────────────────────────────────────────────────────────────────────
class VideoHandler(FileSystemEventHandler):
    def __init__(self, language, model):
        self.language = language
        self.model = model
        self._processing = set()

    def on_created(self, event):
        if event.is_directory:
            return
        path = Path(event.src_path)
        if path.suffix.lower() not in VIDEO_EXTENSIONS:
            return
        if path in self._processing:
            return
        self._processing.add(path)
        log.info(f"Archivo detectado: {path.name} - esperando que termine de copiarse...")
        time.sleep(3)
        self._wait_stable(path)
        process_video(path, self.language, self.model)
        self._processing.discard(path)

    def _wait_stable(self, path: Path, checks: int = 3, interval: float = 1.0):
        prev_size = -1
        stable = 0
        while stable < checks:
            try:
                size = path.stat().st_size
            except FileNotFoundError:
                return
            if size == prev_size:
                stable += 1
            else:
                stable = 0
            prev_size = size
            time.sleep(interval)


# ── Main ──────────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Auto Captions Watcher v2")
    parser.add_argument("--language", default=DEFAULT_LANGUAGE)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    args = parser.parse_args()

    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)

    log.info("=" * 55)
    log.info("Auto Captions v2 - Watcher activo")
    log.info(f"Carpeta vigilada: {INPUT_DIR}")
    log.info(f"Output:           {OUTPUT_DIR}")
    log.info(f"Idioma:           {args.language}  |  Modelo: {args.model}")
    log.info("Suelta un video en input/ para empezar.")
    log.info("=" * 55)

    handler = VideoHandler(args.language, args.model)
    observer = Observer()
    observer.schedule(handler, str(INPUT_DIR), recursive=False)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        log.info("Watcher detenido.")
    observer.join()


if __name__ == "__main__":
    main()
