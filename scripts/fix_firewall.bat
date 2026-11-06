@echo off
:: This script must be run as Administrator to work.
:: It opens ports 5173 (website) and 3001 (database) in the Windows Firewall.

echo --------------------------------------------------
echo SPOKO PORTAL - FIREWALL FIX
echo --------------------------------------------------
echo.

:: Check for Administrative privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] This script MUST be run as ADMINISTRATOR.
    echo.
    echo Right-click this file and select "Run as administrator".
    pause
    exit /b
)

echo [INFO] Adding Firewall rules for Spoko Portal...

:: Add rule for Website (Vite)
netsh advfirewall firewall add rule name="Spoko Website" dir=in action=allow protocol=TCP localport=5173 profile=any
if %errorlevel% equ 0 (
    echo [OK] Port 5173 (Website) is now open.
) else (
    echo [FAILED] Could not add rule for port 5173.
)

:: Add rule for Database (JSON Server)
netsh advfirewall firewall add rule name="Spoko Database" dir=in action=allow protocol=TCP localport=3001 profile=any
if %errorlevel% equ 0 (
    echo [OK] Port 3001 (Database) is now open.
) else (
    echo [FAILED] Could not add rule for port 3001.
)

echo.
echo [DONE] Firewall rules have been added.
echo Please restart your website and database servers, then try again on your phone.
echo.

:: Detect and show IP again for convenience
set "MYIP=localhost"
for /f "tokens=4" %%a in ('route print ^| find " 0.0.0.0"') do (
    set "MYIP=%%a"
)
echo Use this URL on your phone: http://%MYIP%:5173
echo.
pause
