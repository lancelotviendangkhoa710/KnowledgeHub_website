# PROGRESS — Article Version History page (CONTENT-02 follow-up)

**Owner:** TEAM_MEMBER_B (p2, Content) · **Branch:** `p2/FE-article-version-history` (from `origin/dev`)

## Checklist

- [x] Step 1: Orient; record contract & visibility rules from code (below).
- [x] Step 2: `frontend/src/lib/versionClient.ts` (fetch helpers with HTTP status + Myers line diff).
- [x] Step 3: Page `frontend/src/app/(app)/courses/[id]/versions/page.tsx` + components in `frontend/src/components/content/versions/`.
- [x] Step 4: `tsc --noEmit` 0 errors; `tsconfig.tsbuildinfo` restored; `git diff --check` clean; self-review.
- [x] Step 5: Manual test plan written (below) — **not executed** (no running stack in the agent environment).
- [x] Step 6: Atomic `p2:` commits.

## Contract (read from code, not changed)

| Item | Finding | Source |
|---|---|---|
| Route | `GET /api/v1/articles/{article}/versions` — in the **public** group (no `auth:sanctum`) | `backend/routes/api/content.php` |
| Binding | `{article}` = article UUID (route-model binding); slugs are not accepted → page resolves slug/id first via `GET /articles/{slugOrId}` | `ArticleController::versions` |
| Auth | `Gate::authorize('view', $article)` | `ArticleController::versions` |
| Response | `{ status: 'success', data: ArticleVersion[] }`, ordered `version_no DESC`, each with eager-loaded `creator` (User row) | `Article::versions()`, `ArticleVersion::creator()` |
| Fields | `id, article_id, version_no, title, content, created_by, created_at, creator` (no `updated_at`) | `ArticleVersion` model |
| Errors | 403 (policy denies), 404 `{code:'not_found'}` for unknown/soft-deleted article | `bootstrap/app.php` |
| Policy `view` | published → everyone; draft/archived → author with contributor/admin role; Admin bypasses via `before()` | `ArticlePolicy` |
| Article show | non-published + no user → 403 (not 401); with user → policy | `ArticleController::show` |

## Frontend behaviour

- `/courses/{idOrSlug}/versions`: resolve article → load versions (Bearer token sent when present, `cache: 'no-store'`).
- 401, or 403 without a token → sign-in card (`/login?redirect=/courses/{id}/versions`); 403 with token → restricted card; 404 → not-found card; other/network → error card with **Retry**.
- Timeline newest first: `v{n}`, title, creator **name only** (email never rendered), formatted `created_at`, "Published" badge for `article.published_version_id` ("Last published" when the article is not currently published), "Latest" badge.
- View mode: version title/meta + content as preformatted text (no HTML rendering, no `dangerouslySetInnerHTML`).
- Compare mode: base/compared selects, swap, "Compare with previous version" shortcut; unified line diff with old/new line numbers, `+`/`−` markers and screen-reader labels (not colour only), title change shown separately, unchanged runs collapsed (3 context lines, expandable), rows rendered in pages of 1500.
- Diff: common prefix/suffix trimmed, then Myers O(ND) with edit-distance budget 2000; above budget the changed block is shown as a full replacement with a notice.
- Accessibility: all controls are native buttons/selects/links; `aria-pressed` for selection and mode, `role="status"` live regions, labelled nav/section, focusable scrollable `<pre>`.

## Verification run

| Command | Result |
|---|---|
| `cd frontend && node node_modules/typescript/lib/tsc.js --noEmit -p .` | 0 errors (then `git checkout -- frontend/tsconfig.tsbuildinfo`) |
| `git diff --cached --check` before each commit | clean |
| Ad-hoc node script (outside repo) transpiling `versionClient.ts`: 3000 random diffs vs naive LCS | 0 failures (reconstruction + minimal edit counts) |
| Same script: 50k-line doc, 2-line edit / 20k-line rewrite / 20k scattered edits | 16 ms / 43 ms (approximate) / 26 ms (approximate) |
| `npm run build`, `npm run lint` | **Not run** — `node_modules` is a Windows install symlink; native binaries unavailable in the agent VM |

## Manual test plan (to run on a local stack)

| # | Scenario | Expected |
|---|---|---|
| 1 | Guest on a published course with ≥2 versions | List + published badge; view/compare work |
| 2 | Author (contributor) on own draft | Expected: list. **Currently likely 403 → restricted card** (see Risk 1) |
| 3 | Other contributor on someone else's draft | Restricted card (403) |
| 4 | Admin on any draft/archived course | Expected: list. **Currently likely 403** (Risk 1) |
| 5 | Guest on a draft (direct URL) | Sign-in card |
| 6 | Unknown id / slug | Not-found card |
| 7 | Only one version | Compare tab says nothing to compare; no "Compare with previous" button |
| 8 | Two identical versions | "no differences" status + message |
| 9 | Very long content (≥10k lines) with small edit | Collapsed context, fast; "Show N unchanged lines" expands |
| 10 | Very different long versions | Approximate notice, "Show more" paging |
| 11 | API down → Retry | Error card; Retry reloads |
| 12 | Keyboard only | Tab through timeline, mode buttons, selects, swap, expand buttons |

## Risks found (backend, out of scope — not changed)

1. **Bearer token ignored on public routes.** The versions (and show) routes are outside `auth:sanctum`; default guard is `web` (`config/auth.php`), so `$request->user()`/Gate see no user for token clients. Authors/Admins likely get 403 on draft/archived history. Fix (backend, p2): move the route into an optional-auth group or resolve the sanctum guard explicitly.
2. **Unpublished revisions exposed to guests.** For a published article the endpoint returns *all* versions, including newer unpublished revisions, to anyone. This conflicts with CONTENT-02 ("Guest/User never see drafts"). The page relies on the API as specified, so it shows whatever the API returns. Fix (backend): filter to versions ≤ published for non-authors, or require authorship.
3. **`creator` serialises the full User row** (incl. email) to guests. UI shows name only, but the data is in the response. Fix (backend): select `id,name` only.
4. Token is in memory (`authToken.ts`): a hard reload of this page loses the session → guest view.

## Follow-ups

- Link to `/courses/{id}/versions` from the course detail page and the manage/studio pages (not done: editing existing files was out of scope).
- Restore/rollback action — needs an approved endpoint (none today).
- Optional: side-by-side diff view; deep-linking selected versions via query string.
