# KnowledgeHub Database & Data Engineering Skills

**Purpose**: Reusable AI agent skills for database and data engineering tasks in KnowledgeHub project.

**Compatible Agents**: Cline, Cursor, and other AI coding assistants supporting skill-based workflows.

## Skills Overview

### 1. database-design
**Focus**: Relational schema design, ERD modeling, migrations, constraints

**Use when**:
- Creating or modifying tables, indexes, constraints
- Evaluating entity relationships and normalization
- Reviewing schema changes before implementation
- Investigating foreign key cascades and deletion behavior

**Key patterns**: UUID PKs, timestampTz, explicit FKs with cascades, VARCHAR+CHECK enums

### 2. postgresql-sql
**Focus**: Query writing, optimization, execution plans, transactions

**Use when**:
- Writing SELECT, INSERT, UPDATE, DELETE statements
- Optimizing slow queries or debugging constraint violations
- Implementing triggers, functions, or views
- Reviewing SQL before execution

**Key patterns**: Parameter binding, soft-delete filters, CTEs, EXPLAIN ANALYZE

### 3. data-pipelines
**Focus**: ETL/ELT development, idempotency, error handling

**Use when**:
- Building data ingestion from external sources
- Implementing transformation logic
- Designing batch or incremental processing
- Migrating data between schema versions

**Key patterns**: Idempotent upserts, transactional loads, incremental watermarks

### 4. data-quality-testing
**Focus**: Constraint validation, data integrity checks, reconciliation

**Use when**:
- Writing tests for schema or constraints
- Validating data after migrations or pipeline execution
- Investigating data quality issues
- Implementing reconciliation checks

**Key patterns**: Constraint violation tests, orphan detection, reconciliation queries

## Skill Structure

Each skill directory contains:
- `skill.md` → Complete skill definition with purpose, workflow, examples, safety rules

## How AI Agents Use Skills

**Cline**: Automatically discovers skills in `skills/` directory. When you work on database tasks, Cline references the appropriate skill for guidance.

**Manual activation**: You can explicitly invoke a skill by mentioning it in your request (e.g., "Use database-design skill to create a new table for...").

**Coordination**: Skills reference each other when tasks overlap (e.g., database-design coordinates with postgresql-sql for query patterns).

## Project Context

Skills are designed specifically for KnowledgeHub's technology stack:
- PostgreSQL 16
- Laravel 11 migrations and Eloquent ORM
- Docker Compose development environment
- Future Python data pipelines

See `docs/DATABASE.md` for schema conventions and `AGENTS.md` for general AI agent guidelines.

## Maintenance

**When to update skills**:
- New project conventions adopted
- Common patterns emerge from implementation
- Mistakes identified in production
- Technology stack changes

**How to update**:
1. Edit `skills/[skill-name]/skill.md`
2. Update examples to reflect current patterns
3. Commit changes with clear description
4. All team members get updates on next pull

## Safety

Skills enforce safety rules:
- Never commit secrets or credentials
- Never run destructive operations without approval
- Always test constraints after schema changes
- Always use parameter binding for SQL queries
- Always use transactions for multi-step operations

Violations of safety rules should be treated as critical issues.

## Getting Started

New to the project? Follow this sequence:

1. Read `docs/SETUP.md` → Development environment setup
2. Read `AGENTS.md` → AI agent collaboration guidelines
3. Read `docs/DATABASE.md` → Current schema design
4. Browse skills → Understand available patterns
5. Start contributing → AI agent will guide you using skills

## Contributing

To propose skill improvements:
1. Create a branch
2. Edit skill file with your changes
3. Test the updated guidance on a real task
4. Submit PR with explanation of improvement
5. Team reviews and merges

Keep skills practical. Focus on actionable workflows, not theoretical explanations.
