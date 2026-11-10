# PROGRESS — CONTENT-03 Tag Library UI (list + create)

**Owner:** TEAM_MEMBER_B (p2) · **Branch:** `p2/CONTENT-03-admin-tag-management` (from `origin/dev`)
**Scope:** frontend only. No backend, DB, API or docs change.

## Checklist

- [x] Step 1: Orient; record exact contract from code (below).
- [x] Step 2: `frontend/src/lib/tagAdminClient.ts`.
- [x] Step 3: `frontend/src/app/(app)/admin/tags/page.tsx` with guard, list, filter, create.
- [x] Step 4: `tsc --noEmit` 0 errors; `tsconfig.tsbuildinfo` restored; `git diff --check` clean; diff self-reviewed.
- [x] Step 5: Manual test plan (below) — written, **not executed** (no running stack in the agent environment).
- [x] Step 6: Atomic `p2:` commits.

## Contract (read from code, not from docs)

| Item | Source | Behaviour |
|---|---|---|
| `GET /api/v1/tags` | `routes/api/content.php`, `TagController::index`, `TagService::getAll` | Public. Laravel `LengthAwarePaginator` JSON (`data`, `current_page`, `last_page`, `total`, ...), `?per_page=` (default 50, no cap), ordered by `name`. Items: `id` (uuid), `name`, `slug`, `created_at`, `articles_count` (`withCount('articles')`). |
| `POST /api/v1/tags` | `TagController::store`, `CreateTagRequest`, `TagService::create` | `auth:sanctum` → 401 without token. `authorize()` allows `contributor` or `admin` only → 403 otherwise. Rules: `name` required, string, max 100; `slug` nullable, string, max 100, `unique:tags,slug` → 422. Success always **201** `{status:"success", message, data: tag}`. |
| Duplicates | `TagService::create` | **Not idempotent.** With no slug, `Str::slug(name)` is used and on collision the service appends `-1`, `-2`... and still returns 201 → a silent duplicate ("PHP" twice gives `php` and `php-1`). Name has no unique constraint (DB: only `slug` unique). There is no "200 existing" response. |
| Normalisation | `Str::slug`, `TrimStrings` middleware | Name is trimmed; slug = ASCII transliteration, `@`→`-at-`, `_`→`-`, lowercased, non `[-a-z0-9\s]` removed, runs of `-`/space → `-`, trimmed. `resolveTagIds` (article tagging) matches by `slug` or exact `name`. |
| Update/rename/merge/delete | — | No endpoints. Not implemented in UI. |

## Design decisions

1. **Explicit slug on create.** The client always sends `slug = tagSlug(name)` (JS port of `Str::slug`). A collision (e.g. a concurrent create) then fails with **422 `errors.slug`** instead of producing a `-1` copy. On that 422 the UI refetches the list and shows "already existed" **only if the refreshed list really contains a matching tag**; otherwise it shows the real validation message.
   - Slug port parity (voku/portable-ascii latin table used by `Str::ascii`): `đ/ð→d`, `ł→l`, `ß→ss`, `æ→ae`, `œ→oe`, `þ→th`, `ø→o`, en/em dash → `-`, `€→EUR`, then NFKD + strip combining marks. Spot-checked with node outside the repo: `Łódź→lodz`, `Œuvre→oeuvre`, `Þór→thor`, `Straße→strasse`, `A–B — C→a-b-c`, `Price €5→price-eur5`.
   - A name whose generated slug exceeds 100 characters (e.g. many `@` → `-at-`) is blocked with its own hint, since the API rule is `slug max:100`.
2. **Client duplicate check** before submit: same normalised name (whitespace collapsed, trimmed, NFKC, case-insensitive) **or** same slug as an existing tag → live hint "Already exists as …", submit disabled.
3. **Names whose slug is empty** (e.g. only CJK characters or only symbols like `+++`) are blocked client-side: backend would store an empty slug and the next one as `-1`. Limitation: Laravel's ASCII transliteration can romanise some non-Latin scripts that the JS port drops; such names are blocked rather than risk a mismatch.
4. Whole list is loaded (paginated at 100/page, safety stop 50 pages) so duplicate detection and filtering cover all tags. If the safety stop is hit, a warning says the list and the duplicate check may be incomplete. Create is disabled while the list is loading or failed to load (no reliable duplicate check).
5. Guard mirrors `CreateTagRequest::authorize`: contributor/admin. Page title "Tag Library" (contributors are allowed). Guest → `router.replace('/login?redirect=/admin/tags')`; token-only session → profile restored via `GET /me` (same pattern as `/courses/manage`); other roles → "Access restricted" card.
6. Network failure on create = unknown result → message + **Retry** that refetches the list first (duplicate hint then shows if the first attempt landed).

## Manual tests (to run on a local stack)

Actors:
| # | Actor | Expected |
|---|---|---|
| A1 | Guest (no token) opens `/admin/tags` | Redirect to `/login?redirect=/admin/tags`; after login returns to page. |
| A2 | `user` role | "Access restricted" card, no list/form, no API POST. |
| A3 | `contributor` | List + form; can create. |
| A4 | `admin` | Same as contributor. |

Create / duplicates (as contributor, with existing tag "PHP" slug `php`):
| Input | Expected |
|---|---|
| `GraphQL` | 201 → "Created tag "GraphQL" (graphql)", input cleared, list refetched and sorted. |
| `php`, `PHP`, `  PHP  `, `Php` | Hint "Already exists as "PHP" (php)", button disabled, no request. |
| `Machine   Learning` vs existing `Machine Learning` | Treated as same (whitespace collapsed). |
| `Học Máy` vs existing `hoc may` | Same slug `hoc-may` → already exists. |
| `C++` with existing `C` | Same slug `c` → already exists (backend would collide on slug). |
| `+++` or `日本語` | Hint "Include at least one Latin letter or number.", disabled. |
| 101+ characters | Hint "Use at most 100 characters.", disabled. |
| Race: two tabs create `Rust` | Second gets 422 `slug` → "… already existed …", list refreshed. |
| 422 other (e.g. name too long bypassing UI) | Validation message in `role="alert"`. |
| Token revoked then create | 401 → "Your session has expired…" + "Sign in again" link. |
| Role demoted to `user` then create | 403 → "Your account is not allowed to create tags." |
| API stopped: page load | Load error alert + Retry; create disabled. |
| API stopped: create | "may or may not have been created" + Retry (refetches list). |

Filter: typing `ph` shows PHP only; `hoc-may` matches by slug; empty filter shows all; "No matching tags" empty state. Keyboard: Tab order input → Create → filter; Enter submits; focus outlines visible.

## Verification run

- `cd frontend && node node_modules/typescript/lib/tsc.js --noEmit -p .` → 0 errors; `git checkout -- frontend/tsconfig.tsbuildinfo` afterwards.
- `git diff --check` → clean.
- Slug port spot-checked with node against expected `Str::slug` output (`Học Máy`→`hoc-may`, `Đà Nẵng`→`da-nang`, `C++`→`c`, `Node.js`→`nodejs`, `foo@bar`→`foo-at-bar`, `snake_case`→`snake-case`).
- **Not run:** `npm run build`, `npm run lint` (node_modules is a Windows install symlink; native binaries do not run in the agent VM), backend tests, browser tests.

## Follow-ups (need approval, out of scope)

Backend (TEAM_MEMBER_B backend work, needs API approval):
- **Non-idempotent `POST /tags`**: without `slug`, `TagService::create` silently suffixes `-1`, `-2`… and returns 201, creating duplicates. Should return the existing tag (200) or reject (422).
- **Name uniqueness**: no unique/normalised rule on `tags.name`; add a normalised (trim, case, Unicode) uniqueness check.
- **`per_page` cap**: `TagController::index` accepts any `per_page`; cap it (e.g. 100).
- **`resolveTagIds` race**: article tagging does find-then-create without locking/unique handling; concurrent saves can create duplicate tags or hit a unique-slug exception.

Frontend / other:

- Nav link to `/admin/tags` in `SiteHeader` / `AuthActions` (shared file, not in allowed list).
- Rename / merge / delete / hide tags: no backend endpoints; need backend + API contract approval (CONTENT-03 "Chờ duyệt"; tag FK is RESTRICT).
- CONTENT-03 gate items (article tag sync atomicity, ownership, visibility) are backend work and remain open; this branch only covers the Tag Library UI.
