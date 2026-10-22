# docs/API.md  KnowledgeHub API Contract

**Version**: 0.5 | **Date**: 2026-10-23
**Status**: AUTH-01 and Learning routes are implemented and documented. OQ-05 is resolved: `learning_progress.status` is authoritative and `roadmap_items.status` is its transactionally-maintained mirror. Other inventory entries remain evidence-based.

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
| Tracked endpoint definitions | Auth + Content + 12 Learning routes |

Backend source and tests are tracked. AUTH-01 uses Sanctum bearer tokens; registration creates a pending user and does not activate or issue a token. The Learning routes are implemented; roadmap, item, and prerequisite business rules listed as OPEN QUESTION in `docs/specs/learning/` still require Product/API approval.

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

Identity/Auth and Learning progress endpoints are documented below. Other domains remain evidence-based.

| Domain | Owner | Implemented | Approved contract | Notes |
| --- | --- | ---: | ---: | --- |
| Identity/Auth | TEAM_MEMBER_A | 3 | 3 | AUTH-01 registration, login and logout; activation and account management are deferred |
| Content | TEAM_MEMBER_B | 12 | 12 | Implemented in routes/api/content.php |
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
the `user` role. No token is issued. Validation failures return `422` with
Laravel's `errors` object, including duplicate active emails.

### IMPLEMENTED - POST `/api/auth/login`

Guest login accepts `email` and `password`. Only a non-deleted user with
`status=active` and a matching password receives `200` with `data.user` and a
one-time plain token in `data.token`; the stored token is hashed. Invalid
credentials and non-active accounts return `422` with a generic credentials
error. Login throttling, token expiration, and activation delivery are
deferred decisions.

### IMPLEMENTED - POST `/api/auth/logout`

Requires a valid Sanctum bearer token. The current token is deleted and the
endpoint returns `200` with `data: null`. Missing, invalid, or revoked tokens
return `401`; other tokens belonging to the same user remain valid.

**Tests**: `backend/tests/Feature/Auth/AuthTest.php` covers registration,
normalization, duplicate and soft-deleted email behavior, pending-login
rejection, token issuance, and current-token-only revocation.

---

## 5. Endpoint Template

Copy this block only after feature approval:

~~~~markdown
### <STATUS> â€” <METHOD> <PATH>

**Owner**: `<TEAM_MEMBER_X>`
**Authentication**: `<none | exact mechanism and role>`

**Request**
```json
{ "field": "type" }
```

**Success â€” <HTTP status>**
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

## 7. Change Log

| Version | Date | Change |
| --- | --- | --- |
| 0.5 | 2026-10-23 | Implemented AUTH-01 registration, login, logout, Sanctum bearer-token contract, and feature coverage; activation/throttling/token lifetime remain deferred |
| 0.4 | 2026-10-22 | Resolved OQ-05: progress status authoritative; item status mirror; item endpoints reject `status`; data backfill migration |
| 0.3 | 2026-10-22 | Documented all 12 Learning routes; corrected inventory/evidence; noted OQ-05 approval gap |
| 0.2 | 2026-10-21 | Approved/implemented LRN-002 roadmap-item progress contract |
| 0.1 | 2026-10-06 | Created evidence-based empty API inventory and endpoint template |
