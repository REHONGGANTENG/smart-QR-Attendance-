@echo off
cd /d "%~dp0"
title update tampilan 
cls
color 0a

echo ================================================================
echo           MEMPERBARUI TAMPILAN (REBUILD FRONTEND)
echo ================================================================
echo.
echo Sedang menerapkan perubahan teks/kode yang Anda edit di VS Code...
echo.

cmd.exe /c "npm --prefix client run build"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUKSES] Perubahan berhasil diterapkan!
    echo Silakan refresh browser Anda (F5 atau Ctrl+R) di http://localhost:5000
    echo ================================================================
) else (
    echo.
    echo [ERROR] Terjadi kesalahan saat build. Periksa sintaks kode di VS Code.
)

echo.
pause
