# docs/API.md â€” KnowledgeHub API Contract

**Version**: 0.1 | **Date**: 2026-10-06
**Status**: API inventory empty. No route files, controllers, or API implementation are tracked in this workspace.

> This document is the frontend/backend boundary once API implementation begins.
> It intentionally does **not** invent endpoints, auth mechanisms, response envelopes, or pagination rules.
> Add an endpoint only after its task is approved and implementation/contract decision exists.

---

## 1. Evidence Audited

| Evidence | Result |
|---|---|
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
|---|---|
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

No endpoints are currently documented as implemented, approved, or proposed.

| Domain | Owner | Implemented | Approved contract | Notes |
|---|---|---:|---:|---|
| Identity/Auth | TEAM_MEMBER_A | 0 | 0 | App source absent |
| Content | TEAM_MEMBER_B | 0 | 0 | App source absent |
| Learning/Engagement | TEAM_MEMBER_C | 0 | 0 | App source absent |
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

## 5. Change Log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-10-06 | Created evidence-based empty API inventory and endpoint template |
