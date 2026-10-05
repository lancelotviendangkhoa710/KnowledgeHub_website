#!/usr/bin/env pwsh
# scripts/agent-start-task.ps1
# Agent dùng script này để bắt đầu task mới (tạo branch từ dev)
#
# Cách dùng:
#   .\scripts\agent-start-task.ps1 -Branch "p1/article-store-api"

param(
    [Parameter(Mandatory=$true)]
    [string]$Branch
)

# Kiểm tra convention
if ($Branch -notmatch '^(p1|p2|p3|hotfix|release)/.+') {
    Write-Error "Branch '$Branch' không đúng convention. Cần: p1/..., p2/..., p3/..."
    exit 1
}

Write-Host "Sync dev mới nhất..."
git checkout dev
git pull origin dev

Write-Host "Tạo branch: $Branch"
git checkout -b $Branch

Write-Host ""
Write-Host "✅ Sẵn sàng code trên branch: $Branch"
Write-Host "Khi xong: .\scripts\create-pr.ps1 -Title `"$Branch`: mô tả`""
