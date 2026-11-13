# Decision: Shared cloud database for local development

**Status**: Approved

**Date**: 2026-11-13

**Author**: Project team, as confirmed by project owner

**Related**: `2026-10-07-use-supabase-postgresql.md`

## Context

The team needs locally hosted application services to share the existing
Supabase database without keeping an application server running continuously.

## Decision

Docker Compose runs Laravel, nginx, Next.js and the AI service locally. Laravel
connects to the team's shared Supabase PostgreSQL using private environment
settings and TLS. This supersedes the earlier decision that local application
development uses the Compose PostgreSQL database. Automated tests instead use
an isolated, disposable PostgreSQL container and must never target shared data.
No schema, application authorization or API contract change is implied.

## Consequences

Development requires network access and can modify shared data. A database
backup and a least-privilege account are needed; code-level test guards cannot
protect against arbitrary database commands. The Supabase session pooler is an
option on IPv4 networks; connection details come from the project dashboard.

## Alternatives Considered

An entirely local database does not provide the requested shared data. A hosted
application server would require continuous hosting and was not chosen.

## Implementation and validation

Keep credentials outside Git; follow `docs/DEV_CHEATSHEET.md`. Verify the
read-only catalog endpoint, isolated tests, and service health. Never run
destructive test setup against the shared database.
