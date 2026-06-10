# 初回セットアップスクリプト
# Usage: .\setup.ps1

$backendDir = "$PSScriptRoot\backend"
$frontendDir = "$PSScriptRoot\frontend"

Write-Host "=== セットアップ開始 ===" -ForegroundColor Cyan

# Python 仮想環境
Write-Host "`n[1] Python 仮想環境を作成..." -ForegroundColor Green
Set-Location $backendDir
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# .env
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "  .env を作成しました。ANTHROPIC_API_KEY を設定してください。" -ForegroundColor Yellow
}

# Frontend
Write-Host "`n[2] フロントエンド依存関係をインストール..." -ForegroundColor Green
Set-Location $frontendDir
npm install

Write-Host "`n=== セットアップ完了 ===" -ForegroundColor Cyan
Write-Host "次のステップ:" -ForegroundColor White
Write-Host "  1. backend\.env に ANTHROPIC_API_KEY を設定"
Write-Host "  2. .\start.ps1 で起動"
