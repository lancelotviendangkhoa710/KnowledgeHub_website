#!/usr/bin/env pwsh
# scripts/agent-finish-task.ps1
# Agent dùng sau khi PR được merge — sync dev và sẵn sàng task tiếp
#
# Cách dùng:
#   .\scripts\agent-finish-task.ps1

$currentBranch = git rev-parse --abbrev-ref HEAD

Write-Host "Về dev và sync..."
git checkout dev
git pull origin dev

# Xóa branch cũ nếu đã merge
if ($currentBranch -ne "dev" -and $currentBranch -ne "main") {
    $merged = git branch --merged dev | Select-String $currentBranch
    if ($merged) {
        Write-Host "Xóa branch đã merge: $currentBranch"
        git branch -d $currentBranch
        git push origin --delete $currentBranch 2>$null
    }
}

Write-Host ""
Write-Host "✅ dev đã sync. Sẵn sàng task tiếp."
Write-Host "Bắt đầu task mới: .\scripts\agent-start-task.ps1 -Branch `"p1/ten-task`""
