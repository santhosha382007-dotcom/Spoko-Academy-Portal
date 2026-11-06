@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo --------------------------------------------------
echo SPOKO PORTAL - DATABASE SERVER
echo --------------------------------------------------
echo.

if not exist "C:\Program Files\nodejs\node.exe" (
    echo [ERROR] Node.js not found at C:\Program Files\nodejs
    pause
    exit
)

echo [OK] Node.js found.

:: Detect IP Address
set "MYIP=localhost"
for /f "tokens=4" %%a in ('route print ^| find " 0.0.0.0"') do (
    set "MYIP=%%a"
)

echo [INFO] Detected Network IP: %MYIP%
echo [INFO] Starting Database on http://%MYIP%:3001...
echo.

:: Use 0.0.0.0 to bind to all network interfaces, with security middleware
call npx.cmd --yes json-server@0.17.4 --watch "db.json" --port 3001 --host 0.0.0.0 --middlewares backend/security-middleware.cjs

if %errorlevel% neq 0 (
    echo.
    echo [CRITICAL ERROR] The database failed to start!
    echo.
    echo 1. Check if another program is using port 3001.
    echo 2. Check your Script Execution Policy.
    echo.
    pause
)
pause
