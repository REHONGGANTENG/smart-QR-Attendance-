@echo off
cd /d "%~dp0"
title Smart QR Attendance System
cls
color 0b

echo ================================================================
echo               SMART QR ATTENDANCE SYSTEM
echo ================================================================
echo.
echo  [✓] Membuka browser ke: http://localhost:5000
echo  [✓] PIN Admin Bawaan : admin123
echo.
echo  CATATAN:
echo  - JANGAN TUTUP jendela hitam ini selama aplikasi sedang dipakai.
echo  - Untuk menghentikan aplikasi, cukup tutup jendela ini.
echo ================================================================
echo.

:: Buka browser secara otomatis
start http://localhost:5000

:: Jalankan server backend & database
node server/index.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ----------------------------------------------------------------
    echo  Server sudah aktif berjalan di latar belakang.
    echo  Silakan langsung gunakan aplikasi di browser:
    echo  http://localhost:5000
    echo ----------------------------------------------------------------
    echo.
    pause
)
