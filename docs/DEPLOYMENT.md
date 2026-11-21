# KnowledgeHub — Deployment Guide

This guide distinguishes the configured local Docker environment from production components that still require deployment-specific setup. The approved stack is Laravel 11, Next.js/React, PostgreSQL 16 (Supabase PostgreSQL as managed target), and Docker Compose for local development.

## Current deployment readiness

- **Local:** Docker Compose configuration exists for app, PostgreSQL, Nginx, and frontend.
- **Backend:** `backend/Dockerfile` builds a PHP 8.3 CLI image (OPcache with `enable_cli`, four PHP built-in-server workers) and boots Laravel with cached config/routes. The Render service runs this image.
- **Frontend:** Next.js Dockerfile runs the development server. It is not a production-hardened image.
- **Managed database:** Supabase is the approved PostgreSQL target, but project URL, database credentials, network access, and production deployment configuration must be supplied by the operator.
- **Production release:** Hosted deployments exist (Vercel frontend, Render Laravel API and FastAPI AI service). The CD path — backend image, Render assumptions, scheduled workflows, and Vercel variables — is documented below. There is still no zero-downtime migration procedure or automated rollback.

## Current hosted environments

Last verified: 2026-11-08.

| Component | Provider | URL | Status |
|---|---|---|---|
| Frontend | Vercel | <https://knowledge-hub-website-eight.vercel.app/> | Live; serves the Next.js application and calls the Render API |
| Backend API | Render | <https://knowledgehub-website.onrender.com> | Live; Laravel 11 / PHP 8.3, API under `/api/v1`, `/up` returns 200 |
| Database | Supabase PostgreSQL | private | Managed database target; credentials are not documented here |

Verified on the date above: `/`, `/courses`, and `/login` render; `/api/v1/articles` and `/api/v1/categories` return 200 with `Access-Control-Allow-Origin: *`; `/courses` lists the 4 published articles. The Render root returns the framework default page — expected for the API service; use `/api/v1/*` for API checks. Render may cold-start (the first request can return 503 while the instance boots), so smoke checks need retries and a longer timeout.

Frontend build-time variables (redeploy Vercel after changing either; see [Frontend environment](#frontend-environment) for why the browser now calls `/api` on the Vercel host instead of Render):

```dotenv
NEXT_PUBLIC_API_URL=/api
BACKEND_INTERNAL_URL=https://knowledgehub-website.onrender.com
```

Environment variables, CORS, and the AI service request flow are documented in the deployment context pack: [`team/context-packs/deployment-hosting.md`](team/context-packs/deployment-hosting.md).

## Backend container (Render)

The Render API service builds `backend/Dockerfile` (PHP 8.3 CLI). The image installs `pdo_pgsql`, `mbstring`, `bcmath`, `zip`, and OPcache, enables OPcache for the CLI SAPI, and starts Laravel with:

```text
php artisan config:cache && php artisan route:cache && php artisan serve --no-reload --host=0.0.0.0 --port=${PORT:-10000}
```

- **OPcache:** `opcache.enable_cli=1`; verify with `php -i | grep opcache.enable_cli` inside the container. Without CLI OPcache every request recompiles the framework.
- **Workers:** `PHP_CLI_SERVER_WORKERS=4` is read by Laravel 11's `ServeCommand` at startup and forwarded to the `php -S` child, so the container runs one master plus four workers. `--no-reload` also passes the rest of the runtime environment through. Verify the worker processes with `docker top <container>` (expect five `php -S` entries).
- **Port:** the image `EXPOSE`s 10000 and listens on `${PORT:-10000}`. Render injects `PORT`; do not override the start command with a hard-coded port.
- **Health check:** configure Render's health check to `/up` (Laravel's built-in health route). It returns 200 without a database connection; `/` returns the Laravel default page and is not a health signal.
- **Cached config:** `config:cache` and `route:cache` run at container start with the environment Render injects at that moment. Changing an environment variable in Render requires a restart/redeploy; a running container keeps the previously cached config.
- **Signals:** the CMD uses `exec`, so the Laravel server receives Render's `SIGTERM` directly on deploys/restarts.

Build and smoke-test the image locally:

```powershell
docker build -f backend/Dockerfile -t kh-cd-test backend/
docker run --rm -e PORT=10000 -e APP_KEY=base64:... -p 10000:10000 kh-cd-test
curl http://localhost:10000/up
```

Required private Render environment variables:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_KEY=<generated Laravel key>
APP_URL=https://knowledgehub-website.onrender.com

DB_CONNECTION=pgsql
DB_HOST=<supabase-host>
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=<database-user>
DB_PASSWORD=<database-password>
DB_SSLMODE=require
# Optional: reuse the PDO connection; default is off.
DB_PERSISTENT=false

# AI Companion (browser and Laravel must never receive DEEPSEEK_API_KEY).
AI_SERVICE_URL=https://knowledgehub-ai-service.onrender.com
AI_SERVICE_TOKEN=<shared-private-token>
AI_CHAT_ENABLED=true
AI_CHAT_TIMEOUT=75
# Set to true only after migration 2026_11_08_000001 has run everywhere.
AI_MESSAGES_M1=true

# Shared secret for the scheduled retention endpoint.
RETENTION_CRON_TOKEN=<shared-private-token>
```

`PORT` is injected by Render; do not set it manually. After a deploy, if Render reports a failed deploy while `https://<api-domain>/up` still returns 200, check the Render health-check path (`/up`), that the service is listening on the injected `PORT`/`0.0.0.0`, and the deploy logs for a failed `config:cache`/`route:cache` (for example a missing `APP_KEY`). Render free instances also cold-start, so the first request can return 503 until the instance boots.

## Google sign-in, email and CAPTCHA (Render + Vercel)

Decisions: [`decisions/2026-11-13-google-sign-in.md`](decisions/2026-11-13-google-sign-in.md), [`decisions/2026-11-21-email-verification-and-password-reset.md`](decisions/2026-11-21-email-verification-and-password-reset.md), [`decisions/2026-11-21-captcha-turnstile.md`](decisions/2026-11-21-captcha-turnstile.md). Values below are placeholders; real values go only into Render and Vercel settings, never into Git.

Additional Render variables (restart the service after changing them, config is cached at start):

```dotenv
# Public web host (Vercel). Used for links in emails and the cookie session.
FRONTEND_URL=https://knowledge-hub-website-eight.vercel.app
SANCTUM_STATEFUL_DOMAINS=knowledge-hub-website-eight.vercel.app
SESSION_SECURE_COOKIE=true

# Google sign-in. The redirect URI points at VERCEL, not Render.
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
GOOGLE_REDIRECT_URI=https://knowledge-hub-website-eight.vercel.app/api/auth/google/callback
GOOGLE_ALLOWED_DOMAINS=gmail.com,*.edu,*.edu.vn

# CAPTCHA (Cloudflare Turnstile secret key)
TURNSTILE_SECRET_KEY=<turnstile-secret-key>

# Email through Brevo SMTP. Port 2525: Render's free tier blocks 25, 465 and 587.
MAIL_MAILER=smtp
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=2525
MAIL_USERNAME=<brevo-smtp-login>
MAIL_PASSWORD=<brevo-smtp-key>
MAIL_SCHEME=
MAIL_FROM_ADDRESS=<sender-confirmed-in-brevo>
MAIL_FROM_NAME=KnowledgeHub
```

`MAIL_PASSWORD` is the Brevo **SMTP key**, not an API key. Leave `MAIL_SCHEME` empty (plain SMTP with STARTTLS negotiation on 2525).

### Google Cloud Console

1. APIs & Services → OAuth consent screen: set the publishing status to **In production** (in Testing mode only listed test users can sign in).
2. APIs & Services → Credentials → the OAuth client (Web application) → **Authorized redirect URIs**: add `https://knowledge-hub-website-eight.vercel.app/api/auth/google/callback`. It must match `GOOGLE_REDIRECT_URI` exactly.
3. Copy the client id and secret into Render (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

### Cloudflare Turnstile

1. Cloudflare dashboard → Turnstile → Add widget. Hostname: only `knowledge-hub-website-eight.vercel.app` (do not add `localhost`; development uses Cloudflare's test keys).
2. Copy the **site key** into Vercel as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and redeploy the frontend; copy the **secret key** into Render as `TURNSTILE_SECRET_KEY`.

### Brevo

1. Brevo → SMTP & API → SMTP: note the **SMTP login** (`MAIL_USERNAME`) and create an **SMTP key** (`MAIL_PASSWORD`).
2. Senders, Domains & Dedicated IPs → Senders: add and confirm the address used as `MAIL_FROM_ADDRESS` (click the link Brevo emails to it).
3. Known issue: with a `gmail.com` sender Brevo replaces the sender address with its own, so mail often lands in **Spam**. The lasting fix is a domain you own, verified in Brevo (SPF/DKIM). If port 2525 is also blocked, fall back to Brevo's HTTPS API or a paid Render plan.

### Try the mail flow on the deployed site

1. Register with a real mailbox, solve the CAPTCHA; the screen says to check the inbox.
2. Open the mail (**check Spam**), click the link within 60 minutes; the account becomes active.
3. Use "Forgot password" with the same address; open the reset mail, set a new password, and confirm other sessions were signed out.
4. If nothing arrives, check Render logs for SMTP errors (blocked port, wrong login), then Brevo → Transactional → Logs.

Known limit: sign-in sessions use the file driver on Render and are lost on every deploy or restart, so users must sign in again after a deploy.

## Scheduled deployment workflows

Both workflows run from the repository default branch. Lint changes with `actionlint` before pushing.

- `.github/workflows/ai-service-keepwarm.yml` — every 10 minutes (`*/10 * * * *`), pings the Laravel API `/up` and the FastAPI `/health` endpoint to keep free Render instances warm. Cold-start failures are tolerated (`|| true`); check the run log for the reported HTTP status and latency.
- `.github/workflows/ai-retention.yml` — daily at 20:00 UTC (03:00 Asia/Ho_Chi_Minh), calls `POST https://knowledgehub-website.onrender.com/api/internal/ai/purge-deleted-users` with `X-Retention-Token: ${{ secrets.RETENTION_CRON_TOKEN }}` and fails unless the response is 200. The `RETENTION_CRON_TOKEN` repository secret must match the Render variable; if the Render variable is empty the endpoint returns 503.

## Local Docker environment

Prerequisites: Docker Desktop with Compose support, Git, and a checkout of this repository.

From the repository root:

```powershell
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Configured local endpoints:

| Service | Address | Notes |
|---|---|---|
| Next.js frontend | `http://localhost:3000` | Development server |
| Nginx / Laravel-facing endpoint | `http://localhost:8080` | PHP-FPM-backed web server |
| PostgreSQL | `localhost:5432` | Local development database only |

The current Compose configuration sets local database credentials in `docker-compose.yml`. They are development-only; never reuse them in production. The app service connects internally to host `postgres`, port `5432`.

When the app container has finished bootstrapping Laravel, initialize the local application/database as needed:

```powershell
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate
docker compose exec app php artisan db:seed
```

`migrate:fresh --seed` drops and recreates schema data. Use only for disposable local databases:

```powershell
docker compose exec app php artisan migrate:fresh --seed
```

## Supabase PostgreSQL configuration

Supabase is used as a managed PostgreSQL target, not as authorization to bypass the Laravel API. Configure the Laravel runtime with private environment variables supplied by the hosting environment or a secret manager:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://<api-domain>
DB_CONNECTION=pgsql
DB_HOST=<supabase-database-host>
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=<database-user>
DB_PASSWORD=<database-password>
DB_SSLMODE=require
```

Use the connection details from the Supabase Dashboard. Confirm whether the deployment environment can reach the chosen direct or pooled database endpoint and use the corresponding host, port, username, and SSL requirements supplied by Supabase. Do not commit `.env`, passwords, access tokens, or private keys. Never use `service_role` or a database password in `NEXT_PUBLIC_*` frontend variables.

Before applying migrations to a managed database:

1. Verify project and environment (development/staging/production) explicitly.
2. Confirm the latest database backup and restore procedure.
3. Review pending migrations and their rollback/data-loss behavior.
4. Test migration against a non-production database using a compatible PostgreSQL version.
5. Apply only approved, additive migrations through the controlled release process.
6. Run application smoke tests and inspect migration results.

Do not run `migrate:fresh` against Supabase or any shared/production database. Ensure database migrations run through Laravel's standard migration repository against the PostgreSQL driver; the application source and migrations are tracked under `backend/` and `database/`.

## Frontend environment

The frontend Docker Compose service currently sets:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

For a deployed frontend, set `NEXT_PUBLIC_API_URL=/api` and `BACKEND_INTERNAL_URL=<Laravel API origin>` so the host serving the pages also serves `/api` (see the Vercel settings below). `NEXT_PUBLIC_*` values are browser-visible and must not contain secrets.

Vercel project settings for the live frontend:

- **Root directory:** `frontend` (the Next.js application lives there, not at the repository root).
- **Install command:** `npm ci` (a committed `package-lock.json` is present).
- **Build command:** `npm run build`; **output:** Next.js default (`.next`).
- **Environment variables** (Production; add Preview too if previews call the API): `NEXT_PUBLIC_API_URL=/api`, `BACKEND_INTERNAL_URL=https://knowledgehub-website.onrender.com`, and `NEXT_PUBLIC_TURNSTILE_SITE_KEY=<Turnstile site key>` (public by design). Keep the `/api` suffix; the client appends `/v1/...`.
- **Why `/api` and not the Render URL:** the previous setting pointed the browser straight at Render, a different site from Vercel. The session policy (`docs/decisions/2026-11-03-session-policy.md`) needs a first-party cookie, and Google sign-in is a browser navigation that must return to the same host. With `NEXT_PUBLIC_API_URL=/api`, the browser talks to the Vercel host only and `frontend/next.config.mjs` forwards `/api/*` to `BACKEND_INTERNAL_URL` (Render). CORS is no longer involved for the web app.
- **Redeploy required:** `NEXT_PUBLIC_*` values are inlined at build time and the `/api` rewrite is read at build time too. After changing any of these variables in Vercel, trigger a new deployment; editing the variable alone does not update the running site.

No `vercel.json` is required: Next.js 14 is auto-detected from `frontend/package.json`, and the checked-in `next.config.mjs` uses the default build/output. Add one only if a concrete need appears (for example custom headers, redirects, or a non-default build command).

`frontend/.env.local.example` also documents optional Supabase browser client values. A publishable key is designed for public clients; it is not a substitute for authorization. Direct browser database access is not the approved architecture. Do not enable it for application data without an approved architecture/security decision, RLS policies, and least-privilege grants.

Build the frontend from `frontend/` for a production artifact:

```powershell
npm ci
npm run build
npm run start
```

The checked-in `frontend/Dockerfile` starts Next.js in development mode; production deployment needs a reviewed production image/process configuration before that Dockerfile is used as a production artifact.

## Production checklist

- [ ] Approved production hosting for frontend, Laravel/PHP-FPM, and Nginx selected.
- [ ] Laravel application source is present, version-controlled, and tested; runtime-generated source is not a release artifact.
- [ ] `APP_ENV=production`, `APP_DEBUG=false`, strong generated `APP_KEY`, canonical HTTPS `APP_URL`.
- [ ] Secrets managed outside Git and injected only into trusted server-side services.
- [ ] Supabase production project, database credentials, SSL, backups, restore test, and network access verified.
- [ ] Migrations reviewed and applied through a controlled release; no destructive reset commands.
- [ ] Frontend API URL, CORS allowlist, TLS, and authentication/session security verified.
- [ ] Authorization enforced by Laravel; RLS and grants reviewed before exposing any database table through Supabase Data API.
- [ ] Production logs, health checks, error monitoring, and rollback procedure defined.
- [ ] AI service and S3 deployment/health verified where enabled; keep S3 unavailable until separately deployed and integrated.

## Rollback and incidents

Application rollback must use a previously built, compatible release. Database rollback can lose data or break an older application version; assess the migration and restore plan before acting. For incidents involving data loss, exposure of credentials, or destructive SQL, stop deployment, revoke affected credentials, preserve logs/backups, and follow the team's incident process.

For local development instructions, see [`SETUP.md`](SETUP.md). For component boundaries and implementation status, see [`PROJECT-ARCHITECTURE.md`](PROJECT-ARCHITECTURE.md) and [`ARCHITECTURE.md`](ARCHITECTURE.md).