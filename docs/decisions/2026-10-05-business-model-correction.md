# Decision: Business Model Correction – Curated Learning Platform

**Status**: Approved  
**Date**: 2026-10-05  
**Author**: AI Agent (Cline)  
**Supersedes**: `docs/decisions/2026-10-05-usecase-actor-rbac-analysis.md`  
**Related**: `docs/DATABASE.md`, `docs/ERD.md`, migration `000002`, `database/seeders/RoleSeeder.php`

---

## Context

The previous context documents described KnowledgeHub as a social/UGC platform with a 4-role model
(Learner, Contributor, Reviewer, Admin) and an article-review submission pipeline. This was incorrect.

---

## Correct Business Model

**KnowledgeHub is a curated learning platform operated by an internal content team.**

NOT a social platform. NOT a UGC platform. NO community moderation workflow.

---

## Actors (corrected)

| Actor | DB role | Description |
|---|---|---|
| **Guest** | *(no role)* | Unauthenticated. Can view published content. |
| **User** | `user` | Registered learner. Discovers, enrolls, learns from courses. Uses AI Companion, Learning Roadmap, bookmarks. May use premium features. |
| **Contributor** | `contributor` | Internal content-team member. Assigned by Admin. Creates, manages, and publishes courses and course content. |
| **Admin** | `admin` | Full platform control. Manages users, contributors, courses, categories, plans, system configuration. |

---

## Role Assignment Rules

- Guest registers → `status=pending` → email verified → `status=active` + role `user` assigned.
- Admin explicitly grants `contributor` role. A User does NOT become Contributor automatically.
- Admin grants `admin` role. Only Admins may grant other Admins.

---

## Content Model (corrected)

**Primary content unit: Course** (not a social article feed).

A Course may contain: articles/lessons, documents, videos, external links, other structured materials.

Full Course → Section → Material hierarchy is a future schema design task. Current schema uses
`articles` / `article_versions` as the content-material backbone. `articles.author_id` maps to
a Contributor's user ID.

---

## Publishing Workflow (corrected)

No submission-for-review workflow. No Reviewer role.

```
Contributor creates content → status=draft
     ↓ Contributor (or Admin) publishes
status=published  (set published_version_id)
     ↓ Admin can archive
status=archived
```

---

## High-Level Use Cases

| UC | Description | Actor |
|---|---|---|
| UC01 | Register / Login | Guest |
| UC02 | Discover & Search Courses | Guest, User |
| UC03 | Learn Course (enroll, consume content) | User |
| UC04 | Bookmark & Track Learning Progress | User |
| UC05 | Manage Learning Roadmap | User |
| UC06 | Use AI Learning Companion | User |
| UC07 | Manage Courses (create, edit, publish, archive) | Contributor, Admin |
| UC08 | Upload / Publish Course Content | Contributor, Admin |
| UC09 | Manage Users & Contributors (roles, ban) | Admin |
| UC10 | Manage Courses & Platform (categories, config) | Admin |
| UC11 | Manage Subscription | User |
| UC12 | Process Payment | System (Payment Gateway webhook) |

---

## RBAC Matrix (corrected)

| Capability | Guest | User | Contributor | Admin |
|---|:---:|:---:|:---:|:---:|
| View published courses/content | ✅ | ✅ | ✅ | ✅ |
| Register / Login | ✅ | — | — | — |
| Enroll in course, track progress | ❌ | ✅ | ✅ | ✅ |
| Bookmark content | ❌ | ✅ | ✅ | ✅ |
| Use AI Learning Companion | ❌ | ✅ | ✅ | ✅ |
| Manage Learning Roadmap | ❌ | ✅ | ✅ | ✅ |
| Subscribe to plan | ❌ | ✅ | ✅ | ✅ |
| Create / edit courses (own) | ❌ | ❌ | ✅ | ✅ |
| Publish / archive course content | ❌ | ❌ | ✅ own | ✅ |
| Upload course attachments | ❌ | ❌ | ✅ own | ✅ |
| Manage all courses platform-wide | ❌ | ❌ | ❌ | ✅ |
| Manage users (ban, role assignment) | ❌ | ❌ | ❌ | ✅ |
| Manage plans / system config | ❌ | ❌ | ❌ | ✅ |

---

## AI Learning Companion (unchanged)

Learning assistant for Users. Supports: conversation history, long-term user memory, learning goals,
personalized course recommendations, roadmap generation.

Development sequence: core platform → course/content → AI Companion → RAG → long-term memory → AI roadmap.

AI service (Python / FastAPI) remains separate from core Laravel backend until the AI phase.

---

## Premium / Subscription (unchanged)

Optional domain: subscription plans, premium course access, payment, payment webhooks, transaction history.

Payment Gateway is an external actor/system.

---

## What Was Removed

| Removed concept | Reason |
|---|---|
| `reviewer` role | No Reviewer in the business model |
| `learner` role | Renamed to `user` for clarity |
| `article_reviews` table (active use) | No review workflow; table is dormant pending drop migration |
| `submitted` / `rejected` article statuses | No submission pipeline |
| Reviewer-owned use cases | Does not exist |
| Social/article-feed framing | Platform is course-based |
| Community moderation workflow | Does not exist |
| UGC framing (public users contribute content) | Contributors are internal team |

---

## App Layer Constraints (still required)

| # | Rule | Enforcement |
|---|---|---|
| 1 | Contributor may only edit their own content | Laravel Policy: `author_id = current_user.id` |
| 2 | Only Admin grants Contributor/Admin roles | Laravel Gate / middleware |
| 3 | Subscription gating for premium features | App check `subscriptions.status = 'active'` |
| 4 | Flat roles, no inheritance | Check each permission individually (Gate/Policy) |
| 5 | Row-level security not implemented | PG RLS — documented limitation |
| 6 | `published_version_id` cross-article integrity | App validates `version.article_id == article.id` |

---

## Open Items (future tasks, need team approval)

| # | Item | Notes |
|---|---|---|
| 1 | Drop `article_reviews` table | Create drop migration; needs team approval |
| 2 | Rename seeded role `learner` → `user` | Migration + RoleSeeder update |
| 3 | Simplify `articles.status` CHECK: `draft\|published\|archived` | Migration needed |
| 4 | Design Course → Section → Material schema | New ADR + migration |
| 5 | Enrollment / course progress tables | Future schema task |
| 6 | `roadmap_items.article_id` → course/material link | Schema refactor in future |
| 7 | Granular `permissions` table | Only if team adopts Spatie Permission or similar |

---

## Decision

- Business model: **curated learning platform, Admin + Contributor + User, no Reviewer**.
- Content unit: **Course** (schema TBD; `articles` is current placeholder until course schema designed).
- Publishing: **Contributor publishes directly**, Admin oversees.
- All context documents updated to reflect this model as of 2026-10-05.
- Schema migration changes are pending team approval as separate tasks (see Open Items above).

