@echo off
title Fit-Thetic Fitness Club - Local Desktop Software
cd /d "%~dp0"

:: Start static web preview server in background
start /b "" cmd /c "npm run preview -- --port 4173 --host localhost"

:: Wait 2 seconds for server to start
timeout /t 2 /nobreak >nul

:: Launch in native standalone Windows desktop app window (Chrome/Edge App Mode)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:4173" --window-size=1366,850 --app-id="pk.fit-thetic.gym"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:4173" --window-size=1366,850 --app-id="pk.fit-thetic.gym"
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="http://localhost:4173" --window-size=1366,850
) else (
    start "" "http://localhost:4173"
)
