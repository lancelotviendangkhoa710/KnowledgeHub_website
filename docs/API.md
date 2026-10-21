# docs/API.md  KnowledgeHub API Contract

**Version**: 0.2 | **Date**: 2026-10-21
**Status**: Learning progress contract approved and implemented. Other inventory entries remain evidence-based.

> This document is the frontend/backend boundary once API implementation begins.
> It intentionally does **not** invent endpoints, auth mechanisms, response envelopes, or pagination rules.
> Add an endpoint only after its task is approved and implementation/contract decision exists.

---

## 1. Evidence Audited

| Evidence | Result |
| --- | --- |
| `backend/routes/` | Absent |
| `backend/app/` | Absent |
| `backend/composer.json` | Absent |
| `backend/tests/` | Absent |
| Tracked endpoint definitions | None found |

Docker bootstrap can create a Laravel project at runtime (`docker/php/entrypoint.sh`), but generated application files are not tracked. Therefore no implemented API can be documented from repository evidence.

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

Learning progress endpoints are documented below. Other domains remain evidence-based.

| Domain | Owner | Implemented | Approved contract | Notes |
| --- | --- | ---: | ---: | --- |
| Identity/Auth | TEAM_MEMBER_A | 0 | 0 | App source absent |
| Content | TEAM_MEMBER_B | 12 | 12 | Implemented in routes/api/content.php |
| Learning/Engagement | TEAM_MEMBER_C | 2 | 2 | Roadmap-item progress only |
| AI Companion | TBD | 0 | 0 | AI service not in repository |
| Payment | TBD | 0 | 0 | Payment implementation absent |

---

## 4. Endpoint Template

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

## 5. Learning / Engagement

### IMPLEMENTED — GET `/api/learning/roadmap-items/{item}/progress`

**Owner**: `TEAM_MEMBER_C`
**Authentication**: Laravel `auth` middleware. Owner of the parent roadmap or Admin only. The frontend includes a stored Bearer token when one is provided by the future Identity/Auth runtime; this repository has no Bearer-token issuer or guard.

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

- `learning_progress.status` is authoritative. This endpoint never writes `roadmap_items.status`.
- All transitions among `pending`, `in_progress`, `completed`, `skipped` are allowed.
- Entering `in_progress` sets `started_at` only if it is null. It is never reset by this endpoint.
- Entering `completed` sets `completed_at`; every non-completed status clears it.
- A database transaction locks the parent item before find-or-create. The unique `roadmap_item_id` constraint remains the final 1:1 guard. Same-status retry returns one canonical tracker row.
- No enrollment, course progress, time spent, bookmark sync, or roadmap auto-completion occurs.

**Tests**: `backend/tests/Feature/Learning/RoadmapProgressTest.php`.

---

## 6. Change Log

| Version | Date | Change |
| --- | --- | --- |
| 0.2 | 2026-10-21 | Approved/implemented LRN-002 roadmap-item progress contract |
| 0.1 | 2026-10-06 | Created evidence-based empty API inventory and endpoint template |
