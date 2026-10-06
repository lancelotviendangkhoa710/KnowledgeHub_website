# KnowledgeHub

Curated learning platform with AI Learning Companion.

KnowledgeHub is operated by an internal content team. Contributors create and publish courses; Users discover, enroll, and learn; Admins manage the platform.

## Stack

- **Frontend**: Next.js / React
- **Backend**: Laravel 11 REST API
- **Database**: PostgreSQL 16 / Amazon Aurora PostgreSQL
- **AI Service**: Python + FastAPI (future)
- **File Storage**: Amazon S3 (future)
- **Dev Environment**: Docker Compose

## Quick Start

```bash
# 1. Start services
docker compose up -d

# 2. Install Laravel dependencies (first run only â€“ entrypoint handles it)
# Wait ~60s for Laravel to be installed and for postgres to be healthy

# 3. Copy env
docker compose exec app cp .env.example .env
docker compose exec app php artisan key:generate

# 4. Run migrations
docker compose exec app php artisan migrate

# 5. Seed development data
docker compose exec app php artisan db:seed
```

## Documentation

### For Developers
- [`docs/SETUP.md`](docs/SETUP.md) â€“ Complete development environment setup guide
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) â€“ System architecture, components, domain boundaries
- [`docs/DATABASE.md`](docs/DATABASE.md) â€“ Schema design, constraints, deletion policies
- [`docs/ERD.md`](docs/ERD.md) â€“ Entity-relationship diagrams by domain
- [`docs/API.md`](docs/API.md) â€“ API contract reference (contract-first boundary)

### For AI Agents
- [`AGENTS.md`](AGENTS.md) â€“ Global AI agent constitution (start here)
- [`backend/AGENTS.md`](backend/AGENTS.md) â€“ Backend-specific agent rules
- [`skills/`](skills/) â€“ Specialized skills for database and data engineering tasks

### For Team Collaboration
- [`docs/team/OWNERSHIP.md`](docs/team/OWNERSHIP.md) â€“ Domain ownership with allowed/forbidden paths
- [`docs/team/WORKFLOW.md`](docs/team/WORKFLOW.md) â€“ Git workflow, PR rules, hotspot inventory
- [`docs/team/FEATURES.md`](docs/team/FEATURES.md) â€“ Feature registry by domain
- [`docs/team/TASK_TEMPLATE.md`](docs/team/TASK_TEMPLATE.md) â€“ Task template for AI agents
- [`docs/decisions/`](docs/decisions/) â€“ Architecture decision records (ADRs)

## Development

```bash
# Shell into app container
docker compose exec app sh

# Run all migrations fresh with seed data
docker compose exec app php artisan migrate:fresh --seed

# Inspect PostgreSQL schema
docker compose exec postgres psql -U knowledgehub -d knowledgehub -c "\dt"

# Run tests
docker compose exec app php artisan test
```

## Project Structure

```
knowledgehub/
â”œâ”€â”€ AGENTS.md             # Global AI agent constitution
â”œâ”€â”€ backend/              # Laravel 11 REST API
â”‚   â””â”€â”€ AGENTS.md         # Backend-specific agent rules
â”œâ”€â”€ database/             # Database files (mounted into container)
â”‚   â”œâ”€â”€ migrations/       # Schema migrations
â”‚   â”œâ”€â”€ seeders/          # Development data
â”‚   â””â”€â”€ factories/        # Model factories
â”œâ”€â”€ docs/                 # Technical documentation
â”‚   â”œâ”€â”€ ARCHITECTURE.md   # System architecture (implemented + planned)
â”‚   â”œâ”€â”€ API.md            # API contract reference
â”‚   â”œâ”€â”€ DATABASE.md       # Schema reference
â”‚   â”œâ”€â”€ ERD.md            # Entity relationships
â”‚   â”œâ”€â”€ SETUP.md          # Setup guide
â”‚   â”œâ”€â”€ validation_tests.sql
â”‚   â”œâ”€â”€ decisions/        # Architecture decision records (ADRs)
â”‚   â””â”€â”€ team/             # Team collaboration docs
â”‚       â”œâ”€â”€ OWNERSHIP.md  # Domain ownership and allowed paths
â”‚       â”œâ”€â”€ WORKFLOW.md   # Git workflow and hotspot inventory
â”‚       â”œâ”€â”€ FEATURES.md   # Feature registry by domain
â”‚       â””â”€â”€ TASK_TEMPLATE.md  # AI agent task template
â”œâ”€â”€ skills/               # AI agent skills for DB/data work
â”‚   â”œâ”€â”€ database-design/
â”‚   â”œâ”€â”€ postgresql-sql/
â”‚   â”œâ”€â”€ data-pipelines/
â”‚   â””â”€â”€ data-quality-testing/
â”œâ”€â”€ scripts/              # Helper scripts for agent workflow
â”‚   â”œâ”€â”€ agent-start-task.ps1
â”‚   â”œâ”€â”€ agent-finish-task.ps1
â”‚   â””â”€â”€ create-pr.ps1
â””â”€â”€ docker/               # Container configuration
```

## Contributing

1. Read [`docs/SETUP.md`](docs/SETUP.md) for environment setup
2. Review [`AGENTS.md`](AGENTS.md) if using AI coding assistants
3. Check [`docs/DATABASE.md`](docs/DATABASE.md) for schema conventions
4. Create a task branch from `dev` (never work directly on `main` or `dev`)
5. Make changes with tests and documentation updates
6. Submit pull request with clear description

## License

TBD

