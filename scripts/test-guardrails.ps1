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
        $Path -eq 'docs/TEAM_WORKFLOW.md' -or
        $Path -like '.agents/skills/*'
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
    # cmd's `2>nul` discards stderr so PowerShell does not turn git's fatal message
    # into a terminating error, while the exit code still tells us why it failed.
    # `git cat-file -e` prints nothing on success and a message on failure, so the
    # exit code plus an explicit object probe distinguish "new file" from a real
    # git failure. `git ls-tree` is used because it returns a listed path on success
    # and an empty string when the path is absent at that revision.
    $treeEntry = @(git ls-tree --name-only "${mergeBase}:" -- $file 2>$null)
    $treeExit = $LASTEXITCODE

    if ($treeExit -eq 0 -and $treeEntry.Count -gt 0) {
        $protectedMigrationChanges += $file
        continue
    }

    if ($treeExit -ne 0) {
        throw "git ls-tree failed for ${mergeBase} (exit ${treeExit}). Refusing to classify migration ${file}."
    }

    # Exit 0 with no matching entry: the migration is new at this revision.
}
if ($protectedMigrationChanges.Count -gt 0) {
    Add-Failure "Existing migration modified: $($protectedMigrationChanges -join ', '). Add a new migration instead."
}

# Key names are matched as whole identifiers so that values assigned to
# `$token`, `API_TOKEN`, `DB_PASSWORD` etc. are still detected. A lookbehind of
# (?<![A-Za-z0-9]) only prevents matching a suffix of a longer name, while
# still allowing `$`, `_` and other non-alphanumerics as prefixes.
# The captured value is then checked separately, so quoting and documented
# placeholder forms (`YOUR_*`, `<...>`, `${...}`, `mock-*`, `github_pat_...`) are
# handled outside the regex where they are easier to read and maintain.
$secretKeyPattern = '(?i)(?<![A-Za-z0-9])(api[_-]?key|secret|token|password)\s*[:=]\s*["'']?([^\s"'',;)]+)'
$placeholderValuePattern = '(?i)^(?:<.*|\$\{.*|your[-_]|change-me|example|mock|placeholder|xxx|dummy|\*|\$|.*->.*|\S*(?:\.\.\.|…))\S*$'
# Credentials embedded in a connection URI, e.g. postgresql://user:pass@host/db.
$credentialUriPattern = '(?i)\b[a-z][a-z0-9+.\-]*://[^/\s:@]+:(?!<|\$|\*)[^/\s@]{6,}@'
$legacyPattern = '(?i)\b(reviewer|learner|submitted|rejected|article_reviews)\b'

foreach ($file in $changedFiles) {
    # Vendor skill documentation is exempt from the business-term scan only.
    # Secret scanning still applies to every file, including those.
    $skipLegacy = Test-AllowedLegacyPath $file

    $addedLines = @(git diff --unified=0 "$mergeBase...$HeadRef" -- $file |
        Where-Object { $_ -match '^\+' -and $_ -notmatch '^\+\+\+' })

    foreach ($line in $addedLines) {
        $content = $line.Substring(1)

        foreach ($keyMatch in [regex]::Matches($content, $secretKeyPattern)) {
            $value = $keyMatch.Groups[2].Value
            if ($value.Length -lt 12) { continue }
            if ($value -match $placeholderValuePattern) { continue }
            Add-Failure "Possible hard-coded secret in ${file}: $content"
            break
        }

        if ($content -match $credentialUriPattern) {
            Add-Failure "Credentials embedded in connection URI in ${file}: $content"
        }
        if (-not $skipLegacy -and $content -match $legacyPattern) {
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