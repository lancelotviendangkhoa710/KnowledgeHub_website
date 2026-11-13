# Progress: Stable Ordering for the Article List (Backend, Content)

- **Owner:** TEAM_MEMBER_B (Domain: Content)
- **Branch:** `p2/BE-article-list-stable-order` (from `origin/dev` 4f0c8c4)
- **Goal:** Make `GET /api/v1/articles` pagination deterministic. CodeRabbit (PR #52) noted that `ArticleService::listPublished()` ordered only by `published_at`, so articles sharing the same timestamp could be returned in a different order per page, duplicating or skipping courses across pages.

---

## Checklist

- [x] **Orient** - Previous query: `orderBy('published_at', 'asc')` for `sort=oldest`, otherwise `orderBy('published_at', 'desc')`, then `paginate($perPage)`. `listAuthorArticles()` (used by `my_articles=true`) ordered only by `updated_at desc`. No joins (filters use `whereHas` subqueries), so unqualified `id` is unambiguous.
- [x] **Service change** - `listPublished()`: `orderBy('published_at', $direction)->orderBy('id', $direction)`; `listAuthorArticles()`: `orderBy('updated_at', 'desc')->orderBy('id', 'desc')`.
- [x] **Test** - `ArticleApiTest::test_published_list_pagination_is_stable_when_published_at_ties`: 5 published articles forced to the same `published_at`; pages 1..3 with `per_page=2` contain all 5 ids with no duplicates; repeated request returns identical order; `sort=oldest` is the exact reverse.
- [x] **Self-review** - `git diff`, `git diff --check` clean; forbidden-term grep clean.
- [x] **PROGRESS** - this file.

## Files Changed

- `backend/app/Services/Content/ArticleService.php`
- `backend/tests/Feature/Content/ArticleApiTest.php`
- `PROGRESS_BE_ARTICLE_STABLE_ORDER.md`

## Decision

- Tie-breaker is the primary key `id` (UUID): unique, so the ordering is total. It uses the same direction as the main sort so `oldest` is exactly the reverse of `latest`.
- The order among equal timestamps is by UUID (effectively arbitrary but stable); it carries no business meaning.
- No API contract change: same params and response shape. No DB change (no migration/index added).

## How to Run (NOT run in the agent environment - PHP unavailable)

```
docker compose exec app php artisan test tests/Feature/Content/ArticleApiTest.php
./scripts/test-guardrails.ps1 -BaseRef origin/dev -RequireTaskId
```
