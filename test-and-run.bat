@echo off
echo ========================================
echo   Gmail AI Agent - Quick Test
echo ========================================
echo.

cd /d "%~dp0backend"

echo [1/5] Checking Node.js installation...
node --version
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found! Please install Node.js first.
    pause
    exit /b 1
)

echo.
echo [2/5] Checking npm installation...
npm --version
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm not found!
    pause
    exit /b 1
)

echo.
echo [3/5] Installing backend dependencies...
if not exist "node_modules\" (
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed ✓
)

echo.
echo [4/5] Checking TypeScript compilation...
call npx tsc --noEmit
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: TypeScript compilation has errors (but may still run)
) else (
    echo TypeScript compilation successful ✓
)

echo.
echo [5/5] Checking .env file...
if exist ".env" (
    echo .env file found ✓
) else (
    echo WARNING: .env file not found!
    echo Creating from .env.example...
    copy .env.example .env
)

echo.
echo ========================================
echo   Ready to start!
echo ========================================
echo.
echo To start backend: npm run dev
echo To start frontend: cd ../frontend && npm run dev
echo.
echo Press any key to start backend now...
pause > nul

npm run dev
