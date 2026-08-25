@echo off
title The Stash - Unified Local Companion Server
color 0A

echo ================================================================
echo   THE STASH - UNIFIED COMPANION SERVER (PORT 7860)
echo   Hardware Acceleration: RTX 4060 ^& Ryzen 5 5600G
echo   Modules: Clarify (AI Upscale) + FetchFlow (yt-dlp Engine)
echo ================================================================
echo.

:: Check Python installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found! Please install Python 3.9+ from python.org
    pause
    exit /b
)

:: Install yt-dlp python package if available
pip install yt-dlp >nul 2>&1

:: Start Unified Server
echo [INFO] Starting Companion Server on http://127.0.0.1:7860 ...
echo.
python server\companion_server.py

pause
