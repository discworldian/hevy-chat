# Hevy Chat - Start backend and frontend

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting Hevy Chat..." -ForegroundColor Cyan
Write-Host ""

# Start backend
Write-Host "Starting backend..." -ForegroundColor Green
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "cd '$projectRoot/backend'; npm run dev" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start frontend
Write-Host "Starting frontend..." -ForegroundColor Green
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "cd '$projectRoot/frontend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "✓ Backend starting on http://localhost:3001" -ForegroundColor Green
Write-Host "✓ Frontend starting on http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Open http://localhost:5173 in your browser" -ForegroundColor Cyan
