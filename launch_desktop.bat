@echo off
setlocal
echo ============================================================
echo   THE STASH DESKTOP - LAUNCHER
echo ============================================================
echo.

set EXE_PATH=%~dp0desktop\dist\the stash desktop-win32-x64\the stash desktop.exe

if exist "%EXE_PATH%" (
    echo Starting the stash desktop...
    start "" "%EXE_PATH%"
) else (
    echo [ERROR] Compiled desktop executable not found!
    echo Please run build_desktop.bat first to compile the application.
    echo.
    pause
)
