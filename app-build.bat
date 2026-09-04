@echo off
title App MyQ - Build Installer & Portable .EXE
echo ========================================================
echo           MEMBUAT INSTALLER SOFTWARE APP MYQ (.EXE)
echo ========================================================
echo.
echo Menutup proses App MyQ yang sedang berjalan (agar file lama bisa di-replace)...
taskkill /F /IM "App MyQ.exe" /T >nul 2>&1
taskkill /F /IM "App MyQ 1.0.0.exe" /T >nul 2>&1
echo.
echo Sedang memproses kompilasi menjadi file Setup.exe dan Portable.exe...
echo File lama di folder dist\ akan otomatis di-replace dengan versi terbaru.
echo Mohon tunggu 1-2 menit hingga proses selesai.
echo.
cd /d "%~dp0"
call npm run build:exe
echo.
if %errorlevel% equ 0 (
    echo ========================================================
    echo  SUKSES! File .exe terbaru telah berhasil dibuat & di-replace!
    echo  Lokasi file: folder dist\
    echo ========================================================
    explorer dist
) else (
    echo Ada kendala saat membuild installer.
)
pause
