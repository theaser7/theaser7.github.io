@echo off
setlocal
echo ============================================================
echo   THE STASH - DEPLOY TO VPS (SFTP)
echo ============================================================
echo.
python .github/scripts/deploy_sftp.py
echo.
pause
