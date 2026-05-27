@echo off
cd /d "%~dp0"

echo.
echo  SnufkinStudio — Modo desarrollo Electron
echo  (El servidor Python se arranca automáticamente)
echo.

:: Verificar que electron esté instalado
if not exist "node_modules\.bin\electron.cmd" (
  echo [+] Instalando dependencias npm...
  call npm install
  if errorlevel 1 pause && exit /b 1
)

:: Arrancar Electron (que arranca Python internamente)
npx electron .
