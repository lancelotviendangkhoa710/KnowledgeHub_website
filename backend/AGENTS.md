# backend/AGENTS.md â€” Backend Agent Rules

**Scope**: Laravel 11 backend (`backend/` + `database/`)
**Parent**: Root `AGENTS.md` â€” global rules take precedence.

---

## 1. Backend State and Planned Structure

**Evidence**: only `backend/.env.example` is tracked. `backend/app/`, `backend/routes/`, `backend/tests/`, and `backend/composer.json` are absent. `docker/php/entrypoint.sh` can generate Laravel at runtime, but generated source is not tracked.

When the approved backend bootstrap task creates tracked application source, use this intended structure:

```
backend/app/Http/Controllers/  â† Thin controllers; delegate to Services
backend/app/Http/Middleware/   â† PROTECTED: shared; requires coordination
backend/app/Http/Requests/     â† Form Request validation
backend/app/Models/            â† Eloquent models
backend/app/Services/          â† Business logic layer
backend/app/Policies/          â† Laravel authorization (RBAC)
backend/app/Providers/         â† PROTECTED: requires coordination
backend/routes/api.php         â† HOTSPOT: shared route registry
backend/config/                â† PROTECTED: global config
backend/bootstrap/app.php      â† PROTECTED: application bootstrap

database/migrations/           â† Each agent adds NEW files only
database/seeders/              â† DatabaseSeeder.php is protected (p3)
```

Do not create the Laravel scaffold during a feature task unless the task explicitly authorizes the application-bootstrap scope. No `frontend/` or `ai-service/` exists yet â€” both are planned.

---

## 2. Domain Ownership â€” Write Paths

### TEAM_MEMBER_A â€” Identity / Auth

```
WRITE:
  backend/app/Http/Controllers/Auth/**
  backend/app/Http/Requests/Auth/**
  backend/app/Models/User.php  /  Role.php
  backend/app/Policies/UserPolicy.php
  backend/app/Services/Auth/**
  database/migrations/<new>_<auth-related>.php
  tests/Feature/Auth/**  /  tests/Unit/Auth/**

COORDINATION REQUIRED:
  backend/routes/api.php  (auth routes only â€” announce in PR)
  backend/app/Http/Middleware/**
  backend/app/Providers/**  /  backend/bootstrap/app.php
```

### TEAM_MEMBER_B â€” Content

```
WRITE:
  backend/app/Http/Controllers/Content/**
  backend/app/Http/Requests/Content/**
  backend/app/Models/Article.php  /  ArticleVersion.php  /  Category.php
  backend/app/Models/Tag.php  /  Bookmark.php  /  ArticleAttachment.php
  backend/app/Policies/ArticlePolicy.php
  backend/app/Services/Content/**
  database/migrations/<new>_<content-related>.php
  tests/Feature/Content/**  /  tests/Unit/Content/**

COORDINATION REQUIRED:
  backend/routes/api.php  (content routes only)
  backend/app/Http/Middleware/**  /  backend/app/Providers/**
```

### TEAM_MEMBER_C â€” Learning / Engagement + Infra

```
WRITE:
  backend/app/Http/Controllers/Learning/**
  backend/app/Http/Requests/Learning/**
  backend/app/Models/LearningRoadmap.php  /  RoadmapItem.php  /  LearningProgress.php
  backend/app/Policies/RoadmapPolicy.php
  backend/app/Services/Learning/**
  database/migrations/<new>_<learning-related>.php
  database/seeders/CategorySeeder.php  /  database/seeders/PlanSeeder.php
  tests/Feature/Learning/**  /  tests/Unit/Learning/**
  docker/**  /  docker-compose.yml

COORDINATION REQUIRED:
  backend/routes/api.php  (learning routes only)
  database/seeders/DatabaseSeeder.php
  .github/workflows/**   (team discussion first)
```

---

## 3. Route Registration â€” Hotspot Rules

`backend/routes/api.php` is shared. When editing:
- Add only routes for your domain
- Group with a clear comment block
- Do not remove or rename another domain's routes
- Do not reformat the file
- Announce additions in PR description

---

## 4. Backend Conventions

**Controllers** (thin): validate input â†’ authorize â†’ call service â†’ return response.
Standard response: `{ "data": ..., "message": ..., "status": "success|error" }`.
No raw SQL. No business logic in controllers.

**Models**: `$fillable` or `$guarded`. `SoftDeletes` trait where `deleted_at` exists. Explicit relationships.

**Services**: all business logic. `DB::transaction()` for multi-step writes. Typed exceptions.

**Requests**: Form Request for validation. `authorize()` uses Gate/Policy.

**Policies**: one per model. Test all four actors: guest / user / contributor / admin.

---

## 5. Database Rules

- Filter soft-deleted: `->whereNull('deleted_at')` or `SoftDeletes` scope
- Always use parameter binding â€” no raw string concatenation in SQL
- Wrap multi-step writes in `DB::transaction()`
- Never disable foreign key constraints to "fix" errors
- New migrations: new timestamped file only; never edit existing migrations

---

## 6. Authorization Rules

- Contributor edits own content only: `author_id = current_user.id`
- Only Admin grants Contributor or Admin roles
- Premium gating: check `subscriptions.status = 'active'`
- Every mutating method must call `$this->authorize()` or `Gate::authorize()`

---

## 7. Testing

```powershell
docker compose exec app php artisan test
docker compose exec app php artisan test tests/Feature/Auth/
docker compose exec app php artisan test tests/Feature/Content/
docker compose exec app php artisan test tests/Feature/Learning/
```

Required: happy path Â· validation failures Â· authorization failures Â· DB constraint violations Â· soft-delete behavior.

---

## 8. API Contract

Before new endpoint: check `docs/API.md`. If adding new endpoint: update `docs/API.md` in same PR. Never change existing endpoint signature without team coordination.

Pagination: `{ "data": [...], "meta": { "current_page": 1, "per_page": 15, "total": 100 } }`

---

## 9. Additional Stop Conditions

Stop and report when:
- Changing `bootstrap/app.php` or `Providers/` outside explicit task scope
- Middleware change affecting more than one domain
- New `composer.json` package without justification
- Raw SQL that cannot be verified injection-safe

---

*Global rules: root `AGENTS.md` â€” ownership, cross-domain protocol, output formats, git workflow, security.*
