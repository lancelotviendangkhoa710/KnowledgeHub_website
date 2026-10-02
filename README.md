# KnowledgeHub

Collaborative knowledge-sharing platform with AI Learning Companion.

## Stack

- **Frontend**: Next.js / React
- **Backend**: Laravel 11 REST API
- **Database**: PostgreSQL 16
- **AI Service**: Python + FastAPI (future)
- **File Storage**: Amazon S3 (future)
- **Dev Environment**: Docker Compose

## Quick Start

```bash
# 1. Start services
docker compose up -d

# 2. Install Laravel dependencies (first run only – entrypoint handles it)
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
- [`docs/SETUP.md`](docs/SETUP.md) – Complete development environment setup guide
- [`docs/DATABASE.md`](docs/DATABASE.md) – Schema design, constraints, deletion policies
- [`docs/ERD.md`](docs/ERD.md) – Entity-relationship diagrams by domain

### For AI Agents
- [`AGENTS.md`](AGENTS.md) – AI agent collaboration guidelines
- [`skills/`](skills/) – Specialized skills for database and data engineering tasks

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
├── backend/              # Laravel 11 REST API
│   └── database/
│       ├── migrations/   # Schema migrations
│       └── seeders/      # Development data
├── docs/                 # Technical documentation
│   ├── DATABASE.md       # Schema reference
│   ├── ERD.md            # Entity relationships
│   ├── SETUP.md          # Setup guide
│   └── decisions/        # Architecture decision records
├── skills/               # AI agent skills for DB/data work
│   ├── database-design/
│   ├── postgresql-sql/
│   ├── data-pipelines/
│   └── data-quality-testing/
├── docker/               # Container configuration
├── AGENTS.md             # AI agent instructions
└── README.md             # This file
```

## Contributing

1. Read [`docs/SETUP.md`](docs/SETUP.md) for environment setup
2. Review [`AGENTS.md`](AGENTS.md) if using AI coding assistants
3. Check [`docs/DATABASE.md`](docs/DATABASE.md) for schema conventions
4. Create feature branch from `main`
5. Make changes with tests and documentation updates
6. Submit pull request with clear description

## License

TBD

