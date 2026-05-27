@echo off
chcp 65001 >nul
title Auto Captions - Esperando videos...
cd /d "%~dp0"
echo Arrancando...
python auto_captions.py --model medium
echo.
echo Script finalizado. Ver auto_captions.log para detalles.
pause
