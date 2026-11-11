# Progress: Explicit Tag Slug Conflict Handling (Backend, Content)

- **Owner:** TEAM_MEMBER_B (Domain: Content)
- **Branch:** `p2/BE-tag-explicit-slug-conflict` (from `origin/dev` 4f0c8c4)
- **Goal:** CodeRabbit (PR #51): on `POST /api/v1/tags` with an explicit `slug`, two concurrent requests could both pass `unique:tags,slug`; `TagService::create` then auto-suffixed the explicit slug (`-1`) and returned 201. An explicit slug must never be changed; a conflict must return 422 with `errors.slug`.

---

## Checklist

- [x] **Orient** - `CreateTagRequest`: `slug => nullable|string|max:100|unique:tags,slug`. `TagService::create` auto-suffixed every slug (explicit or derived) in a `while exists()` loop, then `Tag::create`. `tags.slug` has a DB unique index. Laravel v11.57, tests on PostgreSQL.
- [x] **Service change** (`TagService::create`)
  - No slug given: derive from name, auto-suffix as before.
  - Explicit slug: no suffixing; if already taken at service time -> `ValidationException` (`errors.slug`, message `validation.unique`, same as the FormRequest).
  - Insert wrapped in `DB::transaction` (savepoint when nested) and `UniqueConstraintViolationException` caught: explicit slug -> 422 `errors.slug`; derived slug -> rethrown (unchanged behaviour).
- [x] **Tests** (`TagApiTest`)
  - `test_explicit_slug_already_taken_returns_422`
  - `test_explicit_slug_taken_concurrently_returns_422_instead_of_suffixing` (a `Tag::creating` listener inserts the same slug right before our insert to simulate the race)
  - `test_missing_slug_is_auto_suffixed_when_taken` (`docker` -> `docker-1`, 201)
- [x] **Self-review** - `git diff --check` clean, no CRLF churn, forbidden-term grep clean.
- [x] **PROGRESS** - this file.

## Files Changed

- `backend/app/Services/Content/TagService.php`
- `backend/tests/Feature/Content/TagApiTest.php`
- `PROGRESS_BE_TAG_EXPLICIT_SLUG.md`

`TagController` unchanged: Laravel renders the `ValidationException` as the standard 422 `{message, errors}` body.

## API / DB Impact

- No contract change: same request params; 201 success shape unchanged; the new 422 uses the existing validation error shape.
- No migration, route or docs change.

## Known Limitation

- A derived (no-slug) request that loses a race to the same slug still surfaces the DB error (500), as before; no retry loop was added (out of scope).

## How to Run (NOT run in the agent environment - PHP unavailable)

```
docker compose exec app php artisan test tests/Feature/Content/TagApiTest.php
./scripts/test-guardrails.ps1 -BaseRef origin/dev -RequireTaskId
```
