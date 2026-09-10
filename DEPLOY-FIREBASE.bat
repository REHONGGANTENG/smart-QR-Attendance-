@echo off
cd /d "%~dp0"
title Deploy ke Firebase Hosting - Smart QR Attendance
cls
color 0e

echo ================================================================
echo           DEPLOY SMART QR ATTENDANCE KE FIREBASE HOSTING
echo ================================================================
echo.
echo [1/3] Menyiapkan dan mem-build frontend (client/dist)...
cmd.exe /c "npm --prefix client run build"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Gagal mem-build frontend. Periksa kesalahan di atas.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Memeriksa login Firebase...
echo Jika belum login, browser akan terbuka untuk login akun Google Firebase Anda.
cmd.exe /c "npx firebase login"

echo.
echo [3/3] Mengunggah (deploy) ke Firebase Hosting...
cmd.exe /c "npx firebase deploy --only hosting"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================================
    echo [BERHASIL] Website absensi Anda sudah aktif online di Firebase!
    echo Lengkap dengan HTTPS otomatis untuk kamera HP.
    echo ================================================================
) else (
    echo.
    echo [PERHATIAN] Gagal deploy. Pastikan Anda sudah membuat project di Firebase Console.
)

echo.
pause
