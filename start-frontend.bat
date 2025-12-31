@echo off
echo ========================================
echo   Gmail AI Agent - Starting Frontend
echo ========================================
echo.

cd /d "%~dp0frontend"

echo [1/4] Checking Node.js...
node --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found! Please install Node.js first.
    pause
    exit /b 1
)
echo Node.js found ✓

echo.
echo [2/4] Installing/Updating dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies!
    echo.
    echo Try running manually:
    echo   cd frontend
    echo   npm install
    pause
    exit /b 1
)
echo Dependencies installed ✓

echo.
echo [3/4] Checking config files...
if exist "postcss.config.js" (
    echo Fixing postcss.config.js...
    ren postcss.config.js postcss.config.cjs
)
if exist "tailwind.config.js" (
    echo Fixing tailwind.config.js...
    ren tailwind.config.js tailwind.config.cjs
)
echo Config files OK ✓

echo.
echo [4/4] Starting frontend dev server on port 5173...
echo Press Ctrl+C to stop
echo Browser will open automatically at http://localhost:5173
echo.

call npm run dev
