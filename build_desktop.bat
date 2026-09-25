@echo off
setlocal
echo ============================================================
echo   THE STASH DESKTOP - COMPILER & PACKAGER
echo ============================================================
echo.

set PATH=C:\Program Files\nodejs;%PATH%

cd /d "%~dp0desktop"

echo [1/3] Verifying Node.js and NPM environment...
node -v || (echo [ERROR] Node.js is required to compile Electron executable! & pause & exit /b 1)

echo [2/3] Installing/verifying desktop dependencies...
call npm install --no-audit --no-fund

echo [3/3] Compiling and packaging "the stash desktop" into Windows x64 .exe...
call npm run package

echo.
echo ============================================================
echo   BUILD COMPLETE!
echo   Executable generated at:
echo   desktop\dist\the stash desktop-win32-x64\the stash desktop.exe
echo ============================================================
echo.
pause
