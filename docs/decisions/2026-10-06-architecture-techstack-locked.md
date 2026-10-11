# Decision: Architecture & Tech Stack – Locked Baseline

**Status**: Approved  
**Date**: 2026-10-06  
**Author**: AI Agent (Cline) — confirmed with team  
**Related**: `docs/DATABASE.md`, `docs/ERD.md`, `AGENTS.md`, `docs/decisions/2026-10-05-business-model-correction.md`

---

## Context

Session on 2026-10-06: team reviewed and confirmed the full architecture and technology stack of KnowledgeHub.
This ADR locks those decisions as the authoritative baseline for all agents and developers going forward.

---

## Decision

### Platform Definition

KnowledgeHub is a **curated learning platform** with an AI Learning Companion.

- **NOT** a social platform
- **NOT** a user-generated-content (UGC) platform
- **NO** community moderation workflow
- Operated by an **internal content team** (Contributors assigned by Admin)

---

### Technology Stack

| Layer | Technology | Status |
|---|---|---|
| Backend API | Laravel 11 REST API | ✅ Active |
| Database | PostgreSQL 16 / Amazon Aurora PostgreSQL | ✅ Active |
| Frontend | Next.js / React | ✅ Active |
| Dev Environment | Docker Compose | ✅ Active |
| AI Service | Python + FastAPI | 🔜 Planned |
| File Storage | Amazon S3 | 🔜 Planned |

- AI service runs as a **separate service** from the Laravel backend
- S3 integration: only metadata stored in PostgreSQL; binary files go to S3
- No other technology may be introduced without a new ADR and team approval

---

### Roles (locked — exactly 3)

| Role | DB value | Notes |
|---|---|---|
| Admin | `admin` | Full platform control |
| Contributor | `contributor` | Internal team; assigned by Admin only |
| User | `user` | Learner; default role on registration |

- Guest = unauthenticated, no DB role, read-only access to published content
- No `reviewer`, `learner`, `moderator`, or any other role
- No auto-promotion: User → Contributor requires Admin action

---

### Publishing Workflow (locked)

```
Contributor creates  →  status=draft
Contributor/Admin publishes  →  status=published  (published_version_id set)
Admin archives  →  status=archived
```

- No submission-for-review step
- No `submitted` or `rejected` statuses
- `article_reviews` table: dormant (old model), no code references, pending drop migration

---

### Database Conventions (locked — non-negotiable)

| Convention | Rule |
|---|---|
| Primary keys | UUID v4 on all tables |
| Timestamps | `TIMESTAMP WITH TIME ZONE` (`timestampTz`) everywhere |
| Foreign keys | Explicit FK + explicit CASCADE rule on every relation |
| Enumerations | `VARCHAR` + `CHECK` — never native PG ENUM |
| Monetary | `NUMERIC(12,2)` — no float |
| Currency | `CHAR(3)` ISO 4217 + regex `[A-Z]{3}` |
| Flexible metadata | `JSONB` only where genuinely variable |
| File binary | S3 — PG stores metadata only |
| Soft delete | `deleted_at` — `users` + content tables |
| Secrets | Never stored in DB (no plaintext passwords, API keys, card numbers) |

---

### Active Schema (25 tables)

| Domain | Tables |
|---|---|
| A – Identity | `users`, `roles`, `user_roles` |
| B – Content | `categories`, `articles`, `article_versions`, `tags`, `article_tags`, `bookmarks`, `article_attachments` |
| C – AI Companion | `conversations`, `messages`, `user_memories` |
| D – Learning | `learning_roadmaps`, `roadmap_items`, `learning_progress`, `roadmap_item_prerequisites` |
| E – Payment | `plans`, `subscriptions`, `payments`, `webhook_events` |

- `article_reviews` is in DB (dormant). No code may reference it. Pending drop migration.
- `articles` is the current content-material placeholder. Full Course → Section → Material hierarchy is a future task.

---

### Development Sequence (approved order)

1. Core platform — auth, users, roles
2. Course / content — categories, articles/courses, versions, attachments
3. AI Companion — conversations, messages, memories
4. RAG + long-term memory
5. AI roadmap generation
6. Premium / subscription

---

## Consequences

### Positive
- Single source of truth for architecture; all agents align from session start
- Prevents re-introduction of removed concepts (Reviewer role, review pipeline, etc.)
- Clear separation of concerns: Laravel API vs Python AI service

### Negative
- Course → Section → Material schema not yet designed; `articles` is a temporary model
- AI service integration deferred; PHP/Python boundary to be defined when AI phase begins

### Risks
- Risk: future agent adds `reviewer` role or review pipeline — **mitigation**: this ADR + `AGENTS.md` Architecture Decisions section explicitly prohibit it
- Risk: Course schema redesign may require significant migration — **mitigation**: requires new ADR + team approval before implementation

---

## Pending Tasks (require team approval)

| # | Task |
|---|---|
| 1 | Drop `article_reviews` table — create drop migration |
| 2 | Design Course → Section → Material schema — new ADR required |
| 3 | Enrollment / course progress tables |
| 4 | Full-text search — GIN tsvector indexes |
| 5 | `pgvector` extension — for RAG / AI embeddings |
| 6 | `roadmap_items.article_id` → course/material link refactor |
| 7 | Row-level security (PG RLS) for multi-tenant isolation |

---

## Validation

- `AGENTS.md` contains "Architecture Decisions (Locked)" section referencing this ADR ✅
- `docs/DATABASE.md` version 2.0 reflects correct business model ✅
- `docs/ERD.md` version 2.0 reflects 3-role model and curated-learning content model ✅
- `docs/decisions/2026-10-05-business-model-correction.md` — Approved ✅
