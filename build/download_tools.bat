@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0.."

echo.
echo ═══════════════════════════════════════════════════════
echo   SnufkinStudio — Descargando herramientas externas
echo ═══════════════════════════════════════════════════════
echo.

:: ── Paths ────────────────────────────────────────────────────────────────────
set TOOLS_DIR=%CD%\resources\tools
set NODE_DIR=%TOOLS_DIR%\node
set TEMP_DIR=%CD%\build\tmp

mkdir "%TOOLS_DIR%" 2>nul
mkdir "%NODE_DIR%"  2>nul
mkdir "%TEMP_DIR%"  2>nul

:: ════════════════════════════════════════════════════════════════════════════
:: 1. FFmpeg portable (versión estática de gyan.dev)
:: ════════════════════════════════════════════════════════════════════════════
if exist "%TOOLS_DIR%\ffmpeg.exe" (
  echo [OK] ffmpeg.exe ya existe, omitiendo descarga.
) else (
  echo [1/4] Descargando FFmpeg...
  set FFMPEG_URL=https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip
  set FFMPEG_ZIP=%TEMP_DIR%\ffmpeg.zip

  :: Usar PowerShell para descargar
  powershell -NoProfile -Command "Invoke-WebRequest -Uri '%FFMPEG_URL%' -OutFile '%FFMPEG_ZIP%' -UseBasicParsing"
  if errorlevel 1 (
    echo [ERROR] No se pudo descargar FFmpeg. Comprueba tu conexión a internet.
    goto :error
  )

  echo [2/4] Extrayendo FFmpeg...
  powershell -NoProfile -Command "Expand-Archive -Path '%FFMPEG_ZIP%' -DestinationPath '%TEMP_DIR%\ffmpeg_extracted' -Force"
  if errorlevel 1 goto :error

  :: Buscar ffmpeg.exe dentro del zip extraído (está dentro de una subcarpeta)
  for /r "%TEMP_DIR%\ffmpeg_extracted" %%F in (ffmpeg.exe) do (
    copy "%%F" "%TOOLS_DIR%\ffmpeg.exe" >nul
  )
  for /r "%TEMP_DIR%\ffmpeg_extracted" %%F in (ffprobe.exe) do (
    copy "%%F" "%TOOLS_DIR%\ffprobe.exe" >nul
  )

  if not exist "%TOOLS_DIR%\ffmpeg.exe" (
    echo [ERROR] No se encontró ffmpeg.exe en el zip descargado.
    goto :error
  )
  echo [OK] FFmpeg extraído correctamente.
  del "%FFMPEG_ZIP%" 2>nul
  rmdir /s /q "%TEMP_DIR%\ffmpeg_extracted" 2>nul
)

:: ════════════════════════════════════════════════════════════════════════════
:: 2. Node.js portable (zip oficial de nodejs.org)
:: ════════════════════════════════════════════════════════════════════════════
if exist "%NODE_DIR%\node.exe" (
  echo [OK] Node.js ya existe, omitiendo descarga.
) else (
  echo [3/4] Descargando Node.js portable...
  set NODE_VER=20.14.0
  set NODE_URL=https://nodejs.org/dist/v!NODE_VER!/node-v!NODE_VER!-win-x64.zip
  set NODE_ZIP=%TEMP_DIR%\node.zip

  powershell -NoProfile -Command "Invoke-WebRequest -Uri '!NODE_URL!' -OutFile '!NODE_ZIP!' -UseBasicParsing"
  if errorlevel 1 (
    echo [ERROR] No se pudo descargar Node.js.
    goto :error
  )

  echo [4/4] Extrayendo Node.js...
  powershell -NoProfile -Command "Expand-Archive -Path '!NODE_ZIP!' -DestinationPath '%TEMP_DIR%\node_extracted' -Force"
  if errorlevel 1 goto :error

  :: Mover contenido de la carpeta node-vXX.XX.XX-win-x64 a NODE_DIR
  for /d %%D in ("%TEMP_DIR%\node_extracted\node-v*") do (
    xcopy "%%D\*" "%NODE_DIR%\" /e /i /q >nul
  )

  if not exist "%NODE_DIR%\node.exe" (
    echo [ERROR] No se encontró node.exe tras extraer.
    goto :error
  )
  echo [OK] Node.js extraído correctamente.
  del "!NODE_ZIP!" 2>nul
  rmdir /s /q "%TEMP_DIR%\node_extracted" 2>nul
)

:: ════════════════════════════════════════════════════════════════════════════
:: 3. Instalar hyperframes con el Node.js portátil
:: ════════════════════════════════════════════════════════════════════════════
if exist "%NODE_DIR%\node_modules\hyperframes" (
  echo [OK] hyperframes ya instalado.
) else (
  echo [+] Instalando hyperframes con npm...
  set PATH=%NODE_DIR%;%PATH%

  :: Instalar localmente en NODE_DIR/node_modules para que npx lo encuentre
  "%NODE_DIR%\npm.cmd" install hyperframes --prefix "%NODE_DIR%" --no-audit --no-fund --loglevel=warn
  if errorlevel 1 (
    echo [WARN] npm install falló. hyperframes se instalará automáticamente en el primer uso (requiere internet).
  ) else (
    echo [OK] hyperframes instalado.
  )
)

:: ════════════════════════════════════════════════════════════════════════════
:: Limpieza
:: ════════════════════════════════════════════════════════════════════════════
rmdir /s /q "%TEMP_DIR%" 2>nul

echo.
echo ═══════════════════════════════════════════════════════
echo   Herramientas listas en: resources\tools\
echo ═══════════════════════════════════════════════════════
echo.
exit /b 0

:error
echo.
echo [ERROR] Descarga fallida. Comprueba tu conexión y vuelve a ejecutar.
exit /b 1
