@echo off
title Publish Aegis Dispatch to Netlify
cd /d "%~dp0"
if exist "D:\tools\node-v22.14.0-win-x64" set "PATH=D:\tools\node-v22.14.0-win-x64;%PATH%"

echo ===================================================
echo [AEGIS DISPATCH] Building Production Bundle...
echo ===================================================
cd /d "%~dp0frontend"
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed! Exiting.
    pause
    exit /b %ERRORLEVEL%
)

echo ===================================================
echo [AEGIS DISPATCH] Publishing Directly to Netlify...
echo ===================================================
call npx --yes netlify-cli deploy --prod --dir=dist
echo ===================================================
echo Deployment Complete!
echo ===================================================
pause
