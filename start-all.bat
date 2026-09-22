@echo off
title AEGIS DISPATCH - Launcher
echo ===================================================
echo Launching AEGIS DISPATCH Backend & Frontend...
echo ===================================================
start "AEGIS Backend" cmd.exe /k ""%~dp0start-backend.bat""
timeout /t 6 /nobreak >nul
start "AEGIS Frontend" cmd.exe /k ""%~dp0start-frontend.bat""
echo ===================================================
echo Services launched!
echo Backend:  http://localhost:8080
echo Frontend: http://localhost:5173
echo ===================================================
timeout /t 3 >nul
start http://localhost:5173
