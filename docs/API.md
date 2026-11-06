# docs/API.md — KnowledgeHub API Contract

**Version**: 0.8 | **Date**: 2026-11-06
**Status**: AUTH-01, Content, Learning, and AI-05 routes are implemented; verify using the documented suites.

> This document is the frontend/backend boundary once API implementation begins.
> It intentionally does **not** invent endpoints, auth mechanisms, response envelopes, or pagination rules.
> Add an endpoint only after its task is approved and implementation/contract decision exists.

---

## 1. Evidence Audited

| Evidence | Result |
| --- | --- |
| `backend/routes/` | Present: `auth.php`, `content.php`, `learning.php` |
| `backend/app/` | Present: Auth, Content and Learning controllers/services |
| `backend/composer.json` | Present; `laravel/sanctum` provides bearer-token auth |
| `backend/tests/` | Present: Auth, Content and Learning feature/unit tests |
| Tracked endpoint definitions | Auth (3) + Content (21) + Learning (12) routes |

Backend source and tests are tracked. AUTH-01 uses Sanctum bearer tokens; registration creates a pending user and does not activate or issue a token. Content Domain implements all 21 endpoints with full CRUD, versioning, tree categories, tags, bookmarks, and S3 attachments metadata. The Learning routes are implemented; roadmap, item, and prerequisite business rules listed as OPEN QUESTION in `docs/specs/learning/` still require Product/API approval.

---

## 2. Contract Rules

For each approved endpoint, record:

| Field | Required information |
| --- | --- |
| Status | `PROPOSED`, `APPROVED`, or `IMPLEMENTED` |
| Method and path | Exact HTTP method + versioned path |
| Owner/domain | Domain owner from `docs/team/OWNERSHIP.md` |
| Authentication | Exact mechanism and required role/ownership |
| Request schema | Fields, types, required/optional, validation |
| Response schema | Successful JSON structure |
| Error format | Status codes and error schema |
| Pagination | Page/cursor shape, filtering, sorting rules |
| Tests | Contract and authorization coverage |

Rules:

- Do not mark a contract `IMPLEMENTED` until route/controller tests run.
- Do not change an existing method, path, request, or response without cross-domain coordination.
- Do not infer token format, auth package, response envelope, or resource shape before approved implementation.
- Version/API base path remains **TBD** until the Laravel route configuration exists.

---

## 3. API Inventory

Identity/Auth, Content, and Learning progress endpoints are documented below.

| Domain | Owner | Implemented | Approved contract | Notes |
| --- | --- | ---: | ---: | --- |
| Identity/Auth | TEAM_MEMBER_A | 10 | 10 | AUTH-01 registration, login and logout; AUTH-02 profile, password, account deletion and admin user management; role assignment (AUTH-03) deferred |
| Content | TEAM_MEMBER_B | 21 | 21 | Implemented in routes/api/content.php; verified with 37 tests |
| Learning/Engagement | TEAM_MEMBER_C | 12 | 2 | 5 roadmap, 3 item, 2 progress, 2 prerequisite routes; only progress contract approved |
| AI Companion | TBD | 0 | 0 | AI service not in repository |
| Payment | TBD | 0 | 0 | Payment implementation absent |

---

## 4. Identity / Auth

**Owner**: `TEAM_MEMBER_A`  
**Authentication**: Laravel Sanctum personal access tokens in `Authorization: Bearer <token>`.

### IMPLEMENTED - POST `/api/auth/register`

Guest-only registration accepts `name`, `email`, `password`, and
`password_confirmation`. Email is trimmed and lowercased before validation. A
successful request returns `201` with `data.user` containing `id`, `name`,
`email`, `status`, and `roles`; the new account has `status=pending` and only
the `user` role. No token is issued. Requests that already carry an
authenticated credential are rejected with `403`. Validation failures return
`422` with Laravel's `errors` object, including duplicate active emails.

### IMPLEMENTED - POST `/api/auth/login`

Guest login accepts `email` and `password`. Only a non-deleted user with
`status=active` and a matching password receives `200` with `data.user` and a
one-time plain token in `data.token`; the stored token is hashed. Invalid
credentials and non-active accounts return `422` with a generic credentials
error. Login is throttled: five attempts per minute per email + source IP pair,
and twenty-five attempts per minute per source IP; a throttled request returns
`429`. Requests that already carry an authenticated credential are rejected
with `403`. Token expiration and activation delivery remain deferred decisions.

### IMPLEMENTED - POST `/api/auth/logout`

Requires a valid Sanctum bearer token. The current token is deleted and the
endpoint returns `200` with `data: null`. Missing, invalid, or revoked tokens
return `401`; other tokens belonging to the same user remain valid.

**Tests**: `backend/tests/Feature/Auth/AuthTest.php` covers registration,
normalization, duplicate and soft-deleted email behavior, pending-login
rejection, guest-only authorization failures, login throttling, token issuance,
and current-token-only revocation.

### IMPLEMENTED - GET `/api/me`

Requires a Sanctum bearer token. Returns `200` with `data.user`
(`id`, `name`, `email`, `status`, `roles`, `created_at`) for the authenticated
user only; no user id is accepted from the client. Never returns the password
hash or tokens. Missing or revoked token returns `401`.

### IMPLEMENTED - PATCH `/api/me`

Updates the caller's profile. The only editable field is `name` (required,
string, max 255). Any other key in the payload (`email`, `status`, `roles`,
`id`, `user_id`, `password`, ...) is rejected with `422` and nothing is
written. Returns `200` with the updated `data.user`. Email change and extra
profile columns are deferred: the `users` table has no such columns and the
schema is unchanged.

### IMPLEMENTED - PUT `/api/me/password`

Body: `current_password`, `password` (min 8, must differ from the current
one), `password_confirmation`. A wrong `current_password` returns `422` and the
stored hash is untouched. On success every other token of the user is revoked;
the token used for the request stays valid. Returns `200` with `data: null`.
Throttled to 6 requests per minute (`429`).

### IMPLEMENTED - DELETE `/api/me`

Body: `current_password`. Soft-deletes the account (`deleted_at`), revokes all
its tokens and returns `200` with `data: null`. Conversations, payments,
roadmaps and other dependent rows are retained (RESTRICT foreign keys); the
account can no longer sign in and its email may be registered again. The last
active administrator cannot delete their account (`422`). Wrong password
returns `422`. Throttled to 6 requests per minute.

### IMPLEMENTED - GET `/api/admin/users`

Admin only (`403` for User/Contributor, `401` for Guest). Query: `status`
(`active|inactive|banned|pending`), `role` (`user|contributor|admin`),
`search` (name/email substring, max 100), `per_page` (1-100, default 20).
Soft-deleted users are excluded. Returns
`{ status, data: [user...], meta: { current_page, last_page, per_page, total } }`.

### IMPLEMENTED - GET `/api/admin/users/{id}`

Admin only. `{id}` must be a UUID. Returns `data.user`. Soft-deleted or
malformed ids return `404`.

### IMPLEMENTED - PATCH `/api/admin/users/{id}/status`

Admin only. Body: `status` in `active|inactive|banned`; other keys are
rejected with `422`. Moving a user away from `active` revokes all their tokens.
A `pending` account can only be moved to `active` (this is how accounts are
activated). An admin cannot change their own status (`403`). Roles are changed
through the endpoint below.

### IMPLEMENTED - PUT `/api/admin/users/{id}/role`

Admin only (`401` for Guest, `403` for User/Contributor; an admin cannot change
their own role). Throttled to 6 requests per minute (`429`). Body:
`role` in `user|contributor|admin` and optional `current_password`; other keys
are rejected with `422`. New accounts have exactly one role; legacy accounts
may hold several rows in `user_roles` (`data.user.roles` is an array), and this
call replaces all of them with the requested role (same single role again is a
no-op). Granting or revoking `admin` requires the acting
admin's `current_password`. Fails with `422` when the target is `pending` or
`banned`, or when it would remove the last active admin; soft-deleted or
malformed ids return `404`. A change revokes all of the target's tokens. The
change is logged to the application log (actor, target, old and new role); no
audit table exists yet. Returns `data.user`.

**AUTH-03 tests**: `backend/tests/Feature/Auth/AdminUserRoleTest.php` (RBAC for
all four actors, own-role guard, password confirmation, last-admin guard,
legacy multi-role targets, missing role row, throttling, token revocation; the
last-admin guard is tested at service level only, as the API cannot reach it).

**AUTH-02 tests**: `ProfileTest.php` (ownership, mass-assignment, password,
deletion, last-admin guard) and `AdminUserTest.php` (RBAC for all four actors,
filters, pagination, token revocation, strict payload).

---

## 5. Content Domain (TEAM_MEMBER_B)

### IMPLEMENTED — GET /api/v1/articles
- **Owner**: `TEAM_MEMBER_B`
- **Authentication**: None (Public)
- **Query Parameters**:
  - `category_slug` (string, optional)
  - `category_id` (uuid, optional)
  - `tag_slug` (string, optional)
  - `tag_id` (uuid, optional)
  - `search` (string, optional - searches title)
  - `author_id` (uuid, optional)
  - `sort` (string, `latest`|`oldest`, default `latest`)
  - `per_page` (integer, default 15)
  - `my_articles` (boolean, requires authenticated Contributor/Admin)
- **Success — 200 OK**:
```json
{
  "current_page": 1,
  "data": [
    {
      "id": "uuid",
      "author_id": "uuid",
      "category_id": "uuid",
      "published_version_id": "uuid",
      "slug": "getting-started",
      "status": "published",
      "published_at": "2026-11-03T00:00:00Z",
      "author": { "id": "uuid", "name": "Author Name" },
      "category": { "id": "uuid", "name": "Programming", "slug": "programming" },
      "published_version": { "id": "uuid", "version_no": 1, "title": "Getting Started", "content": "..." },
      "tags": [{ "id": "uuid", "name": "PHP", "slug": "php" }]
    }
  ],
  "per_page": 15,
  "total": 1
}
```
- **Tests**: `tests/Feature/Content/ArticleApiTest.php`

---

### IMPLEMENTED — GET /api/v1/articles/{slugOrId}
- **Owner**: `TEAM_MEMBER_B`
- **Authentication**: None for published; author/admin required for draft/archived
- **Success — 200 OK**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "slug": "getting-started",
    "status": "published",
    "published_version": {
      "id": "uuid",
      "version_no": 1,
      "title": "Getting Started",
      "content": "Full article markdown content...",
      "attachments": []
    }
  }
}
```
- **Errors**:
  - 404: Not Found
  - 403: Forbidden (Draft or archived article viewed by non-author)
- **Tests**: `tests/Feature/Content/ArticleApiTest.php`

---

### IMPLEMENTED — POST /api/v1/articles
- **Owner**: `TEAM_MEMBER_B`
- **Authentication**: Authenticated Contributor or Admin
- **Request**:
```json
{
  "title": "Clean Code Principles",
  "content": "Comprehensive markdown content...",
  "category_id": "uuid (optional)",
  "slug": "custom-slug (optional)",
  "tags": ["clean-code", "best-practices"]
}
```
- **Success — 201 Created**:
```json
{
  "status": "success",
  "message": "Article draft created successfully.",
  "data": {
    "id": "uuid",
    "status": "draft",
    "slug": "clean-code-principles",
    "published_version_id": null
  }
}
```
- **Errors**:
  - 401: Unauthenticated
  - 403: Forbidden (Learners cannot create articles)
  - 422: Validation failure
- **Tests**: `tests/Feature/Content/ArticleApiTest.php`

---

### IMPLEMENTED — POST /api/v1/articles/{article}/versions
- **Owner**: `TEAM_MEMBER_B`
- **Authentication**: Author Contributor or Admin
- **Request**:
```json
{
  "title": "Clean Code Principles (2nd Edition)",
  "content": "Updated markdown content...",
  "category_id": "uuid (optional)",
  "tags": ["clean-code", "architecture"]
}
```
- **Success — 200 OK**:
```json
{
  "status": "success",
  "message": "New article version created successfully.",
  "data": {
    "id": "uuid",
    "article_id": "uuid",
    "version_no": 2,
    "title": "Clean Code Principles (2nd Edition)",
    "content": "..."
  }
}
```
- **Tests**: `tests/Feature/Content/ArticleApiTest.php`

---

### IMPLEMENTED — POST /api/v1/articles/{article}/publish
- **Owner**: `TEAM_MEMBER_B`
- **Authentication**: Author Contributor or Admin
- **Request**:
```json
{
  "version_id": "uuid (optional - defaults to latest version)"
}
```
- **Success — 200 OK**:
```json
{
  "status": "success",
  "message": "Article published successfully.",
  "data": {
    "id": "uuid",
    "status": "published",
    "published_version_id": "uuid",
    "published_at": "2026-11-03T01:00:00Z"
  }
}
```
- **Errors**:
  - 422: Validation failure (e.g. version does not belong to this article)
- **Tests**: `tests/Feature/Content/ArticleApiTest.php`

---

### IMPLEMENTED — POST /api/v1/articles/{article}/archive
- **Owner**: `TEAM_MEMBER_B`
- **Authentication**: Author Contributor or Admin
- **Success — 200 OK**:
```json
{
  "status": "success",
  "message": "Article archived successfully.",
  "data": { "id": "uuid", "status": "archived" }
}
```
- **Tests**: `tests/Feature/Content/ArticleApiTest.php`

---

### IMPLEMENTED — DELETE /api/v1/articles/{article}
- **Owner**: `TEAM_MEMBER_B`
- **Authentication**: Author Contributor or Admin (Soft deletes)
- **Success — 200 OK**:
```json
{
  "status": "success",
  "message": "Article deleted successfully."
}
```
- **Tests**: `tests/Feature/Content/ArticleApiTest.php`

---

### IMPLEMENTED — GET /api/v1/categories
- **Owner**: `TEAM_MEMBER_B`
- **Authentication**: None (Public)
- **Success — 200 OK**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Programming",
      "slug": "programming",
      "parent_id": null,
      "articles_count": 5,
      "children": [
        {
          "id": "uuid",
          "name": "PHP",
          "slug": "php",
          "parent_id": "uuid",
          "articles_count": 3
        }
      ]
    }
  ]
}
```
- **Tests**: `tests/Feature/Content/CategoryApiTest.php`

---

### IMPLEMENTED — POST /api/v1/categories
- **Owner**: `TEAM_MEMBER_B`
- **Authentication**: Admin only
- **Request**:
```json
{
  "name": "DevOps",
  "slug": "devops (optional)",
  "parent_id": "uuid (optional)"
}
```
- **Success — 201 Created**:
```json
{
  "status": "success",
  "message": "Category created successfully.",
  "data": { "id": "uuid", "name": "DevOps", "slug": "devops" }
}
```
- **Tests**: `tests/Feature/Content/CategoryApiTest.php`

---

### IMPLEMENTED — GET /api/v1/tags
- **Owner**: `TEAM_MEMBER_B`
- **Authentication**: None (Public)
- **Success — 200 OK**: paginated list of tags with `articles_count`.
- **Tests**: `tests/Feature/Content/TagApiTest.php`

---

### IMPLEMENTED — POST /api/v1/tags
- **Owner**: `TEAM_MEMBER_B`
- **Authentication**: Contributor or Admin
- **Request**: `{ "name": "PostgreSQL", "slug": "postgresql" }`
- **Success — 201 Created**
- **Tests**: `tests/Feature/Content/TagApiTest.php`

---

### IMPLEMENTED — GET /api/v1/bookmarks
- **Owner**: `TEAM_MEMBER_B`
- **Authentication**: Authenticated User
- **Success — 200 OK**: paginated list of user's bookmarked published articles.
- **Tests**: `tests/Feature/Content/BookmarkApiTest.php`

---

### IMPLEMENTED — POST /api/v1/articles/{articleId}/bookmark
- **Owner**: `TEAM_MEMBER_B`
- **Authentication**: Authenticated User
- **Success — 201 Created**: `{ "status": "success", "message": "Article bookmarked successfully." }`
- **Errors**: 404 if article not found or not published.
- **Tests**: `tests/Feature/Content/BookmarkApiTest.php`

---

### IMPLEMENTED — DELETE /api/v1/articles/{articleId}/bookmark
- **Owner**: `TEAM_MEMBER_B`
- **Authentication**: Authenticated User
- **Success — 200 OK**: `{ "status": "success", "message": "Bookmark removed successfully." }`
- **Tests**: `tests/Feature/Content/BookmarkApiTest.php`

---

### IMPLEMENTED — POST /api/v1/versions/{version}/attachments
- **Owner**: `TEAM_MEMBER_B`
- **Authentication**: Author Contributor or Admin
- **Request**:
```json
{
  "object_key": "courses/materials/doc1.pdf",
  "file_name": "doc1.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 1048576
}
```
- **Success — 201 Created**
- **Tests**: `tests/Feature/Content/AttachmentApiTest.php`

---

### IMPLEMENTED — DELETE /api/v1/attachments/{attachmentId}
- **Owner**: `TEAM_MEMBER_B`
- **Authentication**: Author Contributor or Admin
- **Success — 200 OK**
- **Tests**: `tests/Feature/Content/AttachmentApiTest.php`

---

## 6. Learning / Engagement

**Common authentication**: all routes below use `auth:sanctum` Bearer tokens. Owner of the parent roadmap or an Admin may access. Token issuance/login is implemented by Identity/Auth AUTH-01; Learning tests use Sanctum test authentication and a real token regression test.

**Common success envelope**: `{ "status": "success", "data": ... }`. Prerequisite mutation errors use `{ "status": "error", "message": "..." }`; Laravel validation errors use `{ "message": "...", "errors": { ... } }`.

**Open decisions**: see OQ-01..OQ-08 in `docs/specs/learning/`. OQ-05 is resolved (see the progress section and `docs/decisions/2026-10-22-learning-progress-authority.md`); the remaining OQs still need Product/API approval.

### IMPLEMENTED — Roadmaps

| Method | Path | Request | Success | Main errors |
|---|---|---|---|---|
| GET | `/api/learning/roadmaps` | — | 200, `data` array; owner sees own, Admin sees all; items ordered by `position` | 401 |
| POST | `/api/learning/roadmaps` | `title` required, `goal` required, `status` optional enum | 201, `data` roadmap with `items` | 401, 422 |
| GET | `/api/learning/roadmaps/{roadmap}` | UUID path | 200, `data` roadmap with items | 401, 404 foreign/unknown |
| PUT | `/api/learning/roadmaps/{roadmap}` | partial `title`, `goal`, `status` | 200, `data` roadmap | 401, 404, 422 |
| DELETE | `/api/learning/roadmaps/{roadmap}` | — | 200, `{ "status": "success" }`; cascades items/progress/prerequisite edges | 401, 404 |

`user_id` is derived from the authenticated actor and is never accepted from the payload. Invalid/non-UUID path values return 404 before any database query. Create/update state transitions, quota, and archived-edit rules remain OQ-01/OQ-02.

### IMPLEMENTED — Roadmap items

| Method | Path | Request | Success | Main errors |
|---|---|---|---|---|
| POST | `/api/learning/roadmaps/{roadmap}/items` | `title` required, `position` required integer 0..65535, optional `article_id`/`description`; `status` must be omitted | 201, `data` item (status defaults to `pending`) | 401, 404 foreign roadmap, 422 validation/position conflict/status supplied |
| PUT | `/api/learning/roadmaps/{roadmap}/items/{item}` | partial `title`/`description`/`article_id`/`position`; `status` must be omitted | 200, `data` item | 401, 404 foreign/mismatched item, 422 validation/position conflict/status supplied |
| DELETE | `/api/learning/roadmaps/{roadmap}/items/{item}` | — | 200, `{ "status": "success" }`; cascades progress/edges | 401, 404 |

Position uniqueness is enforced by `(roadmap_id, position)`; the application maps a concurrent unique violation to a 422 `position` validation error rather than a 500. `article_id` must reference a non-soft-deleted article; published/draft/visibility rules remain OQ-04. Item `status` is read-only through this API: it mirrors `learning_progress.status` and is written only by the progress endpoint. Sending `status` to an item endpoint returns 422.

### IMPLEMENTED — Prerequisites

| Method | Path | Request | Success | Main errors |
|---|---|---|---|---|
| POST | `/api/learning/roadmap-items/{item}/prerequisites` | `prerequisite_item_id` required UUID | 201, `data: { roadmap_item_id, prerequisite_item_id }` | 401, 403 foreign item, 404 missing/foreign prerequisite, 409 duplicate, 422 self/cycle |
| DELETE | `/api/learning/roadmap-items/{item}/prerequisites/{prerequisite}` | UUID paths | 200, `{ "status": "success" }` | 401, 403 foreign item, 404 missing/foreign prerequisite/edge |

The full graph for the roadmap is validated before insert. Concurrent edge additions are serialized by locking the roadmap's items; a cycle created by two simultaneous requests is rejected by the second transaction. Cross-roadmap prerequisites are rejected in the current implementation; whether cross-roadmap should be allowed remains OQ-06. Batch endpoints are not implemented.

### IMPLEMENTED — GET `/api/learning/roadmap-items/{item}/progress`

**Owner**: `TEAM_MEMBER_C`
**Authentication**: `auth:sanctum` Bearer token. Owner of the parent roadmap or Admin only. Token issuance/login is not yet implemented; see the common authentication note above.

**Success — 200**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "roadmap_item_id": "uuid",
    "status": "in_progress",
    "started_at": "2026-10-21T10:00:00.000000Z",
    "completed_at": null,
    "updated_at": "2026-10-21T10:00:00.000000Z"
  }
}
```

`data` is `null` when no tracker exists. GET never creates a tracker.

**Errors**: `401` unauthenticated; `403` foreign item; `404` absent item. No foreign tracker data is exposed.

### IMPLEMENTED — PATCH `/api/learning/roadmap-items/{item}/progress`

**Owner**: `TEAM_MEMBER_C`
**Authentication**: same as GET.

**Request**

```json
{ "status": "pending|in_progress|completed|skipped" }
```

**Success — 200**: standard `{ "status": "success", "message": "...", "data": { ...progress } }` envelope.

**Errors**: `401` unauthenticated; `403` foreign item; `404` absent item; `422` missing or invalid `status`.

**Progress decision (OQ-05)**:

- `learning_progress.status` is authoritative. In the same transaction this endpoint also updates `roadmap_items.status` as a denormalized mirror for roadmap reads. Item create/update endpoints reject `status`.
- All transitions among `pending`, `in_progress`, `completed`, `skipped` are allowed.
- Entering `in_progress` sets `started_at` only if it is null. It is never reset by this endpoint.
- Entering `completed` sets `completed_at`; every non-completed status clears it.
- Same-status `completed` retry keeps the original `completed_at`; every non-completed status clears it.
- A database transaction locks the parent item before find-or-create. The unique `roadmap_item_id` constraint remains the final 1:1 guard. Same-status retry returns one canonical tracker row.
- No enrollment, course progress, time spent, bookmark sync, or roadmap auto-completion occurs.

> **Resolution**: OQ-05 was resolved on 2026-10-22 by explicit user authorization. See `docs/decisions/2026-10-22-learning-progress-authority.md`. The data migration `2026_10_22_000001_sync_roadmap_item_status_with_progress.php` backfills item statuses from progress rows and normalizes items without progress to `pending`.

**Tests**: `backend/tests/Feature/Learning/RoadmapProgressTest.php`.

---

## 7. AI Companion / Roadmap Assistant

### IMPLEMENTED — POST `/api/ai/roadmaps/preview`

**Owner**: TEAM_MEMBER_C

**Authentication**: `auth:sanctum` Bearer token. Laravel calls the separate FastAPI service using a private service token; the DeepSeek key stays in that service only.

**Request**

```json
{
  "goal": "Become a Data Engineer",
  "level": "beginner",
  "weeks": 24,
  "hours_per_week": 8,
  "job_postings": ["Pasted job requirements text"]
}
```

**Success — 200**

Returns a 4-12 step personalized draft; no roadmap is persisted. Optional job postings accept up to 5 strings, 5000 characters each, with a combined maximum of 15000 characters. Laravel returns a field-level 422 validation error if the combined limit is exceeded. Laravel sends only a backend-selected read-only allowlist of up to 100 published catalog IDs and titles. Draft items use `article_id: null`; no resource ID is inferred or created. Provider metadata contains no credentials.

**Errors**: `401` unauthenticated; `422` invalid input; `502` provider rejection/invalid output; `503` provider unavailable or missing configuration; `504` timeout.

**Rate limit**: Non-admin users are limited to 10 requests per minute per user. Admins are exempt from the application limiter.

### IMPLEMENTED — POST `/api/ai/roadmaps/confirm`

**Owner**: TEAM_MEMBER_C
**Authentication**: `auth:sanctum`; User, Contributor, or Admin may save a roadmap owned by that authenticated actor. Guests receive `401`.

**Request**

```json
{
  "goal": "Prepare for a data role",
  "title": "Personal plan",
  "summary": "A preview-only summary",
  "items": [
    { "position": 1, "title": "SQL", "description": "Practice queries", "skills": [] },
    { "position": 2, "title": "Python", "description": "Build data scripts", "skills": ["pandas"] },
    { "position": 3, "title": "Spark", "description": "Process datasets", "skills": ["Spark"] },
    { "position": 4, "title": "Airflow", "description": "Schedule pipelines", "skills": ["Airflow"] }
  ]
}
```

Validation limits: `goal` 3-500 characters; `title` 1-255; `summary` 1-5000; `items` is an ordered list of 4-12 entries with sequential positions starting at 1; item title 1-255; description 1-5000; `skills` must be present as an array (empty is allowed) with at most 30 strings, each at most 100 characters. `article_id` is prohibited.

**Success — 201**

```json
{
  "status": "success",
  "message": "Roadmap saved successfully.",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "title": "Personal plan",
    "goal": "Prepare for a data role",
    "status": "active",
    "items": [
      { "id": "uuid", "roadmap_id": "uuid", "title": "SQL", "description": "Practice queries", "position": 1 }
    ]
  }
}
```

The summary is preview-only because the Learning schema has no summary field. Skills are appended to item descriptions because the Learning schema has no skills column; all validated skills are retained. The roadmap and all items are created in one transaction, so a failure while creating any item rolls back the entire save.

**Errors**

| Status | Condition | Response |
|---|---|---|
| 401 | Guest request | Standard unauthenticated API error |
| 422 | Invalid fields or non-sequential item positions | `{ "message": "...", "errors": { "items": ["..."] } }` |

Durable idempotent retry remains pending approval for a Learning generation key and unique constraint. If the response is lost, the client cannot infer whether the commit completed; check the user's roadmap list before retrying because a retry may create a duplicate.

**Tests**: `backend/tests/Feature/AI/RoadmapGenerationTest.php` covers guest rejection, User/Contributor confirmation ownership, empty skills, sequential positions, and rollback when item creation fails. `backend/tests/Unit/AI/AIRoadmapServiceTest.php` verifies the service token and published catalog allowlist.
**AI service deployment**: Build `ai-service/Dockerfile` as a separate web
service. FastAPI requires `DEEPSEEK_API_KEY` and `AI_SERVICE_TOKEN`; Laravel
requires `AI_SERVICE_URL` and the matching `AI_SERVICE_TOKEN`. `AI_MODEL` is
optional and defaults to `deepseek-flash`. DeepSeek API usage is metered by
tokens; configure an API key with available balance before enabling production traffic.

---

## 8. Endpoint Template

Copy this block only after feature approval:

~~~~markdown
### <STATUS> — <METHOD> <PATH>

**Owner**: `<TEAM_MEMBER_X>`  
**Authentication**: `<none | exact mechanism and role>`

**Request**
```json
{ "field": "type" }
```

**Success — <HTTP status>**
```json
{ "data": {} }
```

**Errors**
| Status | Condition | Response |
|---|---|---|
| 422 | Validation failure | `<schema>` |

**Filtering / sorting / pagination**: `<none | specification>`

**Tests**: `<test paths and cases>`
~~~~

---

## 9. Change Log

| Version | Date | Change |
| --- | --- | --- |
| 0.8 | 2026-11-06 | Documented AI-05 preview and confirm endpoints; separated generation into FastAPI service |
| 0.7 | 2026-11-03 | Documented all 21 Content Domain endpoints, verified by automated unit and feature test suite |
| 0.6 | 2026-10-30 | AUTH-01 authorization and login hardening: guest-only `UserPolicy` checks on register/login/logout, `429` login throttling, explicit failure when the seeded `user` role is missing; frontend keeps the bearer token in memory instead of web storage |
| 0.5 | 2026-10-23 | Implemented AUTH-01 registration, login, logout, Sanctum bearer-token contract, and feature coverage; activation/throttling/token lifetime remain deferred |
| 0.4 | 2026-10-22 | Resolved OQ-05: progress status authoritative; item status mirror; item endpoints reject `status`; data backfill migration |
| 0.3 | 2026-10-22 | Documented all 12 Learning routes; corrected inventory/evidence; noted OQ-05 approval gap |
| 0.2 | 2026-10-21 | Approved/implemented LRN-002 roadmap-item progress contract |
| 0.1 | 2026-10-06 | Created evidence-based empty API inventory and endpoint template |
