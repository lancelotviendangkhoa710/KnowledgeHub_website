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
- Diff: common prefix/suffix trimmed, then Myers O(ND) with edit-distance budget D = 2000 (bounds time to O((N+M)·D) and trace memory to O(D²), ~16 MB worst case). When the middle block needs more than 2000 line edits, the diff is **approximate**: every line of the changed middle block is listed as removed then added (prefix/suffix still matched), and the UI shows a notice. Counts are then upper bounds, not minimal.
- Reader filter (client-side mitigation): when the viewer has no token, or is signed in but is neither the article author nor an Admin (`getCurrentUser()` / `GET /me`), **only the version whose id equals `article.published_version_id`** is shown (no older or newer versions, since the API exposes no verifiable publication history), with a note that other versions are visible to the author and Admins. This is **UI only**: the data is still in the API response.
- Identity changes: the page subscribes to `subscribeCurrentUser`; when the in-memory Bearer credential differs from the one the data was loaded under (sign-in/sign-out), loaded versions and selections are cleared immediately and reloaded. Responses from superseded requests or from a session that changed mid-flight are ignored (request sequence + credential check). A `/me` result is only stored if the credential is unchanged when it returns.
- Entry point: a "Version history" link next to the version badge on the course detail page (`frontend/src/app/(app)/courses/[id]/page.tsx`, one self-contained insertion), visible to everyone; this page enforces visibility.
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
| 1 | Guest on a published course with ≥2 versions | Only the published version shown; "Only the published version is shown…" note |
| 1b | Signed-in non-author User/Contributor on published course | Same as 1 |
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
| 13 | Author signs out in another part of the app while on the page | Data cleared at once, reloaded as guest (published version only) |
| 14 | Course detail page | "Version history" link next to the version badge opens this page |

## Risks found (backend, out of scope — not changed)

1. **Bearer token ignored on public routes.** The versions (and show) routes are outside `auth:sanctum`; default guard is `web` (`config/auth.php`), so `$request->user()`/Gate see no user for token clients. Authors/Admins likely get 403 on draft/archived history. Fix (backend, p2): move the route into an optional-auth group or resolve the sanctum guard explicitly.
2. **Unpublished revisions exposed to guests.** For a published article the endpoint returns *all* versions, including newer unpublished revisions, to anyone. This conflicts with CONTENT-02 ("Guest/User never see drafts"). The page relies on the API as specified, so it shows whatever the API returns. Fix (backend): filter to versions ≤ published for non-authors, or require authorship.
3. **`creator` serialises the full User row** (incl. email) to guests. UI shows name only, but the data is in the response. Fix (backend): select `id,name` only.
4. Token is in memory (`authToken.ts`): a hard reload of this page loses the session → guest view.

### Required backend fix (p2 backend follow-up; real fix for Risks 1–3)

Tracked on branch **`p2/BE-article-versions-visibility`**.

- `ArticlePolicy` / `ArticleController::versions`: filter unpublished versions server-side for non-authors/non-admins (publication history must be verifiable server-side before readers see more than the published version).
- **Optional bearer identification** on `GET articles/{slugOrId}` and `GET articles/{article}/versions`: resolve the Sanctum user when a Bearer token is present (e.g. `auth('sanctum')->user()`), otherwise treat the request as a guest. The routes stay public; they are **not** moved into `auth:sanctum`.
- Limit creator columns: eager-load `creator:id,name` (no email).
- After that, the client-side filter stays as defence in depth.

## Follow-ups

- Detail page link: **done** (minimal insertion). A link from the manage/studio pages is still open.
- Restore/rollback action — needs an approved endpoint (none today).
- Optional: side-by-side diff view; deep-linking selected versions via query string.
