@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo --------------------------------------------------
echo SPOKO PORTAL - WEBSITE SERVER
echo --------------------------------------------------
echo.

:: Detect IP Address
set "MYIP=localhost"
for /f "tokens=4" %%a in ('route print ^| find " 0.0.0.0" ^| findstr /v "127.0.0.1"') do (
    set "MYIP=%%a"
)

:: Fallback to ipconfig if route print didn't give a clear external IP
if "%MYIP%"=="localhost" (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4 Address" ^| findstr "10. 192. 172."') do (
        set "tempip=%%a"
        set "MYIP=!tempip:~1!"
    )
)

echo [INFO] Website Port: 5173
echo [INFO] Local Access: http://localhost:5173
echo [INFO] Mobile Access: http://%MYIP%:5173
echo.
echo [HELP] If http://%MYIP%:5173 times out on your phone:
echo 1. Ensure your phone is on the SAME Wi-Fi network.
echo 2. Run "fix_firewall.bat" as Administrator to open ports.
echo 3. Ensure your Wi-Fi is set to "Private" not "Public".
echo.
echo [INFO] IMPORTANT: Do NOT close this window!
echo.

call npm.cmd run dev

if %errorlevel% neq 0 (
    echo.
    echo [CRITICAL ERROR] The website failed to start!
    echo.
    echo 1. Ensure you have run "npm install" at least once.
    echo 2. Check if another program is using port 5173.
    echo.
    pause
)
pause
