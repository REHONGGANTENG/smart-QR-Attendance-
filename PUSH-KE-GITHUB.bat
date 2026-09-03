@echo off
cd /d "%~dp0"
title Push ke GitHub - Smart QR Attendance
cls
color 0b

echo ================================================================
echo               PUSH PERUBAHAN KE GITHUB
echo ================================================================
echo.
echo Repositori: https://github.com/REHONGGANTENG/smart-QR-Attendance-
echo.

:: Build frontend dulu jika ada perubahan UI
echo [1/3] Menyiapkan build frontend...
cmd.exe /c "npm --prefix client run build"

:: Tambahkan semua file perubahan
echo [2/3] Menambahkan file yang diedit ke Git...
git add .

:: Minta pesan commit atau gunakan default
set /p commit_msg="Masukkan pesan commit (tekan Enter untuk default 'update'): "
if "%commit_msg%"=="" set commit_msg=update aplikasi

git commit -m "%commit_msg%"

:: Push ke GitHub
echo.
echo [3/3] Mengunggah (push) ke GitHub...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================================
    echo [BERHASIL] Seluruh kode terbaru berhasil di-upload ke GitHub!
    echo Cek di: https://github.com/REHONGGANTENG/smart-QR-Attendance-
    echo ================================================================
) else (
    echo.
    echo [PERINGATAN] Gagal melakukan push. Pastikan koneksi internet aktif.
)

echo.
pause
