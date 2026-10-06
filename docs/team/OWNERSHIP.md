# docs/team/OWNERSHIP.md â€” Domain Ownership Registry

**Version**: 1.0 | **Date**: 2026-10-06
**Update policy**: Update this file when ownership changes. Requires team agreement.

> Names `TEAM_MEMBER_A/B/C` are placeholders. Replace with actual GitHub usernames when known.
> Ownership = backend + frontend (when exists) + DB migrations + tests for that domain.
> Each member owns their domain end-to-end to minimize blocking dependencies.

---

## Ownership Matrix

| Domain | Owner | Branch Prefix | Risk |
|---|---|---|---|
| Identity / Auth | TEAM_MEMBER_A | `p1/` | High |
| Content | TEAM_MEMBER_B | `p2/` | Medium |
| Learning / Engagement | TEAM_MEMBER_C | `p3/` | Medium |
| Infrastructure | TEAM_MEMBER_C | `p3/` | Very High |
| AI Companion | TBD | TBD | High |
| Payment | TBD | TBD | High |
| Architecture / ADRs | Team approval | Any | Very High |

---

## TEAM_MEMBER_A â€” Identity / Auth

### Allowed Write Paths
```
backend/app/Http/Controllers/Auth/
backend/app/Http/Requests/Auth/
backend/app/Models/User.php
backend/app/Models/Role.php
backend/app/Policies/UserPolicy.php
backend/app/Services/Auth/
database/migrations/<timestamp>_<auth-related>.php
tests/Feature/Auth/
tests/Unit/Auth/
```

### Database Tables Owned
```
users
roles
user_roles
```

### Coordination Required (announce in PR before touching)
```
backend/routes/api.php              â† add auth routes only; minimal change
backend/app/Http/Middleware/        â† any new or modified middleware
backend/app/Providers/              â† service provider changes
backend/bootstrap/app.php           â† application bootstrap
```

### Forbidden (cross-domain â€” requires explicit approval)
```
backend/app/Http/Controllers/Content/
backend/app/Http/Controllers/Learning/
database/migrations/*_articles*.php
database/migrations/*_learning*.php
database/migrations/*_payment*.php
```

---

## TEAM_MEMBER_B â€” Content

### Allowed Write Paths
```
backend/app/Http/Controllers/Content/
backend/app/Http/Requests/Content/
backend/app/Models/Article.php
backend/app/Models/ArticleVersion.php
backend/app/Models/Category.php
backend/app/Models/Tag.php
backend/app/Models/Bookmark.php
backend/app/Models/ArticleAttachment.php
backend/app/Policies/ArticlePolicy.php
backend/app/Services/Content/
database/migrations/<timestamp>_<content-related>.php
tests/Feature/Content/
tests/Unit/Content/
```

### Database Tables Owned
```
categories
articles
article_versions
tags
article_tags
bookmarks
article_attachments
```

### Coordination Required
```
backend/routes/api.php              â† add content routes only
backend/app/Http/Middleware/
backend/app/Providers/
```

### Forbidden
```
backend/app/Http/Controllers/Auth/
backend/app/Http/Controllers/Learning/
database/migrations/*_users*.php
database/migrations/*_roles*.php
database/migrations/*_learning*.php
```

---

## TEAM_MEMBER_C â€” Learning / Engagement + Infrastructure

### Allowed Write Paths
```
backend/app/Http/Controllers/Learning/
backend/app/Http/Requests/Learning/
backend/app/Models/LearningRoadmap.php
backend/app/Models/RoadmapItem.php
backend/app/Models/LearningProgress.php
backend/app/Policies/RoadmapPolicy.php
backend/app/Services/Learning/
database/migrations/<timestamp>_<learning-related>.php
database/seeders/CategorySeeder.php
database/seeders/PlanSeeder.php
tests/Feature/Learning/
tests/Unit/Learning/
docker/
docker-compose.yml
```

### Database Tables Owned
```
learning_roadmaps
roadmap_items
learning_progress
roadmap_item_prerequisites
```

### Coordination Required
```
backend/routes/api.php              â† add learning routes only
database/seeders/DatabaseSeeder.php â† orchestrates all seeders
.github/workflows/                  â† team discussion first
```

### Forbidden
```
backend/app/Http/Controllers/Auth/
backend/app/Http/Controllers/Content/
database/migrations/*_users*.php
database/migrations/*_articles*.php
```

---

## Shared / Protected Areas (No Single Owner)

These require **explicit team coordination** before any modification:

```
AGENTS.md
backend/AGENTS.md
docs/DATABASE.md
docs/ERD.md
docs/ARCHITECTURE.md
docs/API.md
docs/decisions/
docs/team/OWNERSHIP.md      â† this file
docker-compose.yml          â† TEAM_MEMBER_C owns but others must coordinate
.github/workflows/
.coderabbit.yaml
backend/.env.example
database/seeders/DatabaseSeeder.php
```

---

## TBD Domains â€” Ownership Unassigned

### AI Companion
```
Tables: conversations, messages, user_memories
Paths:  backend/app/Http/Controllers/AI/ (to be created)
        backend/app/Services/AI/ (to be created)
Owner:  UNASSIGNED â€” assign when AI phase begins (Development Sequence step 3)
```

### Payment
```
Tables: plans, subscriptions, payments, webhook_events
Paths:  backend/app/Http/Controllers/Payment/ (to be created)
        backend/app/Services/Payment/ (to be created)
Owner:  UNASSIGNED â€” assign when Payment phase begins (Development Sequence step 6)
```

---

## Cross-Domain Change Decision Flow

```
Agent detects cross-domain change needed
    â”‚
    â–¼
STOP â€” do not implement
    â”‚
    â–¼
Use BLOCKED format (root AGENTS.md Â§11)
    â”‚
    â–¼
Tag affected domain owner in PR / team chat
    â”‚
    â–¼
Wait for explicit authorization
    â”‚
    â–¼
Implement minimal change only after approval
```

---

## Update Process

When updating this file:
1. Discuss with team first
2. Create PR with `docs:` prefix commit
3. Get approval from all affected owners
4. Merge to dev
