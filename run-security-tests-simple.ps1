# Simple Security Testing Suite for Timetable Chatbot
# This script runs security tests without complex health checking

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

# Install dependencies if needed
Write-Host "`nInstalling security test dependencies..." -ForegroundColor Yellow
if (!(Test-Path "node_modules")) {
    npm install axios
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

