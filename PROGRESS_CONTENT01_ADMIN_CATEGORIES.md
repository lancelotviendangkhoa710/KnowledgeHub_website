# PROGRESS — CONTENT-01 Admin Category Management UI

Branch: `p2/CONTENT-01-admin-category-management` (from `origin/dev`) · Owner: TEAM_MEMBER_B (p2, Content)

## Checklist

- [x] Step 1: Orient; exact contract (from code) recorded below.
- [x] Step 2: `frontend/src/lib/categoryAdminClient.ts` (typed tree/create/update/remove).
- [x] Step 3: `frontend/src/app/(app)/admin/categories/page.tsx` — guard, tree, create/edit/delete flows
      (+ `frontend/src/components/content/admin/CategoryForm.tsx`, `ConfirmDialog.tsx`).
- [x] Step 4: `tsc --noEmit` 0 errors; `tsconfig.tsbuildinfo` restored; `git diff --check` clean; diff self-reviewed.
- [x] Step 5: Manual test checklist below (not yet executed — needs a running stack).
- [x] Step 6: Atomic `p2:` commits.

## Contract (from implemented code — ranks above docs/API.md, AGENTS.md §3)

Sources: `backend/routes/api/content.php`, `CategoryController`, `CreateCategoryRequest`,
`UpdateCategoryRequest`, `CategoryService`, `Category` model, migration `2026_01_01_000003`.
(`CategoryRequest.php` exists but is not used by the controller.)

| Method | Path | Auth | Body | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/categories` | public | — | `{status, data: Category[]}` roots ordered by name, each with `articles_count` and **one level** of `children` (each with `articles_count`) | — |
| GET | `/api/v1/categories/{slug}` | public | — | `{status, data}` with `parent`, direct `children` (no counts), `articles_count` | 404 `{status:'error', message:'Category not found.'}` |
| POST | `/api/v1/categories` | sanctum + admin (FormRequest) | `name` required ≤255; `slug` nullable ≤255 **unique**; `parent_id` nullable uuid exists | 201 `{status, message, data}` | 401, 403, 422 `{message, errors}` |
| PUT | `/api/v1/categories/{id}` (route-model binding by UUID) | sanctum + admin (FormRequest) | `name` sometimes required ≤255; `slug` sometimes nullable ≤255 (no unique rule); `parent_id` sometimes nullable uuid exists | 200 `{status, message, data}` | 401, 403, 404, 422 validation, 422 `{status:'error', message:'A category cannot be its own parent.'}` |
| DELETE | `/api/v1/categories/{id}` | sanctum + admin (inline check in controller) | — | 200 `{status, message}` | 401, 403, 404, 422 `Cannot delete category with existing child categories.` / `Cannot delete category with associated articles.` |

Behaviour notes:
- Slug: create → generated with `Str::slug(name)` when empty; a client slug that already exists is a 422.
  Update → if `name` is sent and `slug` is empty, slug is **regenerated from the name**; a taken slug is
  silently suffixed (`-1`, `-2`, …). The UI therefore pre-fills and re-sends the current slug on edit.
- Who may write: **admin only** (all three writes). Contributors and users get 403.
- Cycle protection: backend only rejects `parent_id === self`. **Descendant cycles are NOT rejected server-side.**
- Delete: hard delete; refused (422) while the category has children or articles (FK children = RESTRICT).
- No soft delete on `categories`.

## UI behaviour

- Guard: Guest (no token) → `router.replace('/login?redirect=/admin/categories')` + "Sign in required" card.
  Token but no cached user → `GET /me`. Non-admin → "Admin access required" card. API 401 → session-expired card,
  API 403 → admin-required card. Backend stays the real gate.
- Tree: list endpoint gives two levels; the client expands every second-level node via `GET /categories/{slug}`
  (level by level, max 8 extra levels, visited-set guard). If any expansion fails, a notice is shown and
  **changing the parent is locked** in the edit form (renaming still allowed), because descendants are unknown.
- Create/Edit: inline form (Name, optional Slug, Parent select indented by depth). In edit, the category itself
  and all its descendants are disabled in the parent select. 422 field errors are shown under each field and
  the API message is shown verbatim in a `role="alert"` box.
- Delete: accessible modal (`role="dialog"`, `aria-modal`, focus on Cancel, Tab trapped, Escape cancels,
  focus returned to opener). Warns when children/articles exist; the 422 conflict message is shown verbatim.
- After every successful mutation the tree is refetched. Buttons are disabled while a request runs.
- Network down: load shows the error with a Retry button; writes say the result is unknown and suggest reload.
- Styling: existing classes (`account-page`, `auth-card`, `auth-field`, `auth-error`, `auth-message`, `button`)
  plus inline styles using UX-01 tokens (`--color-*`, `--radius-*`, `--shadow-*`, `--text-*`). One exception:
  the modal backdrop uses a literal `rgba(36, 33, 36, 0.45)` (charcoal at 45 %), because UX-01 has no overlay/scrim token.
- Hardening (follow-up commit):
  - Client validation: a non-empty slug must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`, and the name must contain at
    least one letter or digit (otherwise `Str::slug` gives an empty slug). Errors are shown as field errors and
    focus moves to the field.
  - Field errors and hints sit outside the `<label>` and are still linked with `aria-describedby`.
  - Dialog buttons use `aria-disabled` + a click guard while busy, so focus never leaves the dialog; a new error
    message gets focus (`tabIndex=-1`).
  - After a successful delete, focus moves to the status message (`tabIndex=-1`) because the row is removed.
  - Tree expansion runs at most 5 `GET /categories/{slug}` requests at a time.
  - Edit/Delete row buttons are disabled while the list is loading or a request is running.

## Tests run

- `cd frontend && node node_modules/typescript/lib/tsc.js --noEmit -p .` → exit 0, no errors.
- `git diff --check` → clean.
- NOT run here: `npm run build`, `npm run lint` (node_modules is a Windows install; native binaries unavailable
  in this environment), backend tests (no backend change), `scripts/test-guardrails.ps1` (PowerShell).

## Manual test checklist (to execute on a running stack)

- [ ] Guest opens `/admin/categories` → redirected to `/login?redirect=/admin/categories`; after login lands back.
- [ ] User (role `user`) → "Admin access required" card; no write requests sent.
- [ ] Contributor → "Admin access required" card. (If forced via API, POST/PUT/DELETE return 403.)
- [ ] Admin → tree shows roots, children and grandchildren (3+ levels) with slug and article counts.
- [ ] Create root category with name only → slug auto-generated; tree refreshes.
- [ ] Create with an existing slug → 422 "The slug has already been taken." under Slug field.
- [ ] Create with empty name (submit disabled) / 256-char name via API → 422 under Name.
- [ ] Create child under a 2nd-level category → appears as 3rd level after reload.
- [ ] Edit rename only → slug unchanged (current slug re-sent).
- [ ] Edit with slug cleared → slug regenerated from name.
- [ ] Edit parent: the category itself and all descendants are disabled in the select (cycle prevention).
- [ ] Simulate a failed `GET /categories/{slug}` (e.g. block in devtools) → incomplete notice; parent select locked in edit.
- [ ] Delete leaf with 0 articles → modal → confirm → removed.
- [ ] Delete category with children → 422 "Cannot delete category with existing child categories." shown verbatim in modal.
- [ ] Delete category with articles → 422 "Cannot delete category with associated articles." shown verbatim.
- [ ] Modal keyboard: Tab cycles inside, Escape cancels, focus returns to the Delete button.
- [ ] Stop the API → load shows error + Retry; Retry works after API restarts. Save while down → "result unknown" message.
- [ ] Token expired/revoked mid-session → 401 → "Sign in required / session expired" card.

## Backend follow-ups (Content backend task, not done here)

- [ ] `CategoryService::update`: reject a `parent_id` that is the category itself **or any descendant**
      (walk up from the new parent; run in a transaction) — currently only self-parent is rejected.
- [ ] Slug format rule on create and update (`regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/`) plus a `unique` rule on update,
      and reject names whose `Str::slug` is empty.
- [ ] A flat list endpoint (or recursive `children` in `GET /categories`) so the admin UI does not need one
      `GET /categories/{slug}` per nested category.
- [ ] Document `PUT` and `DELETE /api/v1/categories/{category}` in `docs/API.md` (protected — needs coordination).

## Findings / follow-ups (not done here — out of scope)

1. **Doc gap:** `PUT` and `DELETE /api/v1/categories/{category}` are implemented but not documented in
   `docs/API.md` (protected file, not edited).
2. **Backend cycle gap:** `CategoryService::update` / `UpdateCategoryRequest` only reject self-parent; moving a
   category under its own descendant is accepted and creates a cycle (then both disappear from the tree,
   since neither is a root). UI prevents it, but the backend should reject it too (Content backend task).
3. **Backend tree depth:** `getTree()` eager-loads only one level of children; the UI works around this with
   per-node `GET /categories/{slug}` calls (N requests for N non-root nodes). A recursive `children` load or
   flat list endpoint would be cheaper.
4. **Update slug uniqueness:** update has no `unique` rule; collisions are auto-suffixed instead of 422 — product decision pending (CONTENT-01 "Chờ duyệt").
5. **Auth checks duplicated:** admin checks are inline in FormRequests/controller rather than a Policy (AGENTS.md
   prefers Policy/Gate); `CategoryRequest.php` is unused.
6. **Navigation:** no link to `/admin/categories` yet (SiteHeader/admin menu are outside this task's allowed files).
