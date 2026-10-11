#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [string]$BaseRef = "",
    [string]$HeadRef = "HEAD",
    [switch]$RequireTaskId
)

$ErrorActionPreference = 'Stop'
$failures = [System.Collections.Generic.List[string]]::new()

function Add-Failure([string]$Message) {
    $script:failures.Add($Message)
    Write-Host "FAIL: $Message" -ForegroundColor Red
}

function Test-AllowedLegacyPath([string]$Path) {
    return $Path -like 'docs/*' -or
        $Path -eq '.coderabbit.yaml' -or
        $Path -eq 'improtant_task.md' -or
        $Path -eq 'docs/TEAM_WORKFLOW.md'
}

if (-not $BaseRef) {
    if (git show-ref --verify --quiet refs/remotes/origin/dev) {
        $BaseRef = 'origin/dev'
    } elseif (git show-ref --verify --quiet refs/heads/main) {
        $BaseRef = 'main'
    } else {
        throw 'BaseRef is required when origin/dev and main are unavailable.'
    }
}

$mergeBase = (git merge-base $BaseRef $HeadRef).Trim()
if (-not $mergeBase) {
    throw "Cannot find merge base for '$BaseRef' and '$HeadRef'."
}

$changedFiles = @(git diff --name-only --diff-filter=ACMR "$mergeBase...$HeadRef")
Write-Host "Guardrail range: $mergeBase...$HeadRef"
Write-Host "Changed files: $($changedFiles.Count)"

if ($changedFiles | Where-Object { $_ -match '(^|/)\.env($|\.)' -and $_ -notmatch '\.env\.example$' }) {
    Add-Failure 'Environment file detected. Never commit .env files.'
}

$protectedMigrationChanges = @()
foreach ($file in $changedFiles | Where-Object { $_ -like 'database/migrations/*.php' }) {
    git cat-file -e "$mergeBase`:$file" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $protectedMigrationChanges += $file
    }
}
if ($protectedMigrationChanges.Count -gt 0) {
    Add-Failure "Existing migration modified: $($protectedMigrationChanges -join ', '). Add a new migration instead."
}

$secretPattern = '(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*(?!\$\{|<|your-|change-me|example)\S{8,}'
$legacyPattern = '(?i)\b(reviewer|learner|submitted|rejected|article_reviews)\b'

foreach ($file in $changedFiles) {
    if (Test-AllowedLegacyPath $file) { continue }

    $addedLines = @(git diff --unified=0 "$mergeBase...$HeadRef" -- $file |
        Where-Object { $_ -match '^\+' -and $_ -notmatch '^\+\+\+' })

    foreach ($line in $addedLines) {
        $content = $line.Substring(1)
        if ($content -match $secretPattern) {
            Add-Failure "Possible hard-coded secret in ${file}: $content"
        }
        if ($content -match $legacyPattern) {
            Add-Failure "Forbidden legacy business term in ${file}: $content"
        }
    }
}

if ($RequireTaskId) {
    $subject = (git log -1 --format=%s $HeadRef).Trim()
    if ($subject -notmatch '^(p1|p2|p3|docs|fix|chore|hotfix|release): .+') {
        Add-Failure "Latest commit lacks approved prefix/description: '$subject'"
    }
}

if ($failures.Count -gt 0) {
    Write-Host "`nGuardrails failed: $($failures.Count) issue(s)." -ForegroundColor Red
    exit 1
}

Write-Host 'Guardrails passed.' -ForegroundColor Green