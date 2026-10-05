# AI Agent Instructions for KnowledgeHub

**Audience**: AI coding agents (Cline, Cursor, Copilot, etc.)  
**Scope**: Database and Data Engineering work  
**Version**: 1.0 | 2026-10-02

## Project Overview

KnowledgeHub is a collaborative knowledge-sharing platform with AI Learning Companion.

**Technology Stack**:
- Backend: Laravel 11 REST API
- Database: PostgreSQL 16
- Frontend: Next.js / React
- Data/AI Service: Python + FastAPI (planned)
- Infrastructure: Docker Compose

**Your Responsibilities**: Database schema design, query optimization, data pipeline development, and data quality validation.

## Core Principles

1. **Read before writing**: Always inspect `docs/DATABASE.md`, `docs/ERD.md`, and existing migrations before schema changes
2. **Follow conventions**: UUID PKs, timestampTz timestamps, explicit foreign keys with cascade rules, VARCHAR+CHECK for enums
3. **Test constraints**: Run `docs/validation_tests.sql` after schema changes
4. **Document decisions**: Update `docs/DATABASE.md` and `docs/ERD.md` after approved schema changes
5. **Never commit secrets**: Use `.env.example` templates, never real credentials

## Skill System

Four specialized skills in `skills/` directory guide implementation:

1. **database-design** → Schema design, ERD modeling, migrations, constraints
2. **postgresql-sql** → Query writing, optimization, execution plans, transactions
3. **data-pipelines** → ETL/ELT development, idempotency, error handling
4. **data-quality-testing** → Constraint validation, data integrity checks, reconciliation

**Activation**: When working on database/data tasks, consult the relevant skill for workflow, examples, and safety rules.

## Development Environment

```bash
# Start services
docker compose up -d

# Laravel migrations
docker compose exec app php artisan migrate:fresh --seed

# PostgreSQL access
docker compose exec postgres psql -U knowledgehub -d knowledgehub

# Run tests
docker compose exec app php artisan test
```

## Safety Rules

### Always Required
- Migrations with rollback support for schema changes
- Parameter binding for all SQL queries (prevent injection)
- Soft-delete filters (`deleted_at IS NULL`) in queries
- Transaction boundaries for multi-step operations
- Constraint testing after schema changes

### Never Allowed
- Dropping tables/columns without team approval
- Disabling constraints to "fix" errors
- Storing plaintext passwords or API keys
- Running UPDATE/DELETE without WHERE in production
- Committing `.env` files or credentials
- Exposing database publicly

## Documentation Structure

- `docs/DATABASE.md` → Schema design, constraints, principles
- `docs/ERD.md` → Entity-relationship diagrams by domain
- `docs/validation_tests.sql` → Constraint test cases
- `docs/decisions/` → Architecture decision records (create when needed)
- `database/migrations/` → Laravel migrations (version-controlled)

## Decision Workflow

When proposing major changes (new tables, schema refactoring, pipeline architecture):

1. Read current implementation and documentation
2. Explain proposed change and impact
3. Wait for approval if it alters approved architecture
4. Implement with tests and documentation updates
5. Mark decision as "Implemented" in documentation

Do not treat previous AI suggestions as approved team decisions.

## Testing Requirements

- Schema constraints: Test violations produce expected errors
- Queries: EXPLAIN ANALYZE shows efficient execution plans
- Pipelines: Idempotency verified (run twice = same result)
- Integration: End-to-end workflows tested in development
- Data quality: Validation queries return zero failures

## Common Pitfalls

- Using `integer` instead of `uuid` for keys
- Omitting foreign key cascade rules
- Missing indexes on frequently joined columns
- Not filtering soft-deleted records
- Hardcoding configuration instead of environment variables
- Testing only happy paths, not constraint violations

## Getting Help

- Detailed documentation: `docs/` directory
- Existing patterns: `database/migrations/`
- Skill workflows: `skills/*/skill.md`
- Project context: `README.md`

**Priority**: Correctness > Speed. Read existing code, follow patterns, test thoroughly.
