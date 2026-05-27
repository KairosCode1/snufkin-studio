@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0.."

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║     SnufkinStudio — Build completo para Windows     ║
echo ╚══════════════════════════════════════════════════════╝
echo.

:: ── Verificar herramientas necesarias ────────────────────────────────────────
echo [CHECK] Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Python no encontrado. Instala Python 3.10+ y añádelo al PATH.
  goto :error
)

echo [CHECK] Verificando Node.js (para Electron)...
node --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js no encontrado. Instala Node.js 18+ desde https://nodejs.org
  goto :error
)

echo [CHECK] Verificando pip...
python -m pip --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] pip no encontrado.
  goto :error
)

:: ── Paso 1: Descargar herramientas externas (FFmpeg + Node portable) ─────────
echo.
echo [PASO 1/5] Descargando herramientas externas...
call build\download_tools.bat
if errorlevel 1 goto :error

:: ── Paso 2: Instalar dependencias Python ─────────────────────────────────────
echo.
echo [PASO 2/5] Instalando dependencias Python...
python -m pip install pyinstaller fastapi uvicorn faster-whisper groq watchdog aiofiles python-multipart --quiet
if errorlevel 1 goto :error
echo [OK] Dependencias Python instaladas.

:: ── Paso 3: Compilar backend con PyInstaller ─────────────────────────────────
echo.
echo [PASO 3/5] Compilando backend Python con PyInstaller...
echo     (esto puede tardar 2-5 minutos la primera vez)

:: Limpiar build anterior
rmdir /s /q "dist\server" 2>nul
rmdir /s /q "build\pyinstaller_work" 2>nul

python -m PyInstaller build\build_backend.spec ^
  --distpath dist\server ^
  --workpath build\pyinstaller_work ^
  --noconfirm

if errorlevel 1 (
  echo [ERROR] PyInstaller falló. Revisa los logs arriba.
  goto :error
)
echo [OK] Backend compilado en dist\server\server\

:: ── Paso 4: Instalar dependencias npm (Electron) ─────────────────────────────
echo.
echo [PASO 4/5] Instalando dependencias npm...
call npm install
if errorlevel 1 goto :error
echo [OK] Dependencias npm instaladas.

:: ── Paso 5: Construir el instalador Electron ─────────────────────────────────
echo.
echo [PASO 5/5] Construyendo instalador Windows (.exe)...
echo     (esto puede tardar 3-8 minutos)
call npm run build
if errorlevel 1 (
  echo [ERROR] electron-builder falló. Revisa los logs arriba.
  goto :error
)

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║             BUILD COMPLETADO CON ÉXITO              ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo   Instalador listo en:  dist\SnufkinStudio Setup X.X.X.exe
echo.

explorer dist
exit /b 0

:error
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║                    BUILD FALLIDO                    ║
echo ╚══════════════════════════════════════════════════════╝
echo.
pause
exit /b 1
