# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec para server.py (auto-captions backend)
# Ejecutar desde la raíz del proyecto:
#   pyinstaller build/build_backend.spec --distpath dist/server --workpath build/pyinstaller_work

import sys
from pathlib import Path

ROOT = Path(SPECPATH).parent  # directorio raíz del proyecto

a = Analysis(
    [str(ROOT / 'server.py')],
    pathex=[str(ROOT)],
    binaries=[],
    datas=[
        # Nada de static/ aquí — Electron copia static/ como extraResource
        # faster_whisper assets (silero VAD model requerido en runtime)
        (__import__('faster_whisper').__path__[0] + '/assets', 'faster_whisper/assets'),
    ],
    hiddenimports=[
        # FastAPI / uvicorn
        'uvicorn.logging',
        'uvicorn.lifespan.off',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.wsproto_impl',
        'uvicorn.loops.auto',
        'uvicorn.loops.asyncio',
        # faster_whisper
        'faster_whisper',
        'ctranslate2',
        'huggingface_hub',
        'tokenizers',
        # groq
        'groq',
        'httpx',
        'httpcore',
        'anyio',
        # starlette
        'starlette.routing',
        'starlette.middleware',
        'starlette.staticfiles',
        'starlette.responses',
        # other
        'aiofiles',
        'multipart',
        'email.mime.multipart',
        'email.mime.text',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter', 'matplotlib', 'PIL', 'cv2',
        'numpy.testing', 'scipy', 'pandas',
        # Exclude PyTorch -- faster_whisper uses ctranslate2, not torch
        'torch', 'torchvision', 'torchaudio',
        'torch.distributed', 'torch.utils', 'torch.nn',
        # Exclude other heavy ML stuff not needed at runtime
        'numba', 'llvmlite',
        # Exclude jupyter/IPython
        'IPython', 'jupyter', 'notebook',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=None)

# ── Onefile: todo empaquetado en un único server.exe ─────────────────────────
# Ventaja: NSIS instala 1 archivo en vez de ~500 → Windows Defender lo escanea
# una sola vez → instalación en 20-30 s en vez de 2 minutos.
# Coste: PyInstaller extrae a %TEMP% en cada arranque (~3-10 s, absorbido por
# la pantalla de carga de Electron que ya dura 4.5 s mínimo).
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,    # incluir binarios en el .exe (no en carpeta _internal/)
    a.zipfiles,
    a.datas,
    # exclude_binaries=True → NO (eso es para onedir con COLLECT)
    name='server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,         # no black window in production
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
# Sin COLLECT: onefile no necesita agrupar en directorio
