@echo off
title Spoko Academy Network Diagnostics
echo Checking Network Status...
echo ---------------------------------
echo 1. Checking if Node.js is installed...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
) else (
    echo [OK] Node.js is installed.
)

echo 2. Checking IP Address...
for /f "tokens=4" %%a in ('route print ^| find " 0.0.0.0"') do (
    set "MYIP=%%a"
)
echo Your Network IP is roughly: %MYIP%
ipconfig | findstr /i "IPv4"

echo 3. Checking if Website (Port 5173) is listening...
netstat -ano | findstr :5173 >nul
if %errorlevel% neq 0 (
    echo [CRITICAL] Website is NOT running. Please run start_website.bat
) else (
    echo [OK] Website is running and listening.
)

echo 4. Checking if Database (Port 3001) is listening...
netstat -ano | findstr :3001 >nul
if %errorlevel% neq 0 (
    echo [CRITICAL] Database is NOT running. Please run start_database.bat
) else (
    echo [OK] Database is running and listening.
)

echo 5. Firewall Status Check...
netsh advfirewall show currentprofile state

echo ---------------------------------
echo If you see [CRITICAL], please restart your .bat files.
echo If both are [OK] but you still can't connect on your phone:
echo 1. Run "fix_firewall.bat" as Administrator.
echo 2. Use this URL on your phone: http://%MYIP%:5173
echo 3. Make sure both devices are on the SAME Wi-Fi.
echo ---------------------------------
pause
