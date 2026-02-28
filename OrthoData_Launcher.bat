@echo off
title OrthoData - Startup

echo Starting OrthoData...
echo.

:: 1. Start Backend in a new window
echo Starting Backend...
cd "app-patients-backend"
start "OrthoData Backend" npm start
cd ..

:: 2. Start Frontend in a new window
echo Starting Frontend...
start "OrthoData Frontend" npm run dev -- --host
timeout /t 5 >nul
start http://localhost/orthodata/

echo.
echo Application started!
echo You can minimize this window.
timeout /t 5 >nul
exit
