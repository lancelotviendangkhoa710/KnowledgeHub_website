# KnowledgeHub – Database Documentation

> Version: 2.1 | Date: 2026-10-07 | Laravel 11 · PostgreSQL 16 / Supabase PostgreSQL · UUID PKs · timestamptz

---

## 0. Business Model (read first)

KnowledgeHub is a **curated learning platform**, not a social or user-generated-content platform.

**Roles** (exactly 3):

| Role | DB name | Description |
|------|---------|-------------|
| Admin | `admin` | Full platform control: manages users, contributors, courses, categories, plans |
| Contributor | `contributor` | Internal content-team member: creates, edits, and publishes courses and course content |
| User | `user` | Discovers and learns from courses; uses AI Companion, Learning Roadmap, bookmarks |

> A normal User does NOT automatically become a Contributor. Admin explicitly grants the Contributor role.
> There is NO Reviewer role and NO community moderation workflow.

**Content model**: Primary educational unit is a **Course**. A course contains learning materials (articles, videos, documents, external links, etc.). Contributor creates courses. User consumes courses.

**AI Learning Companion**: Learning assistant for Users — conversation history, long-term memory, learning goals, progress tracking, personalized recommendations, roadmap generation.

---

## 1. Design Principles

| Principle | Decision |
|-----------|----------|
| Primary keys | UUID v4 for all entities |
| Timestamps | `TIMESTAMP WITH TIME ZONE` (`timestampTz`) everywhere |
| Foreign keys | Explicit FK on every relationship |
| Enumerations | `VARCHAR` + `CHECK` – not native PG ENUM (avoids `ALTER TYPE`) |
| Monetary values | `NUMERIC(12,2)` – no float error |
| Currency | `CHAR(3)` ISO 4217, regex-validated |
| Flexible metadata | `JSONB` only where genuinely variable (`messages.metadata`) |
| File storage | Metadata only in PG; binary files go to S3 |
| Soft deletion | `users` + content tables only – downstream records require retention |
| Secrets | Never stored: no plaintext passwords, API keys, card numbers |

---

## 2. Table Inventory

### A – Identity
| Table | Responsibility |
|-------|---------------|
| `users` | Accounts. Soft-deletable. Email unique per active account. |
| `roles` | Named roles. Seeded: `user`, `contributor`, `admin`. |
| `user_roles` | Many-to-many join. Composite PK = uniqueness. |

### B – Course / Content

> **Note**: The current schema uses `articles` and `article_versions` as the learning-content backbone.
> These represent **course content materials** within a course, not a social article feed.
> A full Course → Section → Material hierarchy will be designed in a future migration.
> Until then, `articles` maps conceptually to "course learning material".

| Table | Responsibility |
|-------|---------------|
| `categories` | Hierarchical taxonomy via self-referencing parent_id. |
| `articles` | Course content material. Contributor-authored. Soft-deletable. |
| `article_versions` | Immutable content snapshots. Audit history. |
| `tags` | Global reusable labels. |
| `article_tags` | Article ↔ tag join. Composite PK. |
| `bookmarks` | User saves content. Composite PK. |
| `article_attachments` | S3 file metadata per version. |

> `article_reviews` table from the old review workflow has been removed conceptually.
> No Reviewer role, no editorial submission pipeline.
> Contributor publishes content directly (with Admin oversight).

### C – AI Companion
| Table | Responsibility |
|-------|---------------|
| `conversations` | Chat session per user. |
| `messages` | Individual turns. Not one JSON blob. |
| `user_memories` | Cross-session AI memory. Separate from history and articles. |

### D – Learning Roadmap
| Table | Responsibility |
|-------|---------------|
| `learning_roadmaps` | Named plan owned by user. |
| `roadmap_items` | Ordered steps. Optional content link. |
| `learning_progress` | 1:1 progress tracker per item; `status` is the authoritative learning status. |
| `roadmap_item_prerequisites` | DAG prerequisites. Self-ref forbidden by CHECK. |

> **Status authority (2026-10-22):** `learning_progress.status` is authoritative. `roadmap_items.status` is a denormalized mirror updated in the same transaction by the progress service; item create/update endpoints reject `status`. The ADR `docs/decisions/2026-10-22-learning-progress-authority.md` is implemented but still **Proposed** pending Product/PM approval.

### E – Payment
| Table | Responsibility |
|-------|---------------|
| `plans` | Plan definitions with pricing. |
| `subscriptions` | User subscription to plan. |
| `payments` | Transaction records. Financial audit trail. |
| `webhook_events` | Idempotent provider event log. |

---

## 3. Published Version Strategy

**Design:** `articles.published_version_id` (nullable FK to `article_versions.id`).

- NULL = draft, no published version.
- Contributor or Admin sets `published_version_id` + `status = 'published'` when ready to publish.
- Pending revision: old `published_version_id` unchanged; learners see prior published version.

**No submission-for-review workflow.** Contributor publishes directly. Admin can archive or override.

**Circular FK resolved in migration 5 (3 steps):**
1. Create `articles` without FK on `published_version_id`.
2. Create `article_versions` with FK to `articles.id`.
3. Add `published_version_id` FK via raw `ALTER TABLE` after both tables exist.

**Limitation:** DB cannot enforce that the referenced version belongs to the same article without a trigger. Application service must validate `version.article_id == article.id` before assignment.

---

| Scenario | Behavior | Rationale |
|----------|----------|-----------|
| User soft-deleted | deleted_at set | Downstream FKs prevent hard delete |
| user_roles on user delete | CASCADE | No value without user |
| bookmarks on user delete | CASCADE | No value without user |
| conversations on user delete | RESTRICT | Application must archive first |
| user_memories on user delete | RESTRICT | May need GDPR export |
| subscriptions on user delete | RESTRICT | Financial audit record |
| Article deleted | Soft delete only | Versions are audit history |
| article_versions deleted | RESTRICT | Immutable content history |
| messages on conversation delete | CASCADE | Belong to conversation |
| source_message_id deleted | SET NULL on user_memories | Memory survives |
| roadmap deleted | CASCADE items and progress | Cascade owned data |
| article_id on roadmap_items | SET NULL | Step survives article soft delete |
| payments on subscription delete | RESTRICT | Never cascade financial records |
| subscriptions on plan delete | RESTRICT | Active subscriptions reference plan |
| category deleted | SET NULL articles.category_id | Article survives |

---

## 5. Index Rationale

| Index | Table | Columns | Benefit |
|-------|-------|---------|---------|
| Unique partial | users | email WHERE deleted_at IS NULL | Re-registration after soft delete |
| Unique | roles | name | Global uniqueness |
| Unique | categories/tags/articles | slug | URL routing |
| Unique | article_versions | (article_id, version_no) | One version per article |
| Composite | articles | (status, published_at) | Public listing query |
| FK indexes | articles | author_id, category_id | Filter queries |
| Unique PK | article_tags | (article_id, tag_id) | No duplicate tagging |
| FK index | article_tags | tag_id | Articles by tag |
| FK index | conversations | user_id | User conversations |
| Composite | messages | (conversation_id, created_at) | Ordered history |
| Composite | user_memories | (user_id, status) | Active memories |
| FK index | learning_roadmaps | user_id | User roadmaps |
| Unique | roadmap_items | (roadmap_id, position) | Ordered positions |
| FK indexes | subscriptions | user_id, plan_id | Subscription queries |
| Unique | payments | (provider, provider_payment_id) | Idempotent ingestion |
| Unique | webhook_events | (provider, provider_event_id) | Idempotent processing |
| Composite | webhook_events | (provider, status) | Pending by provider |

---

## 6. CHECK Constraints

| Table.column | Allowed Values |
|--------------|----------------|
| users.status | active, inactive, banned, pending |
| articles.status | draft, published, archived |
| messages.role | user, assistant, system, tool |
| user_memories.memory_type | preference, fact, goal, instruction |
| user_memories.status | active, superseded, expired, deleted |
| learning_roadmaps.status | active, completed, archived, paused |
| roadmap_items.status | pending, in_progress, completed, skipped |
| learning_progress.status | pending, in_progress, completed, skipped |
| roadmap_item_prerequisites | roadmap_item_id != prerequisite_item_id |
| plans.billing_interval | monthly, annual, one_time |
| plans.status | active, inactive, deprecated |
| plans.price | >= 0 |
| plans.currency | regex [A-Z]{3} |
| subscriptions.status | active, trialing, past_due, cancelled, expired |
| payments.status | pending, succeeded, failed, refunded, disputed |
| payments.amount | >= 0 |
| payments.currency | regex [A-Z]{3} |
| webhook_events.status | pending, processed, failed, ignored |

---

## 7. Limitations and Future Extensions

| # | Limitation | Mitigation |
|---|-----------|-----------|
| 1 | published_version_id cross-ref not DB-enforced | App validates version.article_id == article.id |
| 2 | No PG native ENUM | CHECK constraints; new values via migration |
| 3 | Prerequisite cycle detection not at DB level | App service runs DAG check before insert |
| 4 | No FTS indexes | Add GIN tsvector on content when needed |
| 5 | No vector columns | Add pgvector + VECTOR when RAG required |
| 6 | No row-level security | Consider PG RLS for multi-tenant |

Planned: full-text search, pgvector, article analytics, notifications, audit log, GDPR erasure, feature flags.

---

## 8. Migration Order

| # | File suffix | Tables |
|---|-------------|--------|
| 0 | 000000 | Laravel-managed migrations table |
| 1 | 000001 | users |
| 2 | 000002 | roles, user_roles |
| 3 | 000003 | categories |
| 4 | 000004 | tags |
| 5 | 000005 | articles, article_versions |
| 6 | 000006 | article_tags, bookmarks, article_attachments |
| 7 | 000007 | conversations, messages, user_memories |
| 8 | 000008 | learning_roadmaps, roadmap_items, learning_progress, roadmap_item_prerequisites |
| 9 | 000009 | plans, subscriptions, payments, webhook_events |
| 10 | 2026-10-12-000001 | Normalize article statuses to approved lifecycle |
| 11 | 2026-10-12-000002 | Normalize legacy role names and assignments |
| 12 | 2026-10-21-000001 | `personal_access_tokens` (Sanctum, UUID PK) |
| 13 | 2026-10-22-000001 | Backfill `roadmap_items.status` from `learning_progress.status` (OQ-05) |

> `article_reviews` table exists in migration 000006 (old model). It will be dropped in a future
> migration once the team approves the schema cleanup task. Until then it is dormant — no application
> code should reference it.

Total active conceptual tables: 25 (26 in DB until `article_reviews` is formally dropped)

---

## 9. Development Commands

```bash
docker compose up -d
docker compose exec app php artisan migrate
docker compose exec app php artisan db:seed
docker compose exec app php artisan migrate:fresh --seed
docker compose exec postgres psql -U knowledgehub -d knowledgehub -c "\dt"

# Test CHECK constraint (expects ERROR)
docker compose exec postgres psql -U knowledgehub -d knowledgehub \
  -c "INSERT INTO users(id,name,email,password,status,created_at,updated_at)
      VALUES(gen_random_uuid(),'T','t@x.com','h','invalid',now(),now());"

# Test duplicate webhook (expects ERROR)
docker compose exec postgres psql -U knowledgehub -d knowledgehub \
  -c "INSERT INTO webhook_events(id,provider,provider_event_id,status,created_at)
      VALUES(gen_random_uuid(),'stripe','evt_001','pending',now()),
            (gen_random_uuid(),'stripe','evt_001','pending',now());"
```


