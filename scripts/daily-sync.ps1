#!/usr/bin/env pwsh
# scripts/daily-sync.ps1
# Đồng bộ nhanh nhánh dev mới nhất về máy và rebase vào task branch hiện tại
#
# Cách dùng:
#   .\scripts\daily-sync.ps1

$ErrorActionPreference = 'Stop'

$currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
Write-Host "Đang ở nhánh: $currentBranch" -ForegroundColor Cyan

Write-Host "Lấy dữ liệu mới nhất từ remote..." -ForegroundColor Cyan
git fetch origin

if ($currentBranch -eq 'dev' -or $currentBranch -eq 'main') {
    Write-Host "Kéo cập nhật cho nhánh $currentBranch..." -ForegroundColor Green
    git pull origin $currentBranch
    Write-Host "Hoàn tất đồng bộ." -ForegroundColor Green
    exit 0
}

Write-Host "Đồng bộ nhánh dev..." -ForegroundColor Cyan
git fetch origin dev:dev 2>$null

Write-Host "Rebase $currentBranch lên dev mới nhất..." -ForegroundColor Cyan
git rebase origin/dev

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Đồng bộ và rebase thành công! Sẵn sàng code tiếp." -ForegroundColor Green
} else {
    Write-Host "⚠️ Có xung đột khi rebase. Hãy sửa conflict, git add và chạy 'git rebase --continue'." -ForegroundColor Yellow
}
