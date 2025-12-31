@echo off
echo ========================================
echo   Gmail AI Agent - Starting Backend
echo ========================================
echo.

cd /d "%~dp0backend"

echo Checking if node_modules exists...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
) else (
    echo Dependencies already installed
)

echo.
echo Starting backend server on port 5000...
echo Press Ctrl+C to stop
echo.

call npm run dev
