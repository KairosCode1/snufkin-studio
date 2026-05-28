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
        # Incluir modelos de Whisper pre-descargados si existen en ~/.cache
        # (el usuario debe haberlos descargado al menos una vez antes del build)
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

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
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

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='server',
)
