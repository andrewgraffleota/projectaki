# Security Testing Suite for Timetable Chatbot
# This script runs comprehensive security tests against your application

Write-Host "Security Testing Suite for Timetable Chatbot" -ForegroundColor Cyan
Write-Host ("=" * 50) -ForegroundColor Cyan

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if the application is running
Write-Host "`nChecking if application is running..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method GET -TimeoutSec 5
    Write-Host "Application is running and healthy" -ForegroundColor Green
} catch {
    Write-Host "Application not responding on http://localhost:3001" -ForegroundColor Red
    Write-Host "Attempting to start the application..." -ForegroundColor Yellow
    
    # Try to start the server
    try {
        Start-Process -NoNewWindow -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "backend"
        Start-Sleep 5
        Write-Host "Server started, continuing with tests..." -ForegroundColor Green
    } catch {
        Write-Host "Could not start server automatically. Please start manually with: cd backend && npm start" -ForegroundColor Red
        Write-Host "Continuing with tests anyway..." -ForegroundColor Yellow
    }
}

# Install dependencies if needed
Write-Host "`nInstalling security test dependencies..." -ForegroundColor Yellow
if (!(Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}
Write-Host "Dependencies installed" -ForegroundColor Green

# Run security tests
Write-Host "`nRunning security tests..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray

try {
    node basic-security-tests.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nSecurity testing completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`nSecurity testing completed with issues" -ForegroundColor Yellow
    }
} catch {
    Write-Host "`nError running security tests: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Review the test results above" -ForegroundColor White
Write-Host "2. Fix any security vulnerabilities found" -ForegroundColor White
Write-Host "3. Re-run tests to verify fixes" -ForegroundColor White
Write-Host "4. Consider implementing additional security measures" -ForegroundColor White

Write-Host "`nTo run security hardening recommendations:" -ForegroundColor Cyan
Write-Host "node security-hardening.js" -ForegroundColor White
