# PROGRESS — Server-side pagination for the public course catalog (`/courses`)

**Owner:** TEAM_MEMBER_B (Content) · **Branch:** `p2/FE-courses-pagination` (stacked on `p2/FE-api-cold-start-retry`)

## Goal

`/courses` only rendered the first page of `GET /api/v1/articles` (Laravel paginator, default `per_page=15`),
so published courses beyond the 15th were invisible. The catalog now pages through the API.

## Checklist

- [x] Step 1: Orient & scope — requirement above; files below; API impact none (uses existing `page`,
      `per_page`, `category_id` query params); DB impact none; actors: Guest/User/Contributor/Admin all view
      published courses only (unchanged).
- [x] Step 2: `contentClient` pagination helper with typed meta (`fetchArticlesPage`).
- [x] Step 3: `courses/page.tsx` pagination UI + URL sync.
- [x] Step 4: `tsc --noEmit` 0 errors; `tsconfig.tsbuildinfo` restored; `git diff --check` clean; diff reviewed.
- [x] Step 5: This document.
- [x] Step 6: Atomic commits (helper → UI → doc), each compiles on its own.

## Files

| File | Change |
|---|---|
| `frontend/src/lib/contentClient.ts` | New `fetchArticlesPage(params, options) → { items, meta }`, types `PaginationMeta`, `ArticlesPage`, `FetchArticlesPageParams`. `fetchArticles` keeps its signature/behaviour; both share private `buildArticlesUrl` + `requestArticlesJson`, so cold-start retry, abort and auth headers are identical. |
| `frontend/src/app/(app)/courses/page.tsx` | Pagination state from URL, server-side category filter, `Pagination` component, summary line, Suspense boundary. |
| `PROGRESS_COURSES_PAGINATION.md` | This file. |

## Decisions

- **API contract (read from code, not only docs):** `ArticleController@index` → `ArticleService::listPublished()`
  returns `$query->paginate($perPage)`, so the body has `current_page`, `last_page`, `per_page`, `total`, `from`,
  `to`, `data`; `page` is read by Laravel automatically. `docs/API.md` lists only part of these fields (docs are
  protected, not edited here). The helper tolerates missing fields / a bare array by describing it as one page.
- **Page size:** 15, sent explicitly as `per_page` (same as backend default).
- **URL is the source of truth:** `?page=N` (omitted for page 1) and `?category=<uuid>` (omitted for all), written
  with `router.replace(..., { scroll: false })`. `replace` keeps the catalog as one history entry, so opening a
  course and pressing Back returns to the same page; refresh keeps it too. Category was added to the URL as well,
  otherwise refreshing page 3 of a category would show page 3 of *all* courses.
- **Invalid values:** non-numeric / `0` / negative page → 1 (address bar normalised; `?page=1` is also removed
  so each page has one canonical URL). A page past `last_page`
  (stale link, courses removed) → page 1 (spec: "invalid page → 1"). A non-UUID category is ignored; a UUID that is
  not a known top-level category resets to "All Domains" once categories have loaded (same rule as before).
  Non-UUIDs are never sent to the API (a Postgres uuid comparison would error).
- **Category filter is server-side** via `category_id` (supported by `listPublished`), so totals and page counts
  are correct. Changing category resets to page 1.
- **Search stays client-side** and only filters the current page. Follow-up task: move search server-side
  (the API already accepts `search`, matched on the published title) and reset to page 1 on new terms. When
  there is more than one page and a search term is set, the summary says so explicitly.
- **"All Domains (N)" pill:** previously `articles.length` (max 15). Now the `total` from the last unfiltered
  load; hidden until known. Category pills never showed counts, so nothing to change there.
- **Races / loading:** each load aborts the one in flight (latest request wins; the AbortSignal also cancels
  pending cold-start retry waits). Only the current load clears `loading`. During a page change the current
  results stay visible but dimmed (`aria-busy`) with "Loading…" in the summary — no full-page error flash.
  A failed page change shows the existing compact error banner above the previous results with Retry.
  The cold-start "waking up" status from the previous branch is unchanged.
- **Categories** are fetched once on mount (not per page) and stay non-critical. A failure is tracked in its own
  `categoriesError` state and is never treated as "loaded": the active category filter and page are kept, the
  course list keeps working, and a non-blocking notice offers a separate "Retry domains" button. A category UUID
  is dropped (→ All Domains) only after a *successful* categories load shows it does not exist.
- **Honest state after failed loads:** the shown `articles`/`meta` are tagged with the `{ page, category }` of the
  request that produced them (`resultsKey`). If that differs from the URL after a failed load, a label says so
  ("Still showing page 1: page 2 could not be loaded." / "Still showing courses from All Domains: the selected
  domain could not be loaded."), next to the existing error banner with Retry. Pagination then highlights the page
  actually shown (choosing the failed page retries it), and is hidden entirely when the shown data belongs to
  another domain, because its page count does not apply. While a load is in flight, pagination follows the
  requested page so rapid Next clicks keep working.
- **Docstrings:** every function, component, type and helper added in `contentClient.ts` and `courses/page.tsx`
  has a JSDoc comment (pre-merge Docstring Coverage check).
- **Scroll & focus:** on page change the results section (`<section aria-label="Course results" tabIndex={-1}>`)
  is scrolled into view (`scrollMarginTop` for the header; instant when `prefers-reduced-motion`) and then
  receives focus with `focus({ preventScroll: true })`, so keyboard focus is not lost when the clicked
  Previous/Next becomes disabled on the first/last page.
- **Accessibility:** `<nav aria-label="Pagination">` with a list of native `<button>`s (keyboard + global
  `:focus-visible` ring), `aria-current="page"` on the current page, `aria-label` "Page N" / "Previous page" /
  "Next page", real `disabled` on Previous at page 1 and Next at the last page; ellipses are `aria-hidden`.
  Category pills gained `aria-pressed`. The "Showing X–Y of Z courses" summary is an always-mounted
  `aria-live="polite"` element that only ever contains the final range; the transient "Loading…" text and the
  search hint are rendered outside the live region.
- **Compact page list:** first, last, current ±1, ellipses for gaps; ≤ 7 pages listed in full; an ellipsis never
  hides a single page (e.g. `1 … 4 5 6 … 12`, `1 2 3 4 5 … 12`). Controls hidden when `last_page ≤ 1`.
- **Tokens:** UX-01 CSS variables only (`--color-primary`, `--color-white` on primary background,
  `--color-charcoal`, `--color-gray`, `--color-gray-light` for disabled, `--color-off-white`, `--color-border`,
  `--radius-full`, `--shadow-xs`, `--transition-fast`).
- **Suspense:** `useSearchParams()` is wrapped in `<Suspense>` (Next 14 requires it for prerendering the route).

## Validation

- `cd frontend && node node_modules/typescript/lib/tsc.js --noEmit -p .` → exit 0 (0 errors).
- `git diff --check` → clean.
- Page-window logic exercised with node for (current,last) = (1,1) (1,2) (1,7) (1,8) (3,12) (4,12) (5,12)
  (8,12) (9,12) (12,12).
- **Not run here:** `npm run build` / `npm run lint` (worktree uses the Windows `node_modules`; no ESLint config),
  `./scripts/test-guardrails.ps1` (PowerShell), browser tests. Run them on Windows before the PR.

## Manual test checklist

- [ ] 0 published courses → "No courses published yet", no pagination, no summary.
- [ ] 1 course → "Showing 1–1 of 1 course", no pagination.
- [ ] 16 courses → page 1 "Showing 1–15 of 16 courses", pages `1 2`; page 2 shows 1 course, Next disabled.
- [ ] 31 courses → 3 pages, page 3 "Showing 31–31 of 31 courses".
- [ ] Deep link `/courses?page=2` → loads page 2 directly; refresh stays on page 2.
- [ ] Open a course from page 2, press Back → still page 2.
- [ ] Invalid page: `?page=abc`, `?page=0`, `?page=-3`, `?page=999` → page 1 (URL cleaned).
- [ ] Category change from page 2 → page 1 of that category; counts/pages reflect the category; "All Domains"
      resets to page 1 of all.
- [ ] `?category=not-a-uuid` and unknown UUID → All Domains.
- [ ] Search on page 2 → filters only page 2, summary shows the "this page only" hint; Reset Filters works.
- [ ] Rapid clicks Next/Next/Prev → final page matches the URL; no flicker of the full error card.
- [ ] Cold start (sleeping backend) → "Waking up…" status, then page loads; navigating pages during retries
      aborts the old load.
- [ ] API down on page change → compact error banner above previous results, Retry reloads the URL page.
- [ ] Keyboard: Tab through pills and pagination, Enter/Space activates, focus ring visible, disabled buttons
      skipped; screen reader announces "Pagination" nav and current page.
- [ ] Press Next on the second-to-last page with the keyboard → focus moves to "Course results", not lost.
- [ ] Screen reader announces only the final "Showing X–Y of Z courses" after each page change.
- [ ] `?page=1` is removed from the address bar.
- [ ] Categories API down, deep link `?category=<uuid>&page=2` → filter and page kept, "Course domains could not be
      loaded" notice with Retry domains; course list still loads.
- [ ] Page 1 loaded, page 2 fails → "Still showing page 1: page 2 could not be loaded.", pagination marks 1,
      choosing 2 again retries.
- [ ] Category change fails → "Still showing courses from …" label, pagination hidden, Retry loads the new domain.
- [ ] Logged-in user: bookmark flags still shown on cards for each page.

## Handled elsewhere (not in this branch)

- `create/page.tsx` taxonomy load abort finding → belongs to the cold-start commits (PR #47), fixed on that branch.
- Stable secondary ordering in `ArticleService::listPublished` (ties on `published_at` can shift items between
  pages) → separate backend branch.

## Remaining risks

- `docs/API.md` does not list `page`, `last_page`, `from`, `to` for this endpoint — docs owner may want to add them.
- Build/lint/guardrails not executed in this environment.
- Bookmark flags on cards only cover the first 15 bookmarks: `/v1/bookmarks` is paginated and the catalog
  reads only its first page (pre-existing behaviour, not changed here).
- Search only covers the current page until the server-side search follow-up lands.
