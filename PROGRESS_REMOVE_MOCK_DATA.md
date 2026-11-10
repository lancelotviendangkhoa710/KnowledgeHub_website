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
- [x] **Step 5: Quality & Build Verification**
  - Ran `npx tsc --noEmit` in `frontend/` (0 errors).
  - Ran `npm run build` in `frontend/` (successful static generation across 16 routes).
  - Verified 0 lint errors, 0 TypeScript errors, and successful production build.
- [x] **Step 6: Atomic Commit & Output Report**
  - Commit message format: `p2: eradicate mock data fallback and connect live API directly`.
- [x] **Step 7: Review follow-up**
  - Applied review findings #1–#9 (see Steps 2–4b).
  - `node node_modules/typescript/lib/tsc.js --noEmit -p .` in `frontend/`: 0 errors.
  - Not re-run after follow-up: `npm run build` and ESLint (run on Windows before opening the PR).
  - Commit: `p2: surface API errors instead of silent fallbacks and remove mock content`.
  - Output standard completion report matching AGENTS.md §15.
