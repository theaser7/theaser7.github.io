@echo off
chcp 65001 > nul
title Clarify AI Companion Server (RTX 4060 Accelerated)
cls
echo ================================================================
echo   Clarify AI Photo Upscaler - Local Companion Server
echo   Hardware Acceleration via Real-ESRGAN NCNN Vulkan
echo   Zero-Bloat • 100%% Local & Private • NVIDIA RTX 4060 Ready
echo ================================================================
echo.

python server.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Python not found or server exited with code %ERRORLEVEL%
    echo Please make sure Python is installed.
)
pause
