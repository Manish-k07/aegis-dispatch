@echo off
title AEGIS DISPATCH - Frontend Console (Port 5173)
cd /d "%~dp0frontend"
echo ===================================================
echo Starting AEGIS DISPATCH Frontend (Vite + React 18)
echo Console: http://localhost:5173
echo ===================================================
call npm run dev -- --host 0.0.0.0 --port 5173
pause
