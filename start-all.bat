@echo off
title AEGIS DISPATCH - Launcher
echo ===================================================
echo Launching AEGIS DISPATCH Backend & Frontend...
echo ===================================================
start "AEGIS Backend" cmd.exe /k ""%~dp0start-backend.bat""

echo Waiting for Backend health check at http://localhost:8080/actuator/health...
:health_loop
powershell -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:8080/actuator/health' -TimeoutSec 2; if ($r.status -eq 'UP') { exit 0 } else { exit 1 } } catch { exit 1 }"
if %ERRORLEVEL% equ 0 goto backend_up
timeout /t 1 /nobreak >nul
goto health_loop

:backend_up
echo Backend is healthy (UP)!
start "AEGIS Frontend" cmd.exe /k ""%~dp0start-frontend.bat""

echo ===================================================
echo Services launched successfully!
echo Backend Health: http://localhost:8080/actuator/health
echo Backend API:    http://localhost:8080/api
echo Frontend:       http://localhost:5173
echo ===================================================
timeout /t 2 /nobreak >nul
start http://localhost:5173
