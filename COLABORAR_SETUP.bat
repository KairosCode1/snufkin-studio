@echo off
title SnufkinStudio — Setup Colaborador
echo.
echo  =====================================================
echo   SnufkinStudio — Configuracion de colaborador
echo  =====================================================
echo.

REM ── Comprobar Node.js ─────────────────────────────────
node -v >nul 2>&1
if errorlevel 1 (
    echo  [!] Node.js NO encontrado.
    echo      Descargalo de https://nodejs.org ^(version LTS^)
    echo      Despues vuelve a ejecutar este script.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER%

REM ── Comprobar Git ─────────────────────────────────────
git --version >nul 2>&1
if errorlevel 1 (
    echo  [!] Git NO encontrado.
    echo      Descargalo de https://git-scm.com/download/win
    echo      Despues vuelve a ejecutar este script.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('git --version') do set GIT_VER=%%v
echo  [OK] %GIT_VER%

echo.
echo  ─────────────────────────────────────────────────────
echo   PASO 1: Token de GitHub
echo  ─────────────────────────────────────────────────────
echo.
echo  Necesitas un token de GitHub para publicar versiones.
echo.
echo  Instrucciones:
echo   1. Ve a: https://github.com/settings/tokens/new
echo   2. Note: SnufkinStudio releases
echo   3. Expiration: No expiration
echo   4. Marca: repo (el bloque completo)
echo   5. Clic en "Generate token"
echo   6. Copia el token (empieza por ghp_...)
echo.
set /p GH_TOKEN_INPUT= Pega aqui tu token de GitHub (ghp_...):

if "%GH_TOKEN_INPUT%"=="" (
    echo  ERROR: Token vacio. Saliendo.
    pause
    exit /b 1
)

echo  Guardando token en variables de entorno de Windows...
setx GH_TOKEN "%GH_TOKEN_INPUT%"
echo  [OK] GH_TOKEN guardado permanentemente.

echo.
echo  ─────────────────────────────────────────────────────
echo   PASO 2: Clonar repositorio
echo  ─────────────────────────────────────────────────────
echo.

set CLONE_DIR=%USERPROFILE%\Desktop\snufkin-studio

if exist "%CLONE_DIR%\" (
    echo  La carpeta ya existe: %CLONE_DIR%
    echo  Actualizando con git pull...
    cd /d "%CLONE_DIR%"
    git pull origin main
) else (
    echo  Clonando en el Escritorio...
    git clone https://github.com/KairosCode1/snufkin-studio.git "%CLONE_DIR%"
    cd /d "%CLONE_DIR%"
)

echo.
echo  ─────────────────────────────────────────────────────
echo   PASO 3: Instalar dependencias
echo  ─────────────────────────────────────────────────────
echo.
npm install
echo  [OK] Dependencias instaladas.

echo.
echo  ─────────────────────────────────────────────────────
echo   Configurar nombre y email en Git
echo  ─────────────────────────────────────────────────────
echo.
set /p GIT_NAME= Tu nombre (para los commits):
set /p GIT_EMAIL= Tu email de GitHub:

git config --global user.name "%GIT_NAME%"
git config --global user.email "%GIT_EMAIL%"
echo  [OK] Git configurado como: %GIT_NAME% ^<%GIT_EMAIL%^>

echo.
echo  =====================================================
echo   Configuracion completada!
echo.
echo   Carpeta del proyecto: %CLONE_DIR%
echo.
echo   Para hacer cambios:
echo     1. Abre Claude Code en esa carpeta
echo     2. Pide a Claude los cambios
echo     3. Ejecuta PUBLICAR_UPDATE.bat con la nueva version
echo.
echo   IMPORTANTE: Cierra y vuelve a abrir cualquier
echo   terminal para que el GH_TOKEN tenga efecto.
echo  =====================================================
echo.
pause
