@echo off
title App MyQ - Desktop Launcher
echo ========================================================
echo                 MEMULAI APP MYQ (DESKTOP)
echo ========================================================
echo.
echo Menjalankan aplikasi desktop Windows App MyQ...
cd /d "%~dp0"
call npm run desktop
if %errorlevel% neq 0 (
    echo.
    echo Gagal membuka mode desktop, beralih ke mode browser lokal...
    start http://localhost:3000
    call npm run web
)
pause
