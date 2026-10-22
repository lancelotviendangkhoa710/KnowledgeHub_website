# MCP Setup — Agent Tooling

**Date**: 2026-10-22
**Scope**: Local development machine (Windows + VS Code + Cline). No secrets are stored in this repository.

This document records which MCP servers are configured, how they were verified, and the exact commands to reinstall them on another machine.

## 1. Status

| Server | Purpose | Config state | Verified |
|---|---|---|---|
| `playwright` | Drive a real browser: navigate, click, fill forms, snapshot DOM/accessibility tree, screenshots, console/network | **Enabled** | MCP handshake + `tools/list` + full browser session via `playwright-cli` |
| `chrome-devtools` | Console, network, performance traces, Lighthouse, screencast | **Enabled** | MCP handshake + `tools/list` |
| `postgres` | Inspect schema, run queries/`EXPLAIN`, read constraints against local Docker PostgreSQL | **Enabled**, read-only role | MCP handshake + executed a query through `tools/call` |
| `context7` | Up-to-date docs for Laravel 11, Next.js 14, Playwright, Sanctum | **Enabled** | MCP handshake + `tools/list` |
| `supabase` | Supabase staging/production inspection | **Disabled placeholder** — needs a project token | Not run (requires token) |
| `github` | PRs, issues, Actions | **Disabled placeholder** — needs a scoped PAT | Not run (requires token) |

The two disabled servers ship with placeholder values (`YOUR_GITHUB_PAT`, `YOUR_SUPABASE_ACCESS_TOKEN`). They are intentionally off so no tool call can reach a remote service with a wrong or missing credential.

## 2. Where the configuration lives

- VS Code + Cline: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
  This file is machine-local and **must never be committed** (it holds tokens).
- A backup of the previous (empty) settings was written next to it as `cline_mcp_settings.json.bak`.

## 3. Server definitions

```jsonc
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@0.0.83", "--headless", "--isolated"],
      "disabled": false
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@1.11.0", "--headless"],
      "disabled": false
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres@0.6.2",
               "postgresql://mcp_readonly:<MCP_READONLY_PASSWORD>@localhost:5432/knowledgehub"],
      "disabled": false
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@4.4.4"],
      "disabled": false
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@0.14.0", "--read-only",
               "--access-token=YOUR_SUPABASE_ACCESS_TOKEN", "--project-ref=YOUR_PROJECT_REF"],
      "disabled": true
    },
    "github": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", "ghcr.io/github/github-mcp-server"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "YOUR_GITHUB_PAT" },
      "disabled": true
    }
  }
}
```

Versions are pinned on purpose: MCP servers change tool schemas frequently, and an unpinned `latest` can silently change what an agent can do.

## 4. Playwright prerequisites

`@playwright/mcp` needs a browser binary installed through the `playwright` package:
in this machine this was done with the version pinned by `@playwright/cli` (`1.64.0-alpha-1790635538000`).

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "$env:LOCALAPPDATA\ms-playwright"
npm i -g playwright@1.64.0-alpha-1790635538000
npx playwright@1.64.0-alpha-1790635538000 install chromium
npx playwright@1.64.0-alpha-1790635538000 install chromium-headless-shell
```

Installed browsers: `%LOCALAPPDATA%\ms-playwright\chromium-1247`, `chromium_headless_shell-1247`, `ffmpeg-1011`, `winldd-1007`.

The terminal-side browser CLI is already available globally as `playwright-cli`, and its skill is installed in this repository under `.agents/skills/playwright-cli/` so an agent can drive the browser without an MCP client.

## 5. PostgreSQL read-only role

> **Never commit the role password.** Generate your own value and keep it only in
> the machine-local MCP settings file or an environment variable. The repository
> documents the placeholder `<MCP_READONLY_PASSWORD>` and nothing else.

Create the role against the local Docker database, replacing the placeholder with
your own password:

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mcp_readonly') THEN
    CREATE ROLE mcp_readonly LOGIN PASSWORD '<MCP_READONLY_PASSWORD>';
  END IF;
END $$;
GRANT CONNECT ON DATABASE knowledgehub TO mcp_readonly;
GRANT USAGE ON SCHEMA public TO mcp_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mcp_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO mcp_readonly;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM mcp_readonly;
```

Verification:

- `SELECT count(*) FROM users;` through MCP → succeeds.
- `INSERT INTO roles ...` as `mcp_readonly` → `ERROR: permission denied for table roles`.

Recreate on a fresh database:

```powershell
docker compose exec postgres psql -U knowledgehub -d knowledgehub
# then paste the SQL above
```

> The role password is machine-local by definition. Generate your own, keep it in the
> MCP settings file or an environment variable, and never commit it. Any environment
> with real data must use a different secret supplied through the MCP client's environment.

## 6. How it was verified

Each enabled server was started and driven through the MCP JSON-RPC protocol (`initialize` → `tools/list` → `tools/call`):

| Server | Result |
|---|---|
| `playwright` | `tools/list` returned browser tools (`browser_navigate`, `browser_click`, `browser_fill_form`, `browser_snapshot`, `browser_take_screenshot`, `browser_console_messages`, `browser_network_requests`, …) |
| `chrome-devtools` | `tools/list` returned `navigate_page`, `click`, `performance_start_trace`, `lighthouse_audit`, `list_console_messages`, … |
| `postgres` | `tools/call` `query` on `pg_roles` returned the read-only role and `rolsuper = false` |
| `context7` | `tools/list` returned `resolve-library-id` and `query-docs` |

End-to-end UI check (Playwright against the running app):

1. `docker compose up -d` (app on `:8080`, frontend on `:3000`).
2. Seeded a user + roadmap and minted a Sanctum token (`id|plain`).
3. `playwright-cli -s=<session> open http://localhost:3000/learning/roadmaps`
4. Set `localStorage.auth_token`, reload, `find "MCP Verification Roadmap"` → heading, goal and status rendered from the API.
5. Screenshot: [`docs/assets/mcp-playwright-verify.png`](assets/mcp-playwright-verify.png).

The screenshot also shows the current light-on-light contrast problem on the Learning page:
`Learning Roadmaps`, the roadmap title and the goal text are washed out. Flagged as a UI defect, not fixed here.

## 7. Enabling the disabled servers

**GitHub MCP** (scoped PAT, read the repos you need):

```powershell
$env:GITHUB_PERSONAL_ACCESS_TOKEN = "github_pat_..."
docker pull ghcr.io/github/github-mcp-server
```

Then set `disabled: false` for `github` and restart Cline's MCP panel. Do not put the PAT in the repository.

**Supabase MCP** (read-only, one project):

1. Create a Supabase access token.
2. Replace `YOUR_SUPABASE_ACCESS_TOKEN` and `YOUR_PROJECT_REF` in the machine-local settings file, or pass them through environment variables.
3. Keep the `--read-only` flag unless a task explicitly needs writes; write access requires team review.

## 8. Security rules

- Never point Playwright/chrome-devtools at production URLs.
- Keep the PostgreSQL MCP role read-only; do not reuse the `knowledgehub` superuser.
- Never commit `cline_mcp_settings.json`, tokens, or `.env`.
- Disable a server you are not actively using; each server costs context and adds attack surface.

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| Playwright says the browser is missing | Re-run `install chromium` with the matching Playwright version, then reopen the browser |
| `postgres` server exits immediately | Check `docker compose ps`; the connection string uses `localhost:5432` (host) not `postgres` (container) |
| `npx` asks for confirmation on Windows | Keep `-y` in `args`; MCP clients do not answer the prompt |
| Cline shows a server as failed | Run `npx -y <package>` manually in a terminal to see the real error |
