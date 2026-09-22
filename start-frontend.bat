@echo off
title AEGIS DISPATCH - Frontend Console (Port 5173)
cd /d "%~dp0frontend"
set "PATH=D:\tools\node-v22.14.0-win-x64;%PATH%"
echo ===================================================
echo Starting AEGIS DISPATCH Frontend (Vite + React 18)
echo Console: http://localhost:5173
echo ===================================================
call npm.cmd run dev
pause
