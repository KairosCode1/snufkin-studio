#!/usr/bin/env python3
"""
Auto Captions — Servidor local
Interfaz web drag & drop. Ejecutar: python server.py
"""

import os
import sys
import re
import uuid
import json
import shutil
import threading
import queue
import webbrowser
import time
from pathlib import Path

# Instalar dependencias del servidor si faltan
def _ensure(pkg, import_as=None):
    try:
        __import__(import_as or pkg)
    except ImportError:
        import subprocess
        print(f"Instalando {pkg}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])

_ensure("fastapi")
_ensure("uvicorn")

from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Form
from fastapi.responses import StreamingResponse, FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

# PyInstaller support
if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys.executable).parent
else:
    BASE_DIR = Path(__file__).parent

# Pipeline de auto_captions
sys.path.insert(0, str(BASE_DIR))
from auto_captions import process_video, process_long_video, DEFAULT_LANGUAGE, DEFAULT_MODEL
from auto_captions import transcribe_to_files
from auto_captions import OUTPUT_DIR, INPUT_DIR, PROJECTS_DIR
from auto_captions import sync_audio_tracks

# ── Config ───────────────────────────────────────────────────────────────────
PORT = 7331

# APP_STATIC_DIR: injected by Electron so we always find static/ regardless of
# where server.exe lives inside the package (resources/server/ vs resources/static/)
STATIC_DIR  = Path(os.environ.get("APP_STATIC_DIR",  str(BASE_DIR / "static")))

# APP_WORKSPACE: writable dir for input/, output/, projects/, config.json
# In packaged app: %APPDATA%\SnufkinStudio\workspace\
# In dev mode: project root
_WORKSPACE  = Path(os.environ.get("APP_WORKSPACE", str(BASE_DIR)))
CONFIG_FILE = _WORKSPACE / "config.json"

app = FastAPI(title="Auto Captions")

@app.middleware("http")
async def no_cache(request: Request, call_next):
    # Excluir rutas SSE — el middleware puede interferir con el streaming
    if request.url.path.startswith("/progress"):
        return await call_next(request)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# ── Settings helpers ─────────────────────────────────────────────────────────

def _load_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}

def _save_config(data: dict):
    CONFIG_FILE.write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )

# Jobs en memoria
jobs:      dict = {}   # subtítulos: job_id → {queue, status, output, filename, cancelled}
clip_jobs: dict = {}   # auto clips: job_id → {queue, status, clips, filename, cancelled}
trans_jobs: dict = {}  # transcripción: job_id → {queue, status, result, filename, cancelled}
sync_jobs: dict  = {}  # audio sync: job_id → {queue, status, output, offset, cancelled}


# ── Rutas ────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index():
    return FileResponse(str(STATIC_DIR / "index.html"))


# ── Subtítulos ────────────────────────────────────────────────────────────────

@app.post("/upload")
async def upload(
    file: UploadFile = File(...),
    caption_style: str = Form("style1"),
    orientation: str = Form("vertical"),
    whisper_model: str = Form("medium"),
    highlight_color: str = Form("#FFE033"),
    enable_zoom: str = Form("true"),
    caption_pos: str = Form("15"),
    caption_font: str = Form("outfit"),
    caption_anim: str = Form("default"),
    caption_case: str = Form("lower"),
    caption_size: str = Form("100"),
    caption_stroke: str = Form("false"),
):
    job_id = str(uuid.uuid4())[:8]
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    video_path = INPUT_DIR / file.filename
    with open(video_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    q = queue.Queue()
    _pos    = int(caption_pos)  if caption_pos.isdigit()  else 15
    _size   = int(caption_size) if caption_size.isdigit() else 100
    _stroke = caption_stroke.lower() == "true"
    jobs[job_id] = {
        "queue": q, "status": "processing", "output": None,
        "filename": file.filename, "cancelled": False,
        # Store render params for potential re-render
        "caption_style": caption_style, "orientation": orientation,
        "whisper_model": whisper_model, "highlight_color": highlight_color,
        "enable_zoom": enable_zoom.lower() == "true",
        "caption_pos": _pos,
        "caption_font": caption_font, "caption_anim": caption_anim,
        "caption_case": caption_case, "caption_size": _size,
        "caption_stroke": _stroke,
    }

    def run():
        try:
            process_video(video_path, DEFAULT_LANGUAGE, whisper_model, progress_q=q,
                          caption_style=caption_style, orientation=orientation,
                          highlight_color=highlight_color,
                          enable_zoom=(enable_zoom.lower() == "true"),
                          caption_pos=_pos,
                          caption_font=caption_font,
                          caption_anim=caption_anim,
                          caption_case=caption_case,
                          caption_size=_size,
                          caption_stroke=_stroke)
            out = OUTPUT_DIR / f"{video_path.stem}-captions.mp4"
            if out.exists():
                jobs[job_id].update({"status": "done", "output": out,
                                     "project_dir": PROJECTS_DIR / video_path.stem})
            else:
                # Only emit generic error if process_video didn't already emit one
                if jobs[job_id]["status"] != "error":
                    jobs[job_id]["status"] = "error"
                    q.put("ERROR:No se generó el archivo de salida")
        except Exception as e:
            jobs[job_id]["status"] = "error"
            q.put(f"ERROR:{e}")

    threading.Thread(target=run, daemon=True).start()
    return {"job_id": job_id, "filename": file.filename}


@app.get("/progress/{job_id}")
async def progress(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job no encontrado")

    def stream():
        q = jobs[job_id]["queue"]
        while True:
            if jobs[job_id].get("cancelled"):
                yield "data: CANCELLED\n\n"
                break
            try:
                msg = q.get(timeout=1)
                yield f"data: {msg}\n\n"
                if msg.startswith("DONE") or msg.startswith("ERROR") or msg == "CANCELLED":
                    break
            except queue.Empty:
                if jobs[job_id].get("cancelled"):
                    yield "data: CANCELLED\n\n"
                    break
                yield "data: KEEPALIVE\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/download/{job_id}")
async def download(job_id: str):
    job = jobs.get(job_id)
    if not job or job["status"] != "done":
        raise HTTPException(status_code=400, detail="Video no listo")
    out: Path = job["output"]
    return FileResponse(path=out, filename=out.name, media_type="video/mp4")


@app.get("/source-video/{job_id}")
async def source_video(job_id: str):
    """Serves the original input video WITHOUT baked-in captions.
    Used by the editor preview so captions can be rendered as a clean React overlay."""
    job = jobs.get(job_id)
    if not job or job["status"] != "done":
        raise HTTPException(status_code=404, detail="Job no disponible")
    # Primary: project_dir/<filename> (copy made during process_video)
    proj = job.get("project_dir")
    src: Path | None = None
    if proj:
        candidate = Path(proj) / job["filename"]
        if candidate.exists():
            src = candidate
    # Fallback: INPUT_DIR/<filename>
    if src is None:
        candidate = INPUT_DIR / job["filename"]
        if candidate.exists():
            src = candidate
    if src is None:
        # Last resort: return rendered output (has captions but at least works)
        src = job.get("output")
    if src is None or not Path(src).exists():
        raise HTTPException(status_code=404, detail="Vídeo fuente no encontrado")
    return FileResponse(path=str(src), media_type="video/mp4",
                        headers={"Accept-Ranges": "bytes"})


# ── Auto Clips ────────────────────────────────────────────────────────────────

@app.post("/upload-clips")
async def upload_clips(
    file: UploadFile = File(...),
    video_type:     str = Form("generic"),
    pip_position:   str = Form("bottom-right"),
    caption_style:  str = Form("style1"),
    clip_dur_range: str = Form("medium"),
    whisper_model:  str = Form("medium"),
    highlight_color: str = Form("#FFE033"),
    sfx_pack:       str = Form("none"),
):
    job_id = str(uuid.uuid4())[:8]
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    video_path = INPUT_DIR / file.filename
    with open(video_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    q = queue.Queue()
    clip_jobs[job_id] = {"queue": q, "status": "processing", "clips": [], "filename": file.filename, "cancelled": False}

    def run():
        try:
            result = process_long_video(
                video_path, DEFAULT_LANGUAGE, whisper_model,
                progress_q=q, video_type=video_type, pip_position=pip_position,
                caption_style=caption_style, clip_dur_range=clip_dur_range,
                highlight_color=highlight_color,
            )
            clip_jobs[job_id]["status"] = "done"
            clip_jobs[job_id]["clips"]  = result
        except Exception as e:
            clip_jobs[job_id]["status"] = "error"
            q.put(f"ERROR:{e}")

    threading.Thread(target=run, daemon=True).start()
    return {"job_id": job_id, "filename": file.filename}


@app.get("/progress-clips/{job_id}")
async def progress_clips(job_id: str):
    if job_id not in clip_jobs:
        raise HTTPException(status_code=404, detail="Job no encontrado")

    def stream():
        q = clip_jobs[job_id]["queue"]
        while True:
            if clip_jobs[job_id].get("cancelled"):
                yield "data: CANCELLED\n\n"
                break
            try:
                msg = q.get(timeout=1)
                yield f"data: {msg}\n\n"
                if msg.startswith("CDONE") or msg.startswith("ERROR") or msg == "CANCELLED":
                    break
            except queue.Empty:
                if clip_jobs[job_id].get("cancelled"):
                    yield "data: CANCELLED\n\n"
                    break
                yield "data: KEEPALIVE\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/clips-status/{job_id}")
async def clips_status(job_id: str):
    job = clip_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    return {"status": job["status"], "clips": len(job.get("clips", []))}


@app.get("/download-clip/{job_id}/{clip_idx}")
async def download_clip(job_id: str, clip_idx: int):
    job = clip_jobs.get(job_id)
    if not job or job["status"] != "done":
        raise HTTPException(status_code=400, detail="Clips no listos")
    clips = job["clips"]
    match = next((c for c in clips if c["idx"] == clip_idx), None)
    if not match:
        raise HTTPException(status_code=404, detail="Clip no encontrado")
    out: Path = match["path"]
    safe_title = re.sub(r'[\\/:*?"<>|]', '', match["title"]).strip() or out.stem
    return FileResponse(path=out, filename=f"{safe_title}.mp4", media_type="video/mp4")


# ── Transcripción de Audio/Vídeo ──────────────────────────────────────────────

@app.post("/upload-transcribe")
async def upload_transcribe(
    file: UploadFile = File(...),
    whisper_model: str = Form("medium"),
    language: str = Form(DEFAULT_LANGUAGE),
):
    job_id = str(uuid.uuid4())[:8]
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    media_path = INPUT_DIR / file.filename
    with open(media_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    q = queue.Queue()
    trans_jobs[job_id] = {
        "queue": q, "status": "processing", "result": None,
        "filename": file.filename, "cancelled": False,
    }

    def run():
        try:
            result = transcribe_to_files(media_path, language, whisper_model, progress_q=q)
            trans_jobs[job_id]["status"] = "done"
            trans_jobs[job_id]["result"] = result
        except Exception as e:
            if trans_jobs[job_id]["status"] != "error":
                trans_jobs[job_id]["status"] = "error"
                q.put(f"ERROR:{e}")

    threading.Thread(target=run, daemon=True).start()
    return {"job_id": job_id, "filename": file.filename}


@app.get("/progress-transcribe/{job_id}")
async def progress_transcribe(job_id: str):
    if job_id not in trans_jobs:
        raise HTTPException(status_code=404, detail="Job no encontrado")

    def stream():
        q = trans_jobs[job_id]["queue"]
        while True:
            if trans_jobs[job_id].get("cancelled"):
                yield "data: CANCELLED\n\n"
                break
            try:
                msg = q.get(timeout=1)
                yield f"data: {msg}\n\n"
                if msg.startswith("TDONE") or msg.startswith("ERROR") or msg == "CANCELLED":
                    break
            except queue.Empty:
                if trans_jobs[job_id].get("cancelled"):
                    yield "data: CANCELLED\n\n"
                    break
                yield "data: KEEPALIVE\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/transcribe-result/{job_id}")
async def transcribe_result(job_id: str):
    job = trans_jobs.get(job_id)
    if not job or job["status"] != "done":
        raise HTTPException(status_code=404, detail="Transcripción no disponible")
    res = job["result"]
    return JSONResponse({
        "preview":   res["preview"],
        "full_text": res["full_text"],
        "segments":  res["segments"],
        "duration":  res["duration"],
        "filename":  job["filename"],
    })


@app.get("/download-transcribe/{job_id}/{fmt}")
async def download_transcribe(job_id: str, fmt: str):
    job = trans_jobs.get(job_id)
    if not job or job["status"] != "done":
        raise HTTPException(status_code=400, detail="Transcripción no lista")
    if fmt not in ("srt", "txt"):
        raise HTTPException(status_code=400, detail="Formato inválido")
    out: Path = job["result"][fmt]
    if not Path(out).exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    media = "application/x-subrip" if fmt == "srt" else "text/plain"
    return FileResponse(path=str(out), filename=out.name, media_type=media)


# ── Trim (post-render editor) ─────────────────────────────────────────────────

@app.post("/trim/{job_id}")
async def trim_video(job_id: str, request: Request):
    """Recorta el vídeo renderizado. Body JSON: {start: float, end: float}"""
    import subprocess as _sp
    job = jobs.get(job_id)
    if not job or job["status"] != "done":
        raise HTTPException(status_code=400, detail="Video no listo")

    body = await request.json()
    start = float(body.get("start", 0))
    end   = float(body.get("end",   -1))

    out: Path = job["output"]
    trimmed   = OUTPUT_DIR / f"{out.stem}-trimmed.mp4"

    # Build FFmpeg command
    from auto_captions import FFMPEG_EXE
    cmd = [str(FFMPEG_EXE), "-y", "-i", str(out), "-ss", str(start)]
    if end > 0 and end > start:
        cmd += ["-to", str(end)]
    cmd += ["-c", "copy", str(trimmed)]

    try:
        result = _sp.run(cmd, capture_output=True, timeout=120)
        if result.returncode != 0 or not trimmed.exists():
            raise HTTPException(status_code=500, detail="Error al recortar con FFmpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return FileResponse(path=trimmed, filename=f"{out.stem}-trimmed.mp4", media_type="video/mp4")


@app.get("/job-info/{job_id}")
async def job_info(job_id: str):
    """Devuelve información del job (duración del vídeo de salida)."""
    import subprocess as _sp
    import json as _json
    job = jobs.get(job_id)
    if not job or job["status"] != "done":
        raise HTTPException(status_code=404)
    out: Path = job["output"]
    try:
        from auto_captions import FFPROBE_EXE
        r = _sp.run(
            [str(FFPROBE_EXE), "-v", "quiet", "-print_format", "json", "-show_format", str(out)],
            capture_output=True, timeout=15
        )
        data = _json.loads(r.stdout.decode("utf-8", errors="ignore"))
        duration = float(data["format"]["duration"])
    except Exception:
        duration = 0.0
    captions = []
    try:
        proj = job.get("project_dir")
        if proj:
            caps_file = Path(proj) / "captions.json"
            if caps_file.exists():
                with open(caps_file, encoding="utf-8") as _f:
                    captions = _json.loads(_f.read())
    except Exception:
        pass
    return JSONResponse({
        "duration":       duration,
        "filename":       out.name,
        "captions":       captions,
        "caption_pos":    job.get("caption_pos",    15),
        "caption_style":  job.get("caption_style",  "style1"),
        "highlight_color":job.get("highlight_color","#FFE033"),
        "caption_font":   job.get("caption_font",   "outfit"),
        "orientation":    job.get("orientation",    "vertical"),
        "caption_case":   job.get("caption_case",   "lower"),
        "caption_size":   job.get("caption_size",   100),
        "caption_stroke": job.get("caption_stroke", False),
    })


# ── Guardar captions editadas ────────────────────────────────────────────────

@app.post("/save-captions/{job_id}")
async def save_captions(job_id: str, request: Request):
    """Guarda las captions editadas en el editor."""
    data = await request.json()
    captions = data.get("captions", [])
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    proj = job.get("project_dir")
    if not proj or not Path(proj).exists():
        raise HTTPException(status_code=404, detail="Directorio de proyecto no encontrado")
    caps_file = Path(proj) / "captions.json"
    with open(caps_file, "w", encoding="utf-8") as _f:
        json.dump(captions, _f, ensure_ascii=False, indent=2)
    return JSONResponse({"ok": True})


# ── Re-render (apply caption edits + position change) ────────────────────────

@app.post("/re-render/{job_id}")
async def re_render(job_id: str, request: Request):
    """Re-renders the video using existing captions.json (no re-transcription)."""
    job = jobs.get(job_id)
    if not job or job["status"] not in ("done",):
        raise HTTPException(status_code=400, detail="Job no disponible para re-render")

    body = await request.json()
    new_caption_pos = int(body.get("caption_pos", job.get("caption_pos", 15)))

    rr_q = queue.Queue()
    rr_job_id = f"{job_id}_rr"
    jobs[rr_job_id] = {
        "queue": rr_q, "status": "processing", "output": None,
        "filename": job["filename"], "cancelled": False,
    }

    video_path = INPUT_DIR / job["filename"]

    def run_rr():
        try:
            process_video(
                video_path, DEFAULT_LANGUAGE, job.get("whisper_model", "medium"),
                progress_q=rr_q,
                caption_style=job.get("caption_style", "style1"),
                orientation=job.get("orientation", "vertical"),
                highlight_color=job.get("highlight_color", "#FFE033"),
                enable_zoom=job.get("enable_zoom", True),
                caption_pos=new_caption_pos,
                caption_font=job.get("caption_font", "outfit"),
                caption_anim=job.get("caption_anim", "default"),
                caption_case=job.get("caption_case", "lower"),
                caption_size=job.get("caption_size", 100),
                caption_stroke=job.get("caption_stroke", False),
                reuse_captions=True,
            )
            out = OUTPUT_DIR / f"{Path(video_path).stem}-captions.mp4"
            if out.exists():
                jobs[rr_job_id].update({
                    "status": "done", "output": out,
                    "project_dir": PROJECTS_DIR / Path(video_path).stem,
                })
                # Update original job so /download still works
                jobs[job_id]["output"] = out
                jobs[job_id]["caption_pos"] = new_caption_pos
            else:
                jobs[rr_job_id]["status"] = "error"
                rr_q.put("ERROR:No se generó el archivo de salida")
        except Exception as e:
            jobs[rr_job_id]["status"] = "error"
            rr_q.put(f"ERROR:{e}")

    threading.Thread(target=run_rr, daemon=True).start()
    return {"rr_job_id": rr_job_id}


@app.get("/progress-rerender/{rr_job_id}")
async def progress_rerender(rr_job_id: str):
    if rr_job_id not in jobs:
        raise HTTPException(status_code=404, detail="Re-render job no encontrado")

    def stream():
        q = jobs[rr_job_id]["queue"]
        while True:
            if jobs[rr_job_id].get("cancelled"):
                yield "data: CANCELLED\n\n"
                break
            try:
                msg = q.get(timeout=1)
                yield f"data: {msg}\n\n"
                if msg.startswith("DONE") or msg.startswith("ERROR") or msg == "CANCELLED":
                    break
            except queue.Empty:
                if jobs[rr_job_id].get("cancelled"):
                    yield "data: CANCELLED\n\n"
                    break
                yield "data: KEEPALIVE\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ── Cancelar job ─────────────────────────────────────────────────────────────

@app.post("/api/cancel/{job_id}")
async def cancel_job(job_id: str):
    """Cancela un job en curso (subtítulos o clips)."""
    if job_id in jobs:
        jobs[job_id]["cancelled"] = True
        jobs[job_id]["status"] = "cancelled"
        return {"ok": True}
    if job_id in clip_jobs:
        clip_jobs[job_id]["cancelled"] = True
        clip_jobs[job_id]["status"] = "cancelled"
        return {"ok": True}
    if job_id in trans_jobs:
        trans_jobs[job_id]["cancelled"] = True
        trans_jobs[job_id]["status"] = "cancelled"
        return {"ok": True}
    return {"ok": False, "detail": "Job no encontrado"}


# ── Settings API ─────────────────────────────────────────────────────────────

@app.get("/api/settings")
async def get_settings():
    cfg = _load_config()
    key = cfg.get("groq_api_key", os.environ.get("GROQ_API_KEY", ""))
    masked = (key[:8] + "..." + key[-4:]) if len(key) > 12 else ("•••" if key else "")
    return JSONResponse({"groq_api_key_set": bool(key), "groq_api_key_masked": masked})


@app.post("/api/settings")
async def save_settings(request: Request):
    body = await request.json()
    cfg = _load_config()
    if "groq_api_key" in body:
        new_key = str(body["groq_api_key"]).strip()
        cfg["groq_api_key"] = new_key
        # Actualizar en el proceso actual para que process_video lo vea de inmediato
        os.environ["GROQ_API_KEY"] = new_key
    _save_config(cfg)
    return JSONResponse({"ok": True})


@app.delete("/api/settings/groq_api_key")
async def delete_groq_key():
    cfg = _load_config()
    cfg.pop("groq_api_key", None)
    os.environ.pop("GROQ_API_KEY", None)
    _save_config(cfg)
    return JSONResponse({"ok": True})


# ── Audio Sync ───────────────────────────────────────────────────────────────

@app.post("/upload-sync")
async def upload_sync(
    video: UploadFile = File(...),
    audio: UploadFile = File(...),
):
    """Recibe video de cámara + grabación OBS. Detecta desfase y devuelve video sincronizado."""
    job_id = str(uuid.uuid4())[:8]
    INPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Guardar archivos con prefijo para evitar colisiones
    video_path = INPUT_DIR / f"sync_{job_id}_cam{Path(video.filename).suffix}"
    audio_path = INPUT_DIR / f"sync_{job_id}_obs{Path(audio.filename).suffix}"

    with open(video_path, "wb") as f:
        shutil.copyfileobj(video.file, f)
    with open(audio_path, "wb") as f:
        shutil.copyfileobj(audio.file, f)

    q = queue.Queue()
    sync_jobs[job_id] = {
        "queue": q, "status": "processing",
        "output_cam": None, "output_obs": None,
        "offset": None, "has_obs_video": False,
        "cancelled": False,
        "video_filename": video.filename,
    }

    def run():
        try:
            out_cam = OUTPUT_DIR / f"sync_{job_id}_{Path(video.filename).stem}_cam-synced.mp4"
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            offset, has_obs_video = sync_audio_tracks(video_path, audio_path, out_cam, progress_q=q)
            out_obs = None
            if has_obs_video:
                out_obs = OUTPUT_DIR / f"sync_{job_id}_{Path(video.filename).stem}_obs-synced.mp4"
                if not out_obs.exists():
                    out_obs = None
                    has_obs_video = False
            if out_cam.exists():
                sync_jobs[job_id].update({
                    "status": "done",
                    "output_cam": out_cam,
                    "output_obs": out_obs,
                    "offset": offset,
                    "has_obs_video": has_obs_video,
                })
                q.put(f"DONE:{out_cam.stat().st_size / 1024 / 1024:.1f}MB")
            else:
                sync_jobs[job_id]["status"] = "error"
                q.put("ERROR:No se generó el archivo sincronizado")
        except Exception as e:
            sync_jobs[job_id]["status"] = "error"
            q.put(f"ERROR:{e}")
        finally:
            try: video_path.unlink(missing_ok=True)
            except: pass
            try: audio_path.unlink(missing_ok=True)
            except: pass

    threading.Thread(target=run, daemon=True).start()
    return {"job_id": job_id}


@app.get("/progress-sync/{job_id}")
async def progress_sync(job_id: str):
    if job_id not in sync_jobs:
        raise HTTPException(status_code=404, detail="Sync job no encontrado")

    def stream():
        q = sync_jobs[job_id]["queue"]
        while True:
            if sync_jobs[job_id].get("cancelled"):
                yield "data: CANCELLED\n\n"
                break
            try:
                msg = q.get(timeout=1)
                yield f"data: {msg}\n\n"
                if msg.startswith("DONE") or msg.startswith("ERROR") or msg == "CANCELLED":
                    break
            except queue.Empty:
                if sync_jobs[job_id].get("cancelled"):
                    yield "data: CANCELLED\n\n"
                    break
                yield "data: KEEPALIVE\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/download-sync/{job_id}")
async def download_sync(job_id: str, variant: str = "cam"):
    """
    variant=cam  → vídeo cámara + audio OBS (por defecto)
    variant=obs  → vídeo pantalla OBS + audio OBS
    """
    job = sync_jobs.get(job_id)
    if not job or job["status"] != "done":
        raise HTTPException(status_code=400, detail="Video no listo")

    if variant == "obs":
        out: Path = job.get("output_obs")
        if not out or not out.exists():
            raise HTTPException(status_code=404, detail="Vídeo OBS no disponible")
    else:
        out: Path = job.get("output_cam") or job.get("output")  # compat. retrocompatibilidad
        if not out or not out.exists():
            raise HTTPException(status_code=404, detail="Vídeo no encontrado")

    return FileResponse(path=out, filename=out.name, media_type="video/mp4")


# ── Arranque ─────────────────────────────────────────────────────────────────

def _open_browser():
    time.sleep(1.8)
    webbrowser.open(f"http://localhost:{PORT}")


def _free_port(port: int):
    """Si otro proceso ocupa este puerto, lo mata. Solo Windows.

    Defensa en profundidad: si Electron mata mal, el server huérfano sigue en
    el puerto y el nuevo server falla al hacer bind. Aquí lo matamos antes.
    """
    if sys.platform != "win32":
        return
    try:
        import subprocess as _sp
        out = _sp.run(
            ["netstat", "-aon"], capture_output=True, text=True, timeout=5,
        ).stdout or ""
        pids = set()
        for line in out.splitlines():
            if f":{port}" not in line or "LISTENING" not in line:
                continue
            pid = line.strip().split()[-1]
            if pid.isdigit() and pid != "0":
                pids.add(pid)
        my_pid = str(os.getpid())
        for pid in pids - {my_pid}:
            print(f"  [server] Matando proceso huérfano PID {pid} en puerto {port}")
            try:
                _sp.run(["taskkill", "/F", "/PID", pid], timeout=5,
                        stdout=_sp.DEVNULL, stderr=_sp.DEVNULL)
            except Exception:
                pass
        if pids - {my_pid}:
            time.sleep(0.5)   # esperar a que el SO libere el puerto
    except Exception as e:
        print(f"  [server] Aviso: no se pudo liberar puerto: {e}")


if __name__ == "__main__":
    # Liberar puerto antes de hacer bind (huérfanos de sesiones anteriores)
    _free_port(PORT)

    print(f"\n  Auto Captions corriendo en http://localhost:{PORT}\n")
    # Sólo abrir navegador cuando se ejecuta manualmente (no bajo Electron)
    # APP_WORKSPACE es seteada por Electron; si está presente, Electron gestiona la ventana
    if not os.environ.get("APP_WORKSPACE"):
        threading.Thread(target=_open_browser, daemon=True).start()
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="warning")
