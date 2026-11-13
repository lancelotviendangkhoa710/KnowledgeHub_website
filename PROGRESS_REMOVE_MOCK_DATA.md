# Progress: Eradicate Mock Data Fallback & Connect Live API Exclusively

- **Owner:** TEAM_MEMBER_B (Domain: Content / Courses / Studio)
- **Branch:** `p2/FE-remove-mock-data-dependency`
- **Goal:** Completely eliminate legacy mock content fallbacks (`mockArticles`, `mockCategories`, `mockTags`) and ensure all course data is fetched directly and truthfully from the live REST API with proper error state and retry handling.

---

## Checklist

- [x] **Step 1: Orient & Branch Creation**
  - Switched to `dev`, pulled latest `origin/dev`, created branch `p2/FE-remove-mock-data-dependency`.
  - Inspected `contentClient.ts`, `mockContent.ts`, and `courses/page.tsx`.
- [x] **Step 2: Cleanse `contentClient.ts` of Mock Fallbacks**
  - Removed all imports and usages of `mockArticles`, `mockCategories`, and `mockTags`.
  - Refactored `fetchArticles` to propagate errors and return live API results strictly.
  - `fetchArticle` returns `null` **only on HTTP 404**; network failures and other error statuses throw (so "not found" is never shown for an outage).
  - `fetchCategories` and `fetchTags` throw on network failure / non-OK status instead of silently returning `[]`.
  - Removed mock bypass (`NEXT_PUBLIC_USE_MOCK`) in `fetchMyArticles`.
  - Added a null-safe `extractList()` helper for `{ data: T[] }` / `T[]` responses (no `'data' in null` TypeError).
  - Added comprehensive JSDoc and strict TypeScript typing.
- [x] **Step 3: Enhance Error State in Courses Page**
  - Updated `frontend/src/app/(app)/courses/page.tsx` with `loadError` state.
  - Full error card (real API error message + Retry) when the load fails and no courses are shown; slim inline notice above the grid when stale courses are still on screen.
  - `fetchCategories()` failure is non-critical here (`.catch(() => [])`): the course list still renders, only the category pills are hidden.
  - Separate empty state "No courses published yet" vs "No courses matched your query".
  - Banner uses UX-01 tokens only (`--color-primary`, `--color-primary-pale`, `--color-primary-faint`, `--color-white`, `--color-charcoal`, `--color-gray`); `role="alert"`, decorative SVGs `aria-hidden`, Retry has `aria-busy`.
- [x] **Step 4: Remove `mockContent.ts`**
  - Deleted `frontend/src/lib/mockContent.ts` (`git rm`); zero references to mock data remain in `frontend/src`. Historical fixtures remain available in git history.
- [x] **Step 4b: Error states for the other callers**
  - `courses/[id]/page.tsx`: `loadError` state, try/catch/finally; API failure shows "Unable to Load Course" with Retry + Back to Courses; a real 404 still shows "Course Material Not Found".
  - `courses/create/page.tsx` (Studio): categories/tags load wrapped in `loadTaxonomy()` with try/catch; failure shows an inline notice with Retry (a category is required to publish). A category restored from a saved draft is no longer overwritten by the default first category.
  - `courses/manage/page.tsx` already handled `fetchMyArticles` errors (unchanged).
- [x] **Step 4c: Second review follow-up**
  - `contentClient.ts`: `apiFetch()` wrapper maps network `TypeError` ("Failed to fetch") to "Cannot reach the KnowledgeHub API."; `fetchArticle` throws on a 200 response without `data`.
  - Error banners (`courses/page.tsx`, `courses/[id]/page.tsx`, Studio taxonomy notice) show the API message and the "Please check your connection or try again." hint on separate lines.
  - `courses/page.tsx`: a selected category that is no longer in the loaded list resets to "All Domains"; search icon SVG is `aria-hidden`.
  - `courses/[id]/page.tsx`: a missing route param ends the loading state instead of spinning forever.
  - `courses/create/page.tsx` revision mode (`?parent_id=`): load failure shows "Could not load the course being revised: <message>" with Retry; a missing parent shows "Parent course not found" with "Start a New Course"; saving is blocked while the parent is not loaded, so a revision is never silently written from scratch.
- [x] **Step 4d: Third review follow-up**
  - "Start a New Course" is a button that clears revision state (parent ID, error, title, slug, content) and calls `router.replace('/courses/create')` (a same-route `<Link>` did not re-run the mount effect).
  - Save/Publish are disabled while the parent course is loading or failed to load; a late parent response only prefills an empty title/content, never overwriting author edits.
  - `apiFetch()`: network failure on a write (non-GET) reports "Could not reach the KnowledgeHub API. The result is unknown — refresh to check."
- [x] **Step 4e: Render cold-start resilience** (prod bug: first visit showed "Unable to Load Courses — Server Error" while the free-tier Render backend was waking up)
  - `apiFetch()`: GET/HEAD retried on network `TypeError` and HTTP 500/502/503/504 with backoff 2 s → 4 s → 8 s → 16 s → 30 s (5 retries, ≈60 s). Non-GET requests are never retried.
  - Optional `ApiReadOptions` (`signal`, `onRetry`) on `fetchArticles`, `fetchArticle`, `fetchCategories`, `fetchTags`, `fetchMyArticles`; an abort cancels the request and any pending backoff wait.
  - Exhausted 5xx → "The KnowledgeHub server is not responding (HTTP <status>). Please try again in a minute." (no more bare "Server Error").
  - `/courses`, `/courses/[id]` and the Studio show a calm `role="status"` / `aria-live="polite"` notice "Waking up the KnowledgeHub server… this can take up to a minute (free hosting)." while retrying; the error card appears only after retries are exhausted.
  - Loads are guarded against duplicate concurrent runs (in-flight ref; Retry reuses the same loader); `/courses` and `/courses/[id]` abort the in-flight load on unmount / route change, and only the current load clears the loading state in `finally`.
- [x] **Step 4f: Cold-start follow-up**
  - Retry window extended to ≈60 s (backoff adds a 30 s step); wake-up notice says "up to a minute".
  - `/courses/[id]`: related-courses request has its own `AbortController`, aborted when a new course load starts and on unmount; stale results are ignored.
  - Studio: taxonomy and parent loads use `AbortController`s aborted in the mount-effect cleanup (and on "Start a New Course"); guards reset in cleanup so StrictMode's effect re-run starts fresh loads.
  - Wake-up `role="status"` / `aria-live="polite"` region is always mounted (list, detail loading view, Studio); only its content toggles so screen readers announce it reliably.
- [ ] **Step 5: Quality & Build Verification**
  - [x] TypeScript: `node node_modules/typescript/lib/tsc.js --noEmit -p .` in `frontend/` → 0 errors (after every commit on this branch).
  - [ ] `npm run build` in `frontend/` — **to re-run on Windows** (not re-run after the review follow-ups).
  - [ ] ESLint (`npm run lint`) — **to re-run on Windows** (not re-run after the review follow-ups).
  - Note: `frontend/` has no test runner configured, so this change is covered by the manual test checklist below instead of automated tests.
- [x] **Step 6: Atomic Commits & Output Report**
  - `p2: eradicate mock data fallback and connect live API directly`
  - `p2: surface API errors instead of silent fallbacks and remove mock content`
  - `p2: handle revision load failure and polish API error messaging`
  - `p2: fix revision reset link and guard saves while parent loads`
  - `p2: retry API reads during Render cold start and show wake-up status`
  - `p2: abort stale related loads and extend cold-start retry window`
  - Output standard completion report matching AGENTS.md §15.

---

## Manual Test Checklist

Run against `npm run dev` with `NEXT_PUBLIC_API_URL` pointing at a local or prod backend.

- [ ] **API down** (stop backend or set an unreachable `NEXT_PUBLIC_API_URL`): `/courses` shows "Unable to Load Courses" + "Cannot reach the KnowledgeHub API." + Retry; Retry re-fetches once the API is back. `/courses/<slug>` shows "Unable to Load Course" + Retry (not "Not Found").
- [ ] **404**: `/courses/does-not-exist` shows "Course Material Not Found".
- [ ] **Empty DB** (no published courses): `/courses` shows "No courses published yet" (not "No courses matched your query").
- [ ] **Categories endpoint failing** (`/v1/categories` returns 500): `/courses` still lists courses; category pills are hidden and the filter is "All Domains".
- [ ] **Studio taxonomy failing** (`/v1/categories` or `/v1/tags` returns 500): `/courses/create` shows "Categories and tags could not be loaded." + Retry; Retry fills the category dropdown once the API recovers.
- [ ] **Revision parent missing**: `/courses/create?parent_id=<unknown-id>` shows "Parent course not found" + "Start a New Course"; Save/Publish are disabled; "Start a New Course" clears the form and drops `?parent_id`. With the API down, it shows "Could not load the course being revised: …" + Retry.
- [ ] **Backend asleep (Render cold start)**: after ≥15 min idle, open `/courses` in a fresh tab. Expect "Waking up the KnowledgeHub server…" (no error card) and courses appear on their own within ~1 min. DevTools Network shows retried `GET /api/v1/articles` at ~2/4/8/16/30 s gaps; no POST/DELETE is ever retried. Repeat on `/courses/<slug>`.
- [ ] **Backend down for good** (stop the service or point `NEXT_PUBLIC_API_URL` at a URL returning 503): after ~60 s the error card shows "The KnowledgeHub server is not responding (HTTP 503). Please try again in a minute." + Retry; clicking Retry repeatedly never starts a second parallel load.
- [ ] **Navigate away while waking**: leave `/courses` during the wake-up wait; no further retries appear in the Network tab and no React state warnings in the console.
- [ ] **Screen reader / keyboard**: error banners are announced (`role="alert"`); Retry is reachable by Tab and reports busy state while retrying.
