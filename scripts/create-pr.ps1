#!/usr/bin/env pwsh
# scripts/create-pr.ps1
# Agent dùng script này để tự tạo PR sau khi code xong
#
# Cách dùng:
#   .\scripts\create-pr.ps1 -Title "p1: add article store API" -Body "Implements POST /api/v1/articles" -Base "dev"
#
# Yêu cầu: GitHub CLI (gh) đã cài và đã login
#   Cài: https://cli.github.com/
#   Login: gh auth login

param(
    [Parameter(Mandatory=$true)]
    [string]$Title,

    [Parameter(Mandatory=$false)]
    [string]$Body = "",

    [Parameter(Mandatory=$false)]
    [string]$Base = "dev",

    [Parameter(Mandatory=$false)]
    [string]$Reviewer = "",   # GitHub username, để trống = không assign

    [Parameter(Mandatory=$false)]
    [switch]$Draft = $false   # -Draft để tạo draft PR
)

# ── 1. Kiểm tra gh CLI có sẵn không ──────────────────────────────────────────
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "GitHub CLI (gh) chưa cài. Tải tại: https://cli.github.com/"
    exit 1
}

# ── 2. Lấy branch hiện tại ───────────────────────────────────────────────────
$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "Branch hiện tại: $currentBranch"

# ── 3. Kiểm tra branch name convention ──────────────────────────────────────
if ($currentBranch -notmatch '^(p1|p2|p3|hotfix|release)/.+') {
    Write-Error "Branch '$currentBranch' không đúng convention. Cần: p1/..., p2/..., p3/..."
    exit 1
}

# ── 4. Kiểm tra không tạo PR từ dev hoặc main ────────────────────────────────
if ($currentBranch -eq "dev" -or $currentBranch -eq "main") {
    Write-Error "Không tạo PR từ branch '$currentBranch'. Phải tạo branch feature trước."
    exit 1
}

# ── 5. Push branch lên remote trước ─────────────────────────────────────────
Write-Host "Pushing branch lên remote..."
git push origin $currentBranch
if ($LASTEXITCODE -ne 0) {
    Write-Error "Push thất bại. Kiểm tra git status."
    exit 1
}

# ── 6. Build PR body tự động nếu không truyền vào ────────────────────────────
if ($Body -eq "") {
    # Lấy danh sách commit từ base đến HEAD làm body
    $commits = git log origin/$Base..HEAD --format="- %s" 2>$null
    $Body = @"
## Changes
$commits

## Checklist
- [ ] Tests pass
- [ ] No debug code (dd, console.log)
- [ ] No .env committed
- [ ] CodeRabbit review done
"@
}

# ── 7. Tạo PR ─────────────────────────────────────────────────────────────────
Write-Host "Tạo Pull Request..."

$ghArgs = @(
    "pr", "create",
    "--title", $Title,
    "--body", $Body,
    "--base", $Base,
    "--head", $currentBranch
)

if ($Draft) {
    $ghArgs += "--draft"
}

if ($Reviewer -ne "") {
    $ghArgs += "--reviewer"
    $ghArgs += $Reviewer
}

$prUrl = gh @ghArgs 2>&1

if ($LASTEXITCODE -ne 0) {
    # PR có thể đã tồn tại
    if ($prUrl -match "already exists") {
        Write-Host "PR đã tồn tại cho branch này. Lấy URL..."
        $prUrl = gh pr view --json url --jq '.url'
    } else {
        Write-Error "Tạo PR thất bại: $prUrl"
        exit 1
    }
}

Write-Host ""
Write-Host "✅ PR tạo thành công!"
Write-Host "🔗 URL: $prUrl"
Write-Host ""
Write-Host "Tiếp theo:"
Write-Host "  - CodeRabbit sẽ tự động review trong ~2 phút"
Write-Host "  - Nhắn link PR cho team để review và merge"
Write-Host "  - Sau khi merge: git checkout dev && git pull origin dev"
