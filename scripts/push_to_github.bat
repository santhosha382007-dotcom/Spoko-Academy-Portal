@echo off
title Push Spoko Portal to GitHub
cd /d "%~dp0"
echo ========================================================
echo Pushing Spoko Portal to GitHub:
echo https://github.com/santhosha382007-dotcom/Spoko-Portal.git
echo ========================================================
echo.
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo [SUCCESS] Code pushed to GitHub successfully!
) else (
    echo [NOTICE] If prompted, sign in via browser or enter your GitHub credentials.
)
echo.
pause
