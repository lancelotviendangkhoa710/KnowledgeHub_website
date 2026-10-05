# Development Setup Guide

**Target**: New team members setting up KnowledgeHub development environment  
**Role**: Database & Data Engineering  
**OS**: Windows (primary), Linux/Mac (community-supported)

## Prerequisites

Install required tools:

1. **Git** → https://git-scm.com/downloads
2. **Docker Desktop** → https://www.docker.com/products/docker-desktop
3. **VS Code** (recommended) → https://code.visualstudio.com/
4. **Cline Extension** (for AI assistance) → VS Code marketplace

## Repository Setup

```powershell
# Clone repository
git clone <repository-url>
cd knowledgehub

# Verify directory structure
dir

# Should see: backend/, docker/, docs/, skills/, README.md, AGENTS.md
```

## Environment Configuration

```powershell
# No additional setup required for local development
# Docker Compose manages PostgreSQL connection

# PostgreSQL connection details (development only):
# Host: localhost
# Port: 5432
# Database: knowledgehub
# User: knowledgehub
# Password: secret (development only, never commit)
```

## Start Services

```powershell
# Start Docker containers
docker compose up -d

# Wait ~60s for Laravel dependencies installation
# Check logs: docker compose logs -f app

# Copy environment file (first time only)
docker compose exec app cp .env.example .env

# Generate application key
docker compose exec app php artisan key:generate

# Run migrations
docker compose exec app php artisan migrate

# Seed development data
docker compose exec app php artisan db:seed
```

## Verify Installation

```powershell
# Check PostgreSQL connection
docker compose exec postgres psql -U knowledgehub -d knowledgehub -c "\dt"

# Should list tables: users, roles, articles, categories, etc.

# Run tests
docker compose exec app php artisan test

# Should show all tests passing
```

## AI Agent Setup (Cline)

Cline automatically discovers skills in `skills/` directory. No additional configuration required.

**Verify skill availability**:
1. Open VS Code in repository root
2. Open Cline panel
3. Skills should appear in skill list: `database-design`, `postgresql-sql`, `data-pipelines`, `data-quality-testing`

**Usage**: When working on database tasks, Cline will automatically use relevant skills for guidance.

## Development Workflow

### Database Schema Changes

```powershell
# Create migration
docker compose exec app php artisan make:migration create_new_table

# Edit migration file in database/migrations/

# Run migration
docker compose exec app php artisan migrate

# Rollback if needed
docker compose exec app php artisan migrate:rollback

# Update documentation
# - docs/DATABASE.md (table description, constraints)
# - docs/ERD.md (relationship diagram)
```

### Testing Changes

```powershell
# Run constraint validation tests
docker compose exec postgres psql -U knowledgehub -d knowledgehub -f /app/docs/validation_tests.sql

# Run Laravel tests
docker compose exec app php artisan test

# Run specific test file
docker compose exec app php artisan test tests/Feature/ArticleTest.php
```

### Inspecting Database

```powershell
# Connect to PostgreSQL
docker compose exec postgres psql -U knowledgehub -d knowledgehub

# Useful commands:
# \dt              → List tables
# \d tablename     → Show table structure
# \di              → List indexes
# \df              → List functions
# \q               → Quit
```

## Common Issues

### Docker containers won't start
```powershell
# Check if ports 5432, 80, 8000 are available
netstat -ano | findstr :5432

# Stop conflicting services or change ports in docker-compose.yml
```

### Migration fails
```powershell
# Reset database (WARNING: destroys all data)
docker compose exec app php artisan migrate:fresh --seed

# Or manually drop/create database
docker compose exec postgres psql -U knowledgehub -c "DROP DATABASE knowledgehub;"
docker compose exec postgres psql -U knowledgehub -c "CREATE DATABASE knowledgehub;"
```

### Permission errors
```powershell
# Ensure Docker Desktop is running with admin privileges
# Restart Docker Desktop
```

## Next Steps

1. Read `docs/DATABASE.md` to understand schema design
2. Review existing migrations in `database/migrations/`
3. Explore skills in `skills/` directory
4. Check `AGENTS.md` for AI agent collaboration guidelines
5. Review `docs/ERD.md` for entity relationships

## Getting Help

- **Documentation**: `docs/` directory
- **AI Assistance**: Use Cline with database skills
- **Project Context**: `README.md`, `AGENTS.md`
- **Existing Code**: `database/migrations/` and `database/seeders/`

Ready to contribute! Start by picking an issue or discussing with team.
