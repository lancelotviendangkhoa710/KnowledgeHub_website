# KnowledgeHub — Deployment Guide

This guide distinguishes the configured local Docker environment from production components that still require deployment-specific setup. The approved stack is Laravel 11, Next.js/React, PostgreSQL 16 (Supabase PostgreSQL as managed target), and Docker Compose for local development.

## Current deployment readiness

- **Local:** Docker Compose configuration exists for app, PostgreSQL, Nginx, and frontend.
- **Backend:** PHP container bootstraps Laravel at runtime when the mounted `backend/` directory has no `artisan` file. Generated Laravel application source is not tracked.
- **Frontend:** Next.js Dockerfile runs the development server. It is not a production-hardened image.
- **Managed database:** Supabase is the approved PostgreSQL target, but project URL, database credentials, network access, and production deployment configuration must be supplied by the operator.
- **Production release:** No production orchestration, CI/CD workflow, hosted frontend/API target, or zero-downtime migration procedure is established in these files. Production deployment is not one-command ready.

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

Do not run `migrate:fresh` against Supabase or any shared/production database. Ensure database migrations are configured with Laravel's standard migration repository and PostgreSQL driver in the runtime bootstrap before deployment; application source/bootstrap is not currently tracked here.

## Frontend environment

The frontend Docker Compose service currently sets:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

For a deployed frontend, point `NEXT_PUBLIC_API_URL` at the deployed Laravel API origin and configure CORS, TLS, and trusted origins accordingly. This is a public browser-visible setting; it must not contain secrets.

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
- [ ] AI service and S3 are treated as unavailable until separately deployed and integrated.

## Rollback and incidents

Application rollback must use a previously built, compatible release. Database rollback can lose data or break an older application version; assess the migration and restore plan before acting. For incidents involving data loss, exposure of credentials, or destructive SQL, stop deployment, revoke affected credentials, preserve logs/backups, and follow the team's incident process.

For local development instructions, see [`SETUP.md`](SETUP.md). For component boundaries and implementation status, see [`PROJECT-ARCHITECTURE.md`](PROJECT-ARCHITECTURE.md) and [`ARCHITECTURE.md`](ARCHITECTURE.md).