@echo off
title SnufkinStudio — Publicar Actualizacion
echo.
echo  =====================================================
echo   SnufkinStudio — Publicar nueva version
echo  =====================================================
echo.

REM Leer version actual
for /f "tokens=2 delims=:, " %%v in ('findstr "\"version\"" package.json') do (
    set CURRENT_VER=%%~v
    goto :got_ver
)
:got_ver

echo  Version actual: %CURRENT_VER%
echo.
set /p NEW_VER= Nueva version (ej: 1.1.8 / 1.2.0):

if "%NEW_VER%"=="" (
    echo  ERROR: Debes introducir una version.
    pause
    exit /b 1
)

echo.
set /p REBUILD_SERVER= Recompilaste Python (auto_captions.py / server.py)? [s/N]:
if /i "%REBUILD_SERVER%"=="s" goto :do_rebuild
if /i "%REBUILD_SERVER%"=="S" goto :do_rebuild
goto :skip_rebuild

:do_rebuild
echo.
echo  [1/5] Recompilando server.exe con PyInstaller...
echo        (Esto puede tardar 2-5 minutos...)
python -m PyInstaller build/build_backend.spec --distpath dist/server --workpath build/pyinstaller_work --noconfirm
if errorlevel 1 (
    echo  ERROR: Fallo al compilar server.exe. Revisa los errores de arriba.
    pause
    exit /b 1
)
echo  [OK] server.exe recompilado.
goto :continue

:skip_rebuild
echo  [!] Saltando recompilacion de server.exe.
goto :continue

:continue
echo.
echo  [2/5] Actualizando version a %NEW_VER%...
powershell -Command "(Get-Content package.json) -replace '\"version\": \"%CURRENT_VER%\"', '\"version\": \"%NEW_VER%\"' | Set-Content package.json"

echo  [3/5] Subiendo cambios a GitHub...
git add -A
git commit -m "Release v%NEW_VER%"
git push origin main

echo  [4/5] Construyendo instalador y publicando release...
echo        (Esto puede tardar varios minutos...)
npm run release

echo.
echo  [5/5] Actualizando acceso directo del escritorio...
REM Eliminar instaladores viejos con nombre de version en el escritorio
for %%f in ("%USERPROFILE%\Desktop\SnufkinStudio Setup *.exe") do del /f /q "%%f" 2>nul
for %%f in ("%USERPROFILE%\Desktop\SnufkinStudio-Setup-*.exe") do del /f /q "%%f" 2>nul
REM Copiar el script instalador inteligente al escritorio (siempre apunta a latest)
if exist "%~dp0scripts\Instalar SnufkinStudio.bat" (
    copy /y "%~dp0scripts\Instalar SnufkinStudio.bat" "%USERPROFILE%\Desktop\Instalar SnufkinStudio.bat" >nul
    echo  [OK] Acceso directo del escritorio actualizado.
) else (
    echo  [!] Script instalador no encontrado en scripts\ - escritorio no actualizado.
)

echo.
echo  =====================================================
echo   Listo! Version %NEW_VER% publicada en GitHub.
echo   Los usuarios ya instalados se actualizan solos.
echo   Nuevos usuarios: usa "Instalar SnufkinStudio.bat"
echo  =====================================================
echo.
pause
