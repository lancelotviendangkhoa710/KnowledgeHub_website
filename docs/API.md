# docs/API.md â€” KnowledgeHub API Contract

**Version**: 0.1 | **Date**: 2026-10-06
**Status**: AUTH-01 is implemented with Laravel Sanctum bearer tokens. Other
domains remain documented as implementation work lands.

> This document is the frontend/backend boundary once API implementation begins.
> New endpoints are documented in the same task that implements them.
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

### AUTH-01 — Registration, login, logout

Owner: TEAM_MEMBER_A. Authentication uses Laravel Sanctum personal access tokens
in the `Authorization: Bearer <token>` header. Registration creates a `pending`
user with the default `user` role and does not issue a token. Email verification
delivery is outside AUTH-01. Only `active` users may log in.

#### `POST /api/auth/register`

Request: `name`, `email`, `password`, and `password_confirmation`.

Success: `201` with `data.user` containing `id`, `name`, `email`, `status`, and
`roles`. Validation errors use Laravel's `422` response with an `errors` object.
Email is normalized to lowercase and must be unique among non-deleted users.

#### `POST /api/auth/login`

Request: `email` and `password`. Success: `200` with `data.user` and the plain
token in `data.token`. The plain token is returned only in this response and is
stored hashed in the database. Invalid credentials or a non-active account
return `422` with `The provided credentials are invalid.`

#### `POST /api/auth/logout`

Requires a valid Sanctum bearer token. The current token is deleted and the
endpoint returns `200` with `data: null`. Missing or revoked tokens return `401`.

| Domain | Owner | Implemented | Approved contract | Notes |
|---|---|---:|---:|---|
| Identity/Auth | TEAM_MEMBER_A | 0 | 0 | App source absent |
| Content | TEAM_MEMBER_B | 12 | 12 | Implemented in routes/api/content.php |
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
