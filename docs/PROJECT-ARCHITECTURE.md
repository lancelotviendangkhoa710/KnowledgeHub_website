# KnowledgeHub — Project Architecture

**Status:** Approved baseline, implementation state not confirmed
**Authority:** [`decisions/2026-10-06-architecture-techstack-locked.md`](decisions/2026-10-06-architecture-techstack-locked.md)  
**Detailed references:** [`ARCHITECTURE.md`](ARCHITECTURE.md), [`DATABASE.md`](DATABASE.md), [`API.md`](API.md)

## Product

KnowledgeHub is a curated learning platform operated by an internal content team, with an AI Learning Companion. It is not a social or user-generated-content platform and has no community moderation workflow.

## Locked technology stack

| Layer | Technology | State |
|---|---|---|
| Frontend | Next.js 14, React 18, TypeScript | Scaffolded in `frontend/`; Laravel API integration remains in progress |
| Backend | Laravel 11 REST API, PHP 8.2 | Runtime bootstrap configured; Laravel application source is not tracked |
| Database | PostgreSQL 16 | Docker PostgreSQL configured locally; Supabase PostgreSQL is the approved managed target |
| Local orchestration | Docker Compose | Configured in `docker-compose.yml` |
| Web server | Nginx | Configured as the local Laravel-facing web server |
| AI service | Python + FastAPI | Planned as a separate service |
| File storage | Amazon S3 | Planned; database stores metadata, not file binaries |

Do not introduce technologies beyond this baseline without team approval and an approved ADR.

## Runtime and integration boundaries

```text
Browser
  ├── Next.js frontend (:3000; scaffolded)
  └── Laravel REST API (:8080; application source not tracked)
        └── PostgreSQL 16
             ├── Local: Docker PostgreSQL (:5432)
             └── Managed target: Supabase PostgreSQL

Future integrations: Laravel API → Python/FastAPI AI service; Laravel → Amazon S3
```

The frontend must communicate with backend data through the Laravel API contract (`docs/API.md`), not directly access database tables. The Supabase JavaScript client and environment placeholders exist in the frontend, but direct browser database access and Supabase Auth are not part of the approved data/auth architecture. Do not use that client to bypass the API boundary. Supabase is currently the managed PostgreSQL target, not a separate application data path.

## Domain model

The platform uses exactly three database roles: `admin`, `contributor`, and `user`. A guest is unauthenticated and has no database role. Admins assign the Contributor role; users are not automatically promoted.

The approved database domains are:

- **Identity:** `users`, `roles`, `user_roles`.
- **Content:** `categories`, `articles`, `article_versions`, `tags`, `article_tags`, `bookmarks`, `article_attachments`.
- **AI Companion:** `conversations`, `messages`, `user_memories`.
- **Learning:** `learning_roadmaps`, `roadmap_items`, `learning_progress`, `roadmap_item_prerequisites`.
- **Payments:** `plans`, `subscriptions`, `payments`, `webhook_events`.

`articles` currently represent learning materials; a Course → Section → Material hierarchy remains future work. Contributors create drafts and publish directly; Admins can archive content. There is no review step. See [`DATABASE.md`](DATABASE.md) and [`ERD.md`](ERD.md) for schema details.

## Database and security conventions

- UUID v4 primary keys, `timestampTz` timestamps, explicit foreign keys and delete behavior.
- `VARCHAR` plus `CHECK` constraints instead of PostgreSQL ENUM types.
- Store secrets outside source control. Never expose a Supabase service-role key or database password to the browser.
- Authentication and authorization belong in the backend; enforce role-based access with Laravel Policies/Gates.
- Apply and review Row Level Security policies before exposing any Supabase table through the Data API. RLS is not yet implemented.

## Repository map

```text
frontend/               Next.js application scaffold
backend/                Laravel runtime mount; generated Laravel source is not tracked
database/migrations/    PostgreSQL schema migrations
database/seeders/       Development/reference seeders
docker/                 PHP and Nginx configuration
docs/                   Architecture, API, schema, deployment, and team documentation
```

## Development sequence

1. Core platform: auth, users, roles.
2. Course/content: categories, articles/materials, versions, attachments.
3. AI Companion: conversations, messages, memories.
4. RAG and long-term memory.
5. AI roadmap generation.
6. Premium subscriptions.

## Architecture decisions

The approved technology baseline and business rules are recorded in [`decisions/2026-10-06-architecture-techstack-locked.md`](decisions/2026-10-06-architecture-techstack-locked.md). Architecture changes require team approval and an ADR. Do not treat planned services as implemented components.