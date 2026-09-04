@echo off
title App MyQ - Web Launcher
echo ========================================================
echo                 MEMULAI APP MYQ (MODE WEB)
echo ========================================================
echo.
echo Membuka browser default di http://localhost:3000 ...
cd /d "%~dp0"
start http://localhost:3000
call npm run web
pause
