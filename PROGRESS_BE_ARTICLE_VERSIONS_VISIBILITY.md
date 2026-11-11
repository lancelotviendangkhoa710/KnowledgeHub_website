# Progress: Article Versions Visibility & Optional Bearer (Backend, Content)

- **Owner:** TEAM_MEMBER_B (Domain: Content)
- **Branch:** `p2/BE-article-versions-visibility` (from `origin/dev` 4f0c8c4)
- **Goal:** Fix CodeRabbit findings on PR #49 for `GET /api/v1/articles/{slugOrId}` and `GET /api/v1/articles/{article}/versions`.

## Problems

- **A.** Both routes are public (outside `auth:sanctum`) and the default guard is `web`, so a Bearer token was ignored: authors/admins got 403 on their own drafts.
- **B.** `versions()` returned every version (unpublished revisions, never-published drafts) to anyone allowed to view a published article, guests included.
- **C.** `creator` (and `author`) were serialized as the full User, including `email`.
- **D.** `show` by UUID / non-published slug eager loaded all `versions` (same leak as B).

## Checklist

- [x] **Orient** - routes in `backend/routes/api/content.php`; `ArticlePolicy::view(?User)` allows published for all, draft/archived for author or admin; `config/sanctum.php` guard = `['web']`.
- [x] **Optional bearer (A)** - `ArticleController::resolveUser()` = `$request->user() ?? Auth::guard('sanctum')->user()`; `show`/`versions` authorize with `Gate::forUser($user)`. `getUserId()` (used by `index` for `my_articles=true`) uses the same resolver. No route, middleware, auth config, provider or bootstrap change.
- [x] **Version visibility (B, D)** - `ArticleService::listVisibleVersions($article, $includeUnpublished)`; full history only when `Gate::forUser($user)->allows('update', $article)` (author with Contributor/Admin role, or Admin via `before()`); otherwise only `id = published_version_id` (empty when never published). `getById`/`getBySlug` no longer eager load all `versions`; `show` sets the filtered list (only on the UUID / non-published slug path, as before - the published-slug response shape is unchanged).
- [x] **Safe user columns (C)** - `author:id,name` in `listPublished`, `getPublishedBySlug`, `getBySlug`, `getById`; `creator:id,name` in versions. Matches the `author` shape already documented for the list; the frontend only reads `author.id` / `author.name`.
- [x] **Tests** - new `backend/tests/Feature/Content/ArticleVersionVisibilityTest.php` (real Sanctum bearer tokens):
  - guest on published article: versions endpoint and show-by-id return only the published version; no email in versions/show/list
  - plain user with bearer: only the published version
  - author with bearer: own draft show + versions -> 200 with both versions; own published article -> includes the unpublished revision
  - other contributor with bearer on someone's draft -> 403 (show and versions); guest on draft versions -> 403
  - admin with bearer: all versions
- [x] **Self-review** - `git diff --check` clean, no CRLF churn, forbidden-term grep clean.

## Files Changed

- `backend/app/Http/Controllers/Content/ArticleController.php`
- `backend/app/Services/Content/ArticleService.php`
- `backend/tests/Feature/Content/ArticleVersionVisibilityTest.php` (new)
- `PROGRESS_BE_ARTICLE_VERSIONS_VISIBILITY.md` (new)

## API / DB Impact

- DB: none. Routes: unchanged.
- Behaviour: Bearer tokens are now honoured on the public article routes (also `my_articles=true` on the list). Readers no longer see unpublished versions; `author`/`creator` objects contain only `id` and `name`.

## Needed docs/API.md Update (protected - not edited here)

- `GET /api/v1/articles/{slugOrId}`: state that authentication may be supplied as a Bearer token (optional); when a `versions` array is present it lists all versions only for the author/admin, otherwise only the published version; `author` is `{ id, name }`.
- Add a section for `GET /api/v1/articles/{article}/versions` (currently undocumented): optional Bearer; 200 `{status, data: [version...]}` newest first, each with `creator: { id, name }`; author/admin get all versions, everyone else only the published version (empty list never happens for a published article); 403 for draft/archived when not author/admin; 404 when not found.
- `GET /api/v1/articles`: note `my_articles=true` accepts a Bearer token.

## Follow-up (out of scope, not changed)

- `GET /api/v1/versions/{versionId}/attachments` (`ArticleAttachmentController::index`) is public and returns attachments for any version id, including unpublished ones; it should apply the same visibility rule.

## How to Run (NOT run in the agent environment - PHP unavailable)

```
docker compose exec app php artisan test tests/Feature/Content/
./scripts/test-guardrails.ps1 -BaseRef origin/dev -RequireTaskId
```
