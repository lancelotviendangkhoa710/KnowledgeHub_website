# docs/team/FEATURES.md â€” Feature Registry by Domain

**Version**: 1.0 | **Date**: 2026-10-06
**Update policy**: Add/update when a feature is assigned or implementation begins.

> This document tracks features by domain, not by technology layer.
> Each feature owns its backend + frontend (when built) + DB tables + API endpoints + tests.
> Status: PLANNED | IN_PROGRESS | IMPLEMENTED

---

## Domain A â€” Identity / Auth

**Owner**: TEAM_MEMBER_A | **Branch prefix**: `p1/`

| Feature | ID | Status | DB Tables | API Endpoints | Notes |
|---|---|---|---|---|---|
| Registration / authentication | TBD | PLANNED | `users`, `roles`, `user_roles` | TBD | Define contract when implementation begins |
| Profile / account management | TBD | PLANNED | `users` | TBD | Define contract when implementation begins |
| Role assignment | TBD | PLANNED | `user_roles` | TBD | Admin-only rule is approved; endpoint TBD |

**DB tables owned**: `users`, `roles`, `user_roles`

**Backend paths**:
```
backend/app/Http/Controllers/Auth/
backend/app/Models/User.php  /  Role.php
backend/app/Policies/UserPolicy.php
backend/app/Services/Auth/
```

---

## Domain B â€” Content

**Owner**: TEAM_MEMBER_B | **Branch prefix**: `p2/`

| Feature | ID | Status | DB Tables | API Endpoints | Notes |
|---|---|---|---|---|---|
| Category management | TBD | PLANNED | `categories` | TBD | Contract and implementation absent |
| Content lifecycle | TBD | PLANNED | `articles`, `article_versions` | TBD | Preserve draft/published/archived workflow |
| Tags / bookmarks | TBD | PLANNED | `tags`, `article_tags`, `bookmarks` | TBD | Bookmarks are content-owned in current schema |
| Attachments | TBD | PLANNED | `article_attachments` | TBD | Requires approved S3 integration |
| Search | TBD | PLANNED | `articles` | TBD | Full-text design requires approval |

**DB tables owned**: `categories`, `articles`, `article_versions`, `tags`, `article_tags`, `bookmarks`, `article_attachments`

**Backend paths**:
```
backend/app/Http/Controllers/Content/
backend/app/Models/Article.php  /  ArticleVersion.php  /  Category.php
backend/app/Models/Tag.php  /  Bookmark.php  /  ArticleAttachment.php
backend/app/Policies/ArticlePolicy.php
backend/app/Services/Content/
```

---

## Domain C â€” AI Companion

**Owner**: TBD | **Status**: PLANNED â€” Development Sequence step 3

| Feature | ID | Status | DB Tables | API Endpoints | Notes |
|---|---|---|---|---|---|
| Conversation Management | AI-01 | PLANNED | `conversations` | TBD | AI service (Python/FastAPI) |
| Message History | AI-02 | PLANNED | `messages` | TBD | AI service |
| User Memory | AI-03 | PLANNED | `user_memories` | TBD | Long-term memory |
| RAG Integration | AI-04 | PLANNED | â€” | TBD | Requires pgvector |
| Roadmap Generation | AI-05 | PLANNED | `learning_roadmaps` | TBD | AI-generated |

**DB tables**: `conversations`, `messages`, `user_memories`
**Note**: Schema exists; service not yet built. Assign owner when AI phase begins.

---

## Domain D â€” Learning / Engagement

**Owner**: TEAM_MEMBER_C | **Branch prefix**: `p3/`

| Feature | ID | Status | DB Tables | API Endpoints | Notes |
|---|---|---|---|---|---|
| Learning roadmaps | TBD | PLANNED | `learning_roadmaps`, `roadmap_items` | TBD | Contract and implementation absent |
| Progress tracking | TBD | PLANNED | `learning_progress` | TBD | Contract and implementation absent |
| Prerequisites | TBD | PLANNED | `roadmap_item_prerequisites` | TBD | DAG validation is an existing DB-doc limitation |
| Bookmarks | N/A | Content-owned | `bookmarks` | TBD | Cross-domain consumer; coordinate with TEAM_MEMBER_B |

**DB tables owned**: `learning_roadmaps`, `roadmap_items`, `learning_progress`, `roadmap_item_prerequisites`

**Backend paths**:
```
backend/app/Http/Controllers/Learning/
backend/app/Models/LearningRoadmap.php  /  RoadmapItem.php  /  LearningProgress.php
backend/app/Policies/RoadmapPolicy.php
backend/app/Services/Learning/
```

---

## Domain E â€” Payment

**Owner**: TBD | **Status**: PLANNED â€” Development Sequence step 6

| Feature | ID | Status | DB Tables | API Endpoints | Notes |
|---|---|---|---|---|---|
| Plans / subscriptions | TBD | PLANNED | `plans`, `subscriptions` | TBD | Development Sequence step 6 |
| Payment processing | TBD | PLANNED | `payments`, `webhook_events` | TBD | Provider integration not selected/implemented |

**DB tables**: `plans`, `subscriptions`, `payments`, `webhook_events`
**Note**: Assign owner when Payment phase begins.

---

## Feature Development Checklist

When starting a new feature:
- [ ] Feature ID assigned (format: `DOMAIN-NN`)
- [ ] Owner assigned
- [ ] Status updated here
- [ ] API contract added/updated in `docs/API.md`
- [ ] DB impact assessed (new migration? existing tables only?)
- [ ] Branch created from dev: `p1/AUTH-01-login`
- [ ] Task template filled: `docs/team/TASK_TEMPLATE.md`

When feature is complete:
- [ ] Status updated to IMPLEMENTED
- [ ] `docs/API.md` marked as IMPLEMENTED
- [ ] `docs/DATABASE.md` and `docs/ERD.md` updated if schema changed
