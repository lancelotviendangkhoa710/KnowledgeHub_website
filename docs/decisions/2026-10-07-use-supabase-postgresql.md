# Decision: Use Supabase PostgreSQL

**Status**: Approved  
**Date**: 2026-10-07  
**Author**: Project owner  
**Related**: `docs/decisions/2026-10-06-architecture-techstack-locked.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`

## Context

KnowledgeHub requires managed PostgreSQL for production while retaining Laravel 11 as the REST API, application authorization, and database client.

## Decision

- Production database provider: Supabase PostgreSQL.
- Laravel 11 remains the only application client for KnowledgeHub data.
- Clients communicate with Laravel REST API only; no browser direct database access.
- Laravel Eloquent, migrations, seeders, Services, Policies, and Gates remain authoritative.
- Supabase Auth, Storage, Edge Functions, client SDK, and RLS are not adopted by this decision.
- Docker Compose PostgreSQL remains the local development/test database.
- Production Laravel uses Supabase connection values through deployment environment variables, with SSL required.

## Consequences

### Positive
- Managed PostgreSQL without changing Laravel application architecture.
- Existing PostgreSQL schema conventions and Laravel migration workflow remain valid.
- Local development stays self-contained with Docker Compose.

### Negative
- Laravel production hosting remains a separate deployment concern; Vercel does not run the PHP-FPM deployment in this repository.
- Supabase credentials must be configured in the Laravel host, never committed.

### Risks
- Pooler configuration can differ from direct connection configuration. Use the Supabase dashboard-provided host, port, database, username, password, and SSL settings for the selected connection mode.
- Do not use Supabase service-role credentials in clients.

## Implementation Notes

Production environment values are supplied by Supabase Dashboard → Project Settings → Database → Connect:

```dotenv
DB_CONNECTION=pgsql
DB_HOST=<supabase-host>
DB_PORT=<supabase-port>
DB_DATABASE=postgres
DB_USERNAME=<supabase-username>
DB_PASSWORD=<supabase-password>
DB_SSLMODE=require
```

When tracked Laravel source exists, configure `backend/config/database.php` to pass the required SSL option to PDO and verify with `php artisan migrate --force` against a non-production Supabase project first.

## Validation

- Laravel production environment connects using SSL.
- `php artisan migrate --force` succeeds against a designated Supabase environment.
- Laravel authorization tests continue to enforce guest/user/contributor/admin behavior.