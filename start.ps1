# Content Structure Studio 起動スクリプト
# Usage: .\start.ps1

$backendDir = "$PSScriptRoot\backend"
$frontendDir = "$PSScriptRoot\frontend"

Write-Host "=== Content Structure Studio ===" -ForegroundColor Cyan

# .env 確認
if (-not (Test-Path "$backendDir\.env")) {
    Write-Host "[警告] backend\.env が見つかりません。.env.example をコピーして設定してください。" -ForegroundColor Yellow
    Copy-Item "$backendDir\.env.example" "$backendDir\.env"
    Write-Host "  backend\.env を作成しました。ANTHROPIC_API_KEY を設定してください。" -ForegroundColor Yellow
}

# Backend
Write-Host "`n[1] バックエンド起動中 (port 8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; python -m uvicorn app.main:app --reload --port 8000"

Start-Sleep -Seconds 2

# Frontend
Write-Host "[2] フロントエンド起動中 (port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; npm install; npm run dev"

Write-Host "`n起動完了。ブラウザで http://localhost:5173 を開いてください。" -ForegroundColor Cyan
