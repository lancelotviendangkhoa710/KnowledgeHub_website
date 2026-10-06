# AGENTS.md â€” KnowledgeHub AI Agent Constitution

**Version**: 2.0 | **Date**: 2026-10-06
**Audience**: All AI coding agents (Cline, Cursor, Copilot, etc.)
**Scope**: Global â€” applies to every agent in this repository

Child files (`backend/AGENTS.md`) specialize these rules.
When child rules conflict with this file, **this file wins**.

---

## 1. Project Identity

KnowledgeHub is a **curated learning platform** with an AI Learning Companion. Operated by an internal content team. Contributors create and publish courses; Users learn; Admins manage the platform.

**NOT** a social platform. **NOT** a UGC platform. **NO** community moderation.

---

## 2. Technology Stack

| Layer | Technology | Status |
|---|---|---|
| Backend API | Laravel 11 REST API | âœ… Active |
| Database | PostgreSQL 16 / Amazon Aurora PostgreSQL | âœ… Active |
| Frontend | Next.js / React | ðŸ”œ Planned (not yet in repo) |
| Dev Environment | Docker Compose | âœ… Active |
| AI Service | Python + FastAPI | ðŸ”œ Planned (separate service) |
| File Storage | Amazon S3 | ðŸ”œ Planned |

Do NOT introduce technology not in this list without an approved ADR.

---

## 3. Source-of-Truth Hierarchy

```
1. Approved ADRs  (docs/decisions/)
2. Implemented code
3. Database schema / migrations
4. API contracts  (docs/API.md)
5. Domain docs  (docs/DATABASE.md, docs/ERD.md)
6. This file  (AGENTS.md)
7. Task-specific instructions
8. AI suggestions  â† LOWEST â€” never treated as approved architecture
```

Contradiction between approved architecture and implementation â†’ report using `ARCHITECTURE_CONFLICT` format (Â§14). Do NOT silently redesign.

---

## 4. Business Invariants (Locked)

### Roles â€” exactly 3

| Role | DB value | Description |
|---|---|---|
| Admin | `admin` | Full platform control |
| Contributor | `contributor` | Internal team; assigned by Admin only |
| User | `user` | Learner; default role on registration |

Guest = unauthenticated, no DB role.
**No** `reviewer`, `learner`, `moderator`, `editor`, `author`, `teacher`, `instructor`.
User does NOT auto-upgrade to Contributor. Admin grants explicitly.

### Publishing Workflow

```
Contributor creates â†’ status=draft
Contributor (or Admin) publishes â†’ status=published (published_version_id set)
Admin archives â†’ status=archived
```

No `submitted`, `rejected`, `pending_review`, `approved`, `moderated`. No review step.

### RBAC (enforced in Laravel Policy/Gate)

| Capability | Guest | User | Contributor | Admin |
|---|:---:|:---:|:---:|:---:|
| View published content | âœ… | âœ… | âœ… | âœ… |
| Register / Login | âœ… | â€” | â€” | â€” |
| Enroll, track progress | âŒ | âœ… | âœ… | âœ… |
| Bookmark, AI Companion, Roadmap | âŒ | âœ… | âœ… | âœ… |
| Subscribe to plan | âŒ | âœ… | âœ… | âœ… |
| Create / edit own courses | âŒ | âŒ | âœ… | âœ… |
| Publish / archive own content | âŒ | âŒ | âœ… own | âœ… |
| Manage all courses platform-wide | âŒ | âŒ | âŒ | âœ… |
| Manage users, roles, plans | âŒ | âŒ | âŒ | âœ… |

---

## 5. Database Conventions (Non-Negotiable)

| Convention | Rule |
|---|---|
| Primary keys | UUID v4 â€” every table |
| Timestamps | `timestampTz` everywhere |
| Foreign keys | Explicit FK + explicit cascade rule on every relation |
| Enumerations | `VARCHAR` + `CHECK` â€” never native PG ENUM |
| Monetary | `NUMERIC(12,2)` |
| Currency | `CHAR(3)` ISO 4217 + regex `[A-Z]{3}` |
| Flexible data | `JSONB` only where genuinely variable |
| File binary | S3 only â€” PG stores metadata only |
| Soft delete | `users` + content tables â€” `deleted_at` column |
| Secrets | Never stored â€” no plaintext passwords, API keys, card numbers |

---

## 6. Active Database Tables (25)

| Domain | Tables |
|---|---|
| A â€“ Identity | `users`, `roles`, `user_roles` |
| B â€“ Content | `categories`, `articles`, `article_versions`, `tags`, `article_tags`, `bookmarks`, `article_attachments` |
| C â€“ AI Companion | `conversations`, `messages`, `user_memories` |
| D â€“ Learning | `learning_roadmaps`, `roadmap_items`, `learning_progress`, `roadmap_item_prerequisites` |
| E â€“ Payment | `plans`, `subscriptions`, `payments`, `webhook_events` |

`article_reviews` exists in DB (dormant, old model). No application code may reference it. Pending drop migration â€” requires team approval.

---

## 7. Development Sequence (Approved)

1. Core platform â€” auth, users, roles
2. Course / content â€” categories, articles/courses, versions, attachments
3. AI Companion â€” conversations, messages, memories
4. RAG + long-term memory
5. AI roadmap generation
6. Premium / subscription

---

## 8. Ownership Model

| Domain | Owner | Risk |
|---|---|---|
| Identity / Auth | TEAM_MEMBER_A | High |
| Content | TEAM_MEMBER_B | Medium |
| Learning / Engagement | TEAM_MEMBER_C | Medium |
| AI Companion | TBD | High |
| Payment | TBD | High |
| Infrastructure | Shared | Very High |
| Architecture | Team approval | Very High |

Full path-level ownership: `docs/team/OWNERSHIP.md`.

---

## 9. Read Broadly, Write Narrowly

```
READ / SEARCH:  entire repository â€” always allowed
WRITE:          only files within the task's authorized domain
```

---

## 10. Protected / Shared Areas

Require explicit coordination before modification:

```
AGENTS.md  /  backend/AGENTS.md
docs/DATABASE.md  /  docs/ERD.md  /  docs/ARCHITECTURE.md  /  docs/API.md
docs/decisions/  /  docs/team/OWNERSHIP.md
docker-compose.yml  /  docker/  /  .github/workflows/  /  .coderabbit.yaml
database/seeders/DatabaseSeeder.php  /  backend/.env.example
```

`database/migrations/`: each agent adds **new** files only; never edit another agent's existing migration.

For all shared files: read freely, write only when the task explicitly requires it, make the smallest possible change, do not reformat unrelated sections.

---

## 11. Integration Hotspots

| File | Why Shared | Who May Edit |
|---|---|---|
| `database/migrations/` | All schema changes land here | Feature owner adds new files; never edit others' |
| `docker-compose.yml` | Shared infrastructure config | Infra owner (p3); others request changes |
| `.github/workflows/` | CI/CD pipeline | Team approval required |
| `docs/DATABASE.md` | Schema reference for all | After approved schema change only |
| `docs/ERD.md` | ER diagrams for all | After approved schema change only |
| `database/seeders/DatabaseSeeder.php` | Root seeder orchestration | Infra owner (p3) |

---

## 12. Cross-Domain Change Protocol

When a cross-domain change is required, STOP immediately and report:

```
BLOCKED â€” CROSS-DOMAIN CHANGE REQUIRED

Task:     <task ID and name>
Owner:    <TEAM_MEMBER_X>
Domain:   <affected domain>
Files:    <paths requiring modification>
Why:      <reason the change is needed>
Proposal: <minimal proposed change>
Risk:     <risk if implemented>
Waiting:  <decision needed from team>

DO NOT IMPLEMENT THE BLOCKED CHANGE AUTOMATICALLY.
```

Do not work around ownership boundaries by duplicating logic.

---

## 13. Agent Task Execution Protocol

**PHASE 1 â€” ORIENT**
Read: root AGENTS.md â†’ local AGENTS.md â†’ task spec â†’ ADRs â†’ API docs â†’ DB docs.
Inspect: `git status`, current branch, related existing code.

**PHASE 2 â€” SCOPE**
Identify: owner, domain, allowed write paths, forbidden paths, dependencies, shared files touched, API impact, DB impact.

**PHASE 3 â€” PLAN**
Internal implementation plan. Identify cross-domain dependencies. Do NOT implement architecture changes silently.

**PHASE 4 â€” IMPLEMENT**
Modify only authorized files. Use existing patterns and conventions. No unrelated refactoring. No unnecessary dependencies.

**PHASE 5 â€” VALIDATE**
Run tests. Check API contract consistency. Check DB constraints/cascades/soft deletes. Check authorization (all 4 actors). Test edge cases.

**PHASE 6 â€” DIFF AUDIT**
```
git status
git diff --stat
git diff
```
Every modified file must be in the task's allowed paths. No secrets added. No unrelated refactoring. No protected files changed without authorization.

**PHASE 7 â€” REPORT**
Summarize: files changed, behavior implemented, tests run, DB changes, API changes, shared-file changes, remaining risks.

---

## 14. Stop Conditions

STOP and report (do not improvise) when encountering:

1. Architecture change required
2. Cross-domain database change required
3. Protected file modification without explicit authorization
4. Breaking API contract change
5. Ownership boundary violation
6. Destructive database operation (DROP, DELETE without WHERE)
7. New infrastructure or major dependency required
8. Contradiction between ADR and implementation
9. Ambiguous business rule
10. Requirement unsatisfiable within current architecture
11. Need to modify another team member's domain

---

## 15. AI Output Formats

**Task Complete:**
```
STATUS: COMPLETE
TASK: <id+name>         OWNER: <TEAM_MEMBER_X>
FILES CHANGED:          <list of paths>
DATABASE:               <none | migration added: path>
API:                    <none | changed: method+path>
TESTS:                  <tests run and result>
SCOPE AUDIT:            PASS
OUT-OF-SCOPE:           None
ARCHITECTURE CHANGED:   None
NOTES:                  <important details>
```

**Task Blocked:**
```
STATUS: BLOCKED
TASK: <task>            BLOCKER: <exact reason>
DOMAIN: <domain>        OWNER: <owner>
FILES: <paths>
WHY: <why this cannot be safely completed>
PROPOSAL: <minimal proposed change>
DECISION NEEDED: <what team must decide>
DO NOT IMPLEMENT THE BLOCKED CHANGE AUTOMATICALLY.
```

**Architecture Conflict:**
```
ARCHITECTURE_CONFLICT
Conflict:          <description>
Affected files:    <paths>
Approved decision: <ADR reference>
Current impl:      <description>
Action: Request team resolution. Do NOT silently redesign.
```

---

## 16. Git Workflow

```
main  â† production; merge from dev only
 â””â”€â”€ dev  â† integration target for all PRs
      â”œâ”€â”€ p1/<task>   TEAM_MEMBER_A (Identity/Auth)
      â”œâ”€â”€ p2/<task>   TEAM_MEMBER_B (Content)
      â””â”€â”€ p3/<task>   TEAM_MEMBER_C (Learning/Infra)
```

One branch = one coherent task. Small branches. Small PRs. Never work on `main` or `dev` directly.

```powershell
.\scripts\agent-start-task.ps1 -Branch "p1/auth-login"
.\scripts\create-pr.ps1 -Title "p1: implement login endpoint"
.\scripts\agent-finish-task.ps1
```

PR must: do one logical thing Â· task ID in title Â· small diff Â· include tests Â· no debug code Â· no `.env` committed.

---

## 17. Security Rules

Never: commit `.env`, credentials, API keys, tokens, private keys. Never store plaintext passwords or card numbers in DB. Always use parameter binding. Never `UPDATE`/`DELETE` without `WHERE` in production. Never disable constraints.

---

## 18. No Unrelated Refactoring

**Minimal diff is a safety feature.** Implement the smallest coherent change for the task only. Do not rewrite routing, rename unrelated code, format the whole codebase, or upgrade unrelated packages.

---

## 19. Documentation Rules

**Before schema change**: read `docs/DATABASE.md`, `docs/ERD.md`, all migrations, relevant ADRs.

**After approved schema change**: update `docs/DATABASE.md`, update `docs/ERD.md`, run `docs/validation_tests.sql`.

**For architecture changes**: create ADR in `docs/decisions/` (format in `docs/decisions/README.md`). Do not implement without team approval.

---

## 20. Known Documentation Inconsistencies

Do NOT auto-fix application code. Flag for team review. Each requires a team-approved migration.

| # | Issue | Type | Location |
|---|---|---|---|
| 1 | `RoleSeeder` seeds `learner`, `reviewer` â€” approved model requires `user`, `contributor`, `admin` | IMPLEMENTATION ISSUE | `database/seeders/RoleSeeder.php` |
| 2 | `articles_status_check` allows `submitted`, `rejected` â€” approved: `draft`, `published`, `archived` only | IMPLEMENTATION ISSUE | `database/migrations/2026_01_01_000005_create_articles_tables.php` |
| 3 | Migration 000002 comment references old 4-role model | DOCUMENTATION ISSUE | `database/migrations/2026_01_01_000002_create_roles_tables.php` |
| 4 | Approved architecture ADR says Next.js/React is active; no `frontend/` directory or package manifest exists | ARCHITECTURE DECISION CONFLICT | `docs/decisions/2026-10-06-architecture-techstack-locked.md`, repository root |
| 5 | Database/ERD prose says `article_reviews` was removed conceptually; migration still creates it and ADR correctly calls it dormant | DOCUMENTATION ISSUE | `docs/DATABASE.md`, `docs/ERD.md`, `database/migrations/2026_01_01_000006_create_article_relations_tables.php` |

---

## 21. Testing, Skill System, Key Documents

**Testing** â€” do not claim tests passed unless actually executed:
- Authentication: valid login, invalid credentials, unauthorized, token behavior
- Authorization: guest / user / contributor / admin
- Content: draft / published / archived; ownership rules
- Database: constraints, FKs, cascades, soft deletes; `EXPLAIN ANALYZE` where relevant

**Skills**: `skills/database-design` Â· `skills/postgresql-sql` Â· `skills/data-pipelines` Â· `skills/data-quality-testing`

**Key documents**: `docs/ARCHITECTURE.md` Â· `docs/API.md` Â· `docs/DATABASE.md` Â· `docs/ERD.md` Â· `docs/decisions/` Â· `docs/team/OWNERSHIP.md` Â· `docs/team/WORKFLOW.md` Â· `docs/team/FEATURES.md` Â· `docs/team/TASK_TEMPLATE.md` Â· `backend/AGENTS.md`

---

## 22. Development Environment

```powershell
docker compose up -d
docker compose exec app php artisan migrate
docker compose exec app php artisan db:seed
docker compose exec app php artisan migrate:fresh --seed
docker compose exec postgres psql -U knowledgehub -d knowledgehub
docker compose exec app php artisan test
```

---

*Priority: Correctness > Speed. Read before writing. Test thoroughly. Minimal diff.*
