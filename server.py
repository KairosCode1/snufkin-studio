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
from auto_captions import OUTPUT_DIR, INPUT_DIR, PROJECTS_DIR

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
jobs:      dict = {}   # subtítulos: job_id → {queue, status, output, filename}
clip_jobs: dict = {}   # auto clips: job_id → {queue, status, clips, filename}


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
):
    job_id = str(uuid.uuid4())[:8]
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    video_path = INPUT_DIR / file.filename
    with open(video_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    q = queue.Queue()
    jobs[job_id] = {"queue": q, "status": "processing", "output": None, "filename": file.filename}

    def run():
        try:
            process_video(video_path, DEFAULT_LANGUAGE, whisper_model, progress_q=q,
                          caption_style=caption_style, orientation=orientation,
                          highlight_color=highlight_color)
            out = OUTPUT_DIR / f"{video_path.stem}-captions.mp4"
            if out.exists():
                jobs[job_id].update({"status": "done", "output": out})
            else:
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
            try:
                msg = q.get(timeout=300)
                yield f"data: {msg}\n\n"
                if msg.startswith("DONE") or msg.startswith("ERROR"):
                    break
            except queue.Empty:
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
):
    job_id = str(uuid.uuid4())[:8]
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    video_path = INPUT_DIR / file.filename
    with open(video_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    q = queue.Queue()
    clip_jobs[job_id] = {"queue": q, "status": "processing", "clips": [], "filename": file.filename}

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
            try:
                msg = q.get(timeout=600)
                yield f"data: {msg}\n\n"
                if msg.startswith("CDONE") or msg.startswith("ERROR"):
                    break
            except queue.Empty:
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


# ── Arranque ─────────────────────────────────────────────────────────────────

def _open_browser():
    time.sleep(1.8)
    webbrowser.open(f"http://localhost:{PORT}")


if __name__ == "__main__":
    print(f"\n  Auto Captions corriendo en http://localhost:{PORT}\n")
    # Sólo abrir navegador cuando se ejecuta manualmente (no bajo Electron)
    # APP_WORKSPACE es seteada por Electron; si está presente, Electron gestiona la ventana
    if not os.environ.get("APP_WORKSPACE"):
        threading.Thread(target=_open_browser, daemon=True).start()
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="warning")
