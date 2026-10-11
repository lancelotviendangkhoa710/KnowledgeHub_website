#!/usr/bin/env pwsh
# scripts/check-domain-ownership.ps1
# Kiểm tra xem branch hiện tại có sửa file ngoài domain được phân công hay không
#
# Cách dùng:
#   .\scripts\check-domain-ownership.ps1 [-BaseRef "origin/dev"]

param(
    [string]$BaseRef = "origin/dev"
)

$ErrorActionPreference = 'Stop'
$currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()

if ($currentBranch -notmatch '^(p1|p2|p3)/') {
    Write-Host "Nhánh $currentBranch không phải task branch (p1, p2, p3). Bỏ qua kiểm tra ownership." -ForegroundColor Yellow
    exit 0
}

$prefix = $Matches[1]
Write-Host "Kiểm tra phạm vi file của nhánh $currentBranch ($prefix)..." -ForegroundColor Cyan

# Xác định merge base
git fetch origin --quiet 2>$null
$mergeBase = (git merge-base $BaseRef HEAD).Trim()
if (-not $mergeBase) {
    Write-Error "Không tìm thấy merge base giữa $BaseRef và HEAD."
    exit 1
}

$changedFiles = @(git diff --name-only --diff-filter=ACMR "$mergeBase...HEAD")
if ($changedFiles.Count -eq 0) {
    Write-Host "Không có file nào thay đổi." -ForegroundColor Green
    exit 0
}

$forbiddenPatterns = @()
if ($prefix -eq 'p1') {
    # Auth không được đụng Content & Learning
    $forbiddenPatterns = @(
        '^backend/app/Http/Controllers/(Content|Learning)/',
        '^backend/app/Http/Requests/(Content|Learning)/',
        '^backend/app/Services/(Content|Learning)/',
        '^backend/routes/api/(content|learning)\.php',
        '^database/migrations/.*(articles|tags|categories|learning|roadmap)',
        '^tests/Feature/(Content|Learning)/'
    )
} elseif ($prefix -eq 'p2') {
    # Content không được đụng Auth & Learning
    $forbiddenPatterns = @(
        '^backend/app/Http/Controllers/(Auth|Learning)/',
        '^backend/app/Http/Requests/(Auth|Learning)/',
        '^backend/app/Services/(Auth|Learning)/',
        '^backend/routes/api/(auth|learning)\.php',
        '^database/migrations/.*(users|roles|learning|roadmap)',
        '^tests/Feature/(Auth|Learning)/'
    )
} elseif ($prefix -eq 'p3') {
    # Learning/Infra không được đụng Auth & Content
    $forbiddenPatterns = @(
        '^backend/app/Http/Controllers/(Auth|Content)/',
        '^backend/app/Http/Requests/(Auth|Content)/',
        '^backend/app/Services/(Auth|Content)/',
        '^backend/routes/api/(auth|content)\.php',
        '^database/migrations/.*(users|roles|articles|tags|categories)',
        '^tests/Feature/(Auth|Content)/'
    )
}

$violations = @()
foreach ($file in $changedFiles) {
    foreach ($pattern in $forbiddenPatterns) {
        if ($file -match $pattern) {
            $violations += $file
            break
        }
    }
}

if ($violations.Count -gt 0) {
    Write-Host "`n❌ Phát hiện file sửa ngoài domain quy định ($prefix):" -ForegroundColor Red
    foreach ($v in $violations) {
        Write-Host "   - $v" -ForegroundColor Red
    }
    Write-Host "`nHãy hoàn tác các file trên hoặc liên hệ đồng đội sở hữu domain!" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Tất cả $($changedFiles.Count) files thay đổi đều nằm đúng domain ($prefix)!" -ForegroundColor Green
exit 0
