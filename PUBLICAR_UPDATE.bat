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
set /p NEW_VER= Nueva version (ej: 1.0.1 / 1.1.0):

if "%NEW_VER%"=="" (
    echo  ERROR: Debes introducir una version.
    pause
    exit /b 1
)

echo.
echo  [1/4] Actualizando version a %NEW_VER%...
powershell -Command "(Get-Content package.json) -replace '\"version\": \"%CURRENT_VER%\"', '\"version\": \"%NEW_VER%\"' | Set-Content package.json"

echo  [2/4] Subiendo cambios a GitHub...
git add -A
git commit -m "Release v%NEW_VER%"
git push origin main

echo  [3/4] Construyendo instalador y publicando release...
echo       (Esto puede tardar varios minutos...)
npm run release

echo.
echo  =====================================================
echo   Listo! Version %NEW_VER% publicada en GitHub.
echo   Tus usuarios la recibiran automaticamente.
echo  =====================================================
echo.
pause
