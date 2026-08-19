@echo off
title Nusantara Traffic Vision - CCTV AI Platform
color 0b
echo ====================================================
echo   NUSANTARA TRAFFIC VISION - SURVEILLANCE PRO
echo   Edge AI Computer Vision & Multi-City ATCS CCTV
echo ====================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan! Silakan install Node.js dari https://nodejs.org/
    pause
    exit /b
)

echo [OK] Membuka browser pada http://localhost:3000
start http://localhost:3000

echo [START] Menjalankan Backend API & Frontend UI...
echo [HINT] Tekan Ctrl+C untuk menghentikan server.
echo.
node server.js
pause
