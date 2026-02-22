@echo off
title B. Braun Activity Portal Server
cls
echo Starting server...

:: Check if port 8081 is busy
netstat -ano | findstr :8081 > nul
if %errorlevel% == 0 (
    echo [ERROR] Port 8081 is already in use!
    echo Please close any other servers or apps using this port.
    pause
    exit /b
)

set SERVED=0

where python >nul 2>nul
if %errorlevel% == 0 (
    echo Using 'python'...
    start "" "http://localhost:8081"
    python -m http.server 8081
    set SERVED=1
)

if %SERVED% == 0 (
    where py >nul 2>nul
    if %errorlevel% == 0 (
        echo Using 'py'...
        start "" "http://localhost:8081"
        py -m http.server 8081
        set SERVED=1
    )
)

if %SERVED% == 0 (
    where npx >nul 2>nul
    if %errorlevel% == 0 (
        echo Using 'npx http-server'...
        start "" "http://localhost:8081"
        npx http-server . -p 8081
        set SERVED=1
    )
)

if %SERVED% == 0 (
    echo [ERROR] Could not find python or node/npx to start the server.
    echo Please install Python (https://www.python.org/) or Node.js (https://nodejs.org/).
    pause
)
