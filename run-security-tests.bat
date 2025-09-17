@echo off
echo 🔒 Security Testing Suite for Timetable Chatbot
echo ================================================

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js is available

REM Check if the application is running
echo.
echo 🔍 Checking if application is running...
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Application not responding on http://localhost:3001
    echo Please start your application first with: cd backend ^&^& npm start
    pause
    exit /b 1
)

echo ✅ Application is running and healthy

REM Install dependencies if needed
echo.
echo 📦 Installing security test dependencies...
if not exist "node_modules" (
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)
echo ✅ Dependencies installed

REM Run security tests
echo.
echo 🚀 Running security tests...
echo This may take a few minutes...
echo.

node basic-security-tests.js

if %errorlevel% equ 0 (
    echo.
    echo 🎉 Security testing completed successfully!
) else (
    echo.
    echo ⚠️  Security testing completed with issues
)

echo.
echo 📋 Next Steps:
echo 1. Review the test results above
echo 2. Fix any security vulnerabilities found
echo 3. Re-run tests to verify fixes
echo 4. Consider implementing additional security measures

pause