# Identity/Auth Repository Analysis and Implementation Plan

**Owner:** TEAM_MEMBER_A  
**Branch analyzed:** `p1/AUTH-01-auth-flow` at `a9f9782`  
**Integration target analyzed:** `dev` at `e94f446`  
**Analysis date:** 2026-10-23  
**Scope:** Planning only. No implementation or Git history operation is authorized by this document.

Related feature specifications: [AUTH-01](AUTH-01-registration-login-logout.md), [AUTH-02](AUTH-02-profile-account.md), [AUTH-03](AUTH-03-role-assignment.md). The existing API record is in [`docs/API.md`](../../API.md). This plan distinguishes verified code from recommended follow-up and unresolved product/security decisions.

## 1. Executive Summary

The local AUTH branch contains a working first-pass registration/login/logout implementation using Laravel Sanctum bearer tokens. It also contains the current Learning implementation because the AUTH branch merged `dev`; `dev` itself does not contain those auth changes. `dev` has no Identity/Auth routes, controllers, or tests. Learning routes use `auth:sanctum`, and Learning authorization reads roles directly from `user_roles` / `roles`.

AUTH-01 is present but not yet integration-ready as a complete Identity/Auth domain. Its branch tests cover registration, duplicate email, soft-delete reuse, pending login rejection, and login/logout token revocation. Important gaps include no login throttling, no profile/account endpoints (AUTH-02), no role-assignment endpoint/policy (AUTH-03), no email verification delivery, no frontend protection or authoritative role-aware UI, and incomplete test coverage for several security and failure cases.

The existing public registration behavior is internally consistent with the Identity context pack: create a `pending` account with the `user` role, do not issue a token, and allow login only for `active` users. Email verification delivery and activation are not implemented, so registration alone does not provide a path to an active account. Product must decide the activation lifecycle before claiming end-to-end self-service registration is complete.

## 2. Repository and Branch Evidence

### Git state

- Worktree branch at analysis time: `p3/lrn-review-2`, tracking `origin/p3/lrn-review-2`.
- Existing user edits were present in three Learning request files; they are outside this plan and must be preserved.
- Both `p1/AUTH-01-auth-flow` and `dev` local and remote-tracking refs exist.
- Local `p1/AUTH-01-auth-flow` is at `a9f9782`, a merge commit that includes `dev` at `e94f446`; `git rev-list --left-right --count dev...p1/AUTH-01-auth-flow` reported `0 9`.
- No branch switch, merge, rebase, cherry-pick, reset, or implementation code change was performed.

### Current architecture

- Backend: Laravel 11 REST API, PostgreSQL, Eloquent, Laravel Sanctum 4 on AUTH branch.
- Frontend: Next.js client application. The AUTH branch adds login/register pages and a browser-side auth helper.
- Route registration: `backend/routes/api.php` includes domain route files; auth routes are isolated in `backend/routes/api/auth.php`.
- Database: UUID users/roles, `user_roles` many-to-many, soft-deleted users, `users.status` CHECK (`active`, `inactive`, `banned`, `pending`), partial unique email index for rows not soft-deleted.
- Sanctum tokens: AUTH branch adds `personal_access_tokens` with UUID primary key and registers `PersonalAccessToken` in `AppServiceProvider`.
- No Identity-specific frontend route guard, profile page, role management UI, auth policy, or centralized role helper was found.

### Branch comparison and Learning dependencies

On `dev`, Learning has twelve API routes, all protected by `auth:sanctum`; roadmap ownership/Admin access is enforced by `RoadmapPolicy`. Learning feature tests include Sanctum test authentication and token regression coverage. The Learning controllers derive `user_id` from the authenticated principal rather than accepting it from request data.

AUTH branch changes overlap shared files needed by Learning: `User.php`, `AppServiceProvider.php`, `composer.json`, `tests/TestCase.php`, and route registry inclusion. The AUTH branch's `User` adds UUID, soft-delete, Sanctum token, and roles support. `AppServiceProvider` registers the UUID Sanctum token model and Learning policy mappings. These changes are already combined in the analyzed local AUTH branch; future integration must preserve both auth and Learning registrations rather than replacing the shared files wholesale.

## 3. Identity/Auth Status by Feature

| Feature | Evidence on AUTH branch | Status and remaining work |
|---|---|---|
| Registration | `RegisterRequest`, `AuthController`, `AuthService`, route, feature test, frontend page | Implemented baseline. Creates pending user plus `user` role transactionally; no token. Email is trim/lowercase normalized. Verification/activation lifecycle remains unresolved. |
| Login | `LoginRequest`, service, controller, route, test, frontend helper/page | Implemented baseline. Only `active` user with matching password gets a Sanctum token. Invalid credentials and non-active account use a generic validation error. Add throttling and broader state/security tests after policy approval. |
| Logout | Auth service/controller and `auth:sanctum` route | Implemented baseline. Deletes current token. Verify expired/revoked token and repeat logout contract; frontend clears local storage in `finally`. |
| Role model and default role | `Role`, `User::roles()`, `RoleSeeder`, role migration | Implemented baseline, three approved roles. Public registration assigns only `user`. Existing many-to-many schema allows multiple roles. |
| Backend authorization | Learning `RoadmapPolicy` checks admin by direct DB join; auth route only uses authentication middleware | Partial and domain-local. No `UserPolicy` or shared role authorization API. AUTH-03 must not assume single-role semantics before product decision. |
| Profile/account | Only feature specification exists | Not implemented. Fields, mutable attributes, account lifecycle, and API contract are open. |
| Admin role assignment | Only feature specification exists | Not implemented. Self-demotion, last-admin, multi-role, audit, target status, and concurrency policy are open. |
| Frontend authentication | Login/register and `AuthActions`; bearer token/user stored in `localStorage` | Partial. No route protection, session bootstrap/expiry handling, role-based nav/permissions, or profile/account screens. Frontend must remain presentation-only for access control. |
| Password reset / email verification delivery | No implementation found | Out of AUTH-01 unless separately approved. Verification is nevertheless needed to activate pending registrations if that remains the selected business lifecycle. |

## 4. Existing AUTH-01 Contract and Behavior

The AUTH branch documents these implemented routes in `docs/API.md`:

| Route | Authentication | Request and result | Observed error behavior |
|---|---|---|---|
| `POST /api/auth/register` | Guest | `name`, `email`, `password`, `password_confirmation`; 201 with `data.user` (`id`, `name`, `email`, `status`, `roles`). Creates `pending` + `user`; no token. | Form Request validation 422; duplicate active email rejected. |
| `POST /api/auth/login` | Guest | `email`, `password`; 200 with `data.user` and one-time plain token in `data.token`. | 422 generic `errors.email` message for missing user, wrong password, or non-active account after request validation. |
| `POST /api/auth/logout` | Bearer Sanctum token | Deletes current token; 200 with `data: null`. | Missing/invalid token is rejected by `auth:sanctum` (401). |

The API documentation has an inconsistency: the AUTH-01 prose documents these endpoints, while the API inventory table still says Identity/Auth has `0` implemented and “App source absent.” This must be corrected as part of integration documentation only after validating route/controller tests on the integrated branch.

Observed implementation details:

- `User` casts `password` as `hashed`; registration wraps user and role assignment in a database transaction.
- Email input is normalized with lowercase and trim in both auth request classes. Database uniqueness is case-sensitive at the index level, so canonicalization is important; test legacy mixed-case rows and concurrent registration.
- Login calls `Sanctum::usePersonalAccessTokenModel()` in the service in addition to provider registration. Avoid duplicate global registration; retain one application-wide configuration consistent with Learning.
- `config/sanctum.php` sets `expiration` to `null`, so tokens do not expire by age. This matches the current branch behavior but does not settle a security/product token lifetime policy.
- `RegisterRequest` does not appear to specify a role/status allowlist explicitly, but only validated fields reach the service and service constructs an allowlisted model payload. Keep this allowlist boundary.
- No login rate limiter is attached to the routes.
- The UI stores token and user snapshot in `localStorage`. The API helper sends the bearer token. Stored user data is a display cache only and cannot establish current authorization.

## 5. Target Design and Boundaries

1. Keep Laravel as the authority for identity, account state, authentication, and authorization. Frontend route hiding and role-aware navigation are usability features only.
2. Preserve exactly three database roles: `user`, `contributor`, `admin`. Guest remains unauthenticated. Do not add a permission table or role without an approved architecture/business decision.
3. Keep auth writes in `AuthService` and thin controllers/Form Requests, following backend conventions. Multi-record account/role writes must be transactional.
4. Preserve the Learning `auth:sanctum` bearer-token contract while the chosen auth mechanism is Sanctum. Identity endpoints issue/revoke the same token type used by Learning; do not introduce a parallel session mechanism in the integration work.
5. Centralize role checks only if the implementation can do so without changing cross-domain authorization semantics. `RoadmapPolicy` currently has an explicit Admin exception. Any policy/helper extraction that changes shared Learning behavior requires coordination with TEAM_MEMBER_C and regression coverage.
6. Do not add new database tables or alter existing schema based on this plan alone. Existing users, roles, user_roles, and personal_access_tokens schemas cover the evidenced needs. Any missing schema requirement must be surfaced and approved before migration work.
7. Keep AUTH-02 and AUTH-03 contracts unapproved until the open business decisions below are resolved. Do not invent endpoints, editable profile fields, or privilege-transition rules.

### Actor matrix (current business rules)

| Capability | Guest | User | Contributor | Admin |
|---|:---:|:---:|:---:|:---:|
| Register / login | Yes | No | No | No |
| Logout own authenticated credential | No | Yes | Yes | Yes |
| View published content | Yes | Yes | Yes | Yes |
| Learning routes | No | Yes | Yes | Yes (with policy-specific ownership exception) |
| Read/update own profile | No | Pending AUTH-02 contract | Pending AUTH-02 contract | Own profile; cross-user admin access requires explicit AUTH-02 contract |
| Assign/revoke roles | No | No | No | Pending AUTH-03 policy approval |
| Create/edit own courses | No | No | Yes | Yes |
| Manage all users/roles | No | No | No | Yes, after AUTH-02/03 implementation |

## 6. Workflow Specifications

### Registration

```mermaid
sequenceDiagram
    actor Guest
    participant FE as Next.js client
    participant API as Laravel auth route
    participant Req as RegisterRequest
    participant Svc as AuthService
    participant DB as PostgreSQL
    Guest->>FE: Submit name, email, password, confirmation
    FE->>API: POST /api/auth/register
    API->>Req: Validate and normalize email
    alt Invalid or duplicate active email
        Req-->>FE: 422 validation response; no write
    else Valid
        Req->>Svc: validated fields only
        Svc->>DB: Transaction: create pending user (hashed password)
        Svc->>DB: Attach existing role user
        alt Role or database write fails
            Svc-->>DB: Roll back user and role changes
            Svc-->>FE: Error; no partial account
        else Commit
            Svc-->>FE: 201 user projection, pending status, no token
        end
    end
```

Current implementation stops at `pending`. A product-approved verification/activation path is a prerequisite to promising that a public registrant can eventually log in. Do not add email delivery or self-activation as an assumed fix.

### Login and protected Learning request

```mermaid
sequenceDiagram
    actor User
    participant FE as Next.js client
    participant API as Laravel API
    participant Auth as Sanctum + AuthService
    participant DB as PostgreSQL
    User->>FE: Submit email and password
    FE->>API: POST /api/auth/login
    API->>Auth: Validate, normalize, find non-deleted user
    Auth->>DB: Check active status and password hash
    alt Invalid credentials or status not active
        Auth-->>FE: Generic 422; no token
    else Valid active account
        Auth->>DB: Create Sanctum personal access token
        Auth-->>FE: 200 user projection + plain token once
        FE->>FE: Store token according to approved browser credential policy
    end
    User->>FE: Request Learning resource
    FE->>API: Learning request + Authorization: Bearer token
    API->>Auth: auth:sanctum resolves token and user
    Auth->>DB: Verify current token exists and resolve user
    API->>DB: Learning policy checks ownership/Admin role
    alt Missing, invalid, or revoked token
        API-->>FE: 401
    else Authenticated but not authorized
        API-->>FE: 403/404 per the Learning endpoint contract
    else Authorized
        API-->>FE: Existing Learning response contract
    end
```

### Logout

The authenticated client sends `POST /api/auth/logout` with its current bearer token. `auth:sanctum` resolves the user/current token; the service deletes only that token; a later request with the same token must receive 401. The frontend clears local token and user cache even if the network request fails, then returns to a guest view. A failed network call means server-side revocation is not proven; the UI must not report server logout success until it receives success.

### Role assignment (after approval)

Admin request → authenticated route → Form Request and Policy/Gate verify actor Admin → service loads non-deleted target and one of the existing roles → lock relevant role/user state if needed by approved invariant → transaction attaches/detaches assignment → return a minimal role projection. Reject before mutation for other actors, invalid roles, or invalid targets. Last-admin and concurrency behavior cannot be finalized until product policy is decided. No role assignment API currently exists.

## 7. Implementation Plan

Tasks are ordered by actual dependency. AUTH-01 is an audit/hardening task because its basic endpoints already exist on the AUTH branch. AUTH-02 and AUTH-03 are gated on written product decisions.

### Phase 0 — Baseline and contract reconciliation

**Task AUTH-PLAN-01 — Reconcile branch and API evidence**  
**Goal/context:** Verify the exact source branch commit against current `dev` before implementation; correct the stale API inventory when integrating. The analyzed local branch already includes `dev`, but remote refs can advance.  
**Files:** Read-only initially: `backend/routes/api.php`, `backend/routes/api/auth.php`, auth source/tests, Learning source/tests, `docs/API.md`, `docs/DATABASE.md`, `docs/ERD.md`; expected doc edit `docs/API.md` only in the integration PR.  
**Steps:** fetch/compare refs under normal team Git workflow; inspect merge base and shared-file diffs; run auth and Learning tests on candidate integration branch; update Identity inventory counts/status and token-issuance note to reflect tested code. Keep all Learning routes/policies/providers/tests.  
**Input/output contract:** no API signature changes; docs must describe existing 3 routes exactly.  
**Dependency:** none.  
**Tests/acceptance:** auth feature tests and all Learning feature tests pass; API inventory does not claim source absent or zero after validation; no unrelated docs sections rewritten.  
**Edges/integration risk:** shared `User.php`, `AppServiceProvider.php`, composer files, route registry, and `TestCase.php`; resolving by taking one branch's file wholesale can break Learning auth or policy registration.

### Phase 1 — AUTH-01 hardening and end-to-end behavior

**Task AUTH-01A — Complete AUTH-01 security and failure coverage**  
**Goal/context:** Establish confidence in the existing registration/login/logout behavior and expose policy gaps before adding account management.  
**Files:** `backend/app/Http/Requests/Auth/*`, `backend/app/Services/Auth/AuthService.php`, `backend/app/Http/Controllers/Auth/AuthController.php`, `backend/routes/api/auth.php`, `backend/tests/Feature/Auth/AuthTest.php`; coordinate before shared middleware/provider edits.  
**Steps:** preserve request allowlists; assess registration race on unique email and map the database collision to the approved validation response; add a route-level login throttle only after the limit/key/response policy is approved; verify current token revocation and generic auth failures; remove redundant per-request Sanctum model configuration if provider registration is the single chosen configuration. Do not change response shapes absent API approval.  
**Input/output:** current AUTH-01 contracts in section 4 remain baseline. Login request takes email/password; responses never contain password/hash/token outside the one successful login token field.  
**Dependency:** AUTH-PLAN-01. Rate limiting settings are approval-gated.  
**Edge cases/tests:** invalid format, missing fields, wrong password, unknown/deleted/pending/inactive/banned users, duplicate and concurrent registration, missing `user` role, DB failure rollback, repeated logout, token A logout does not revoke token B, revoked token rejected by Learning endpoint, secret absent from logs/responses.  
**Acceptance:** transaction leaves no orphan user/role; exactly one default `user` assignment; no non-active login token; only current token revoked; generic credential failure preserved; approved rate limit is enforced and tested or explicitly deferred by decision.  
**Risk:** auth status errors and throttling are externally visible behavior; preserve API compatibility.

**Task AUTH-01B — Resolve pending-account activation lifecycle**  
**Goal/context:** Current registration creates `pending`; no verification delivery or activation implementation exists. The user cannot self-activate based on repository behavior.  
**Files:** decision and API contract first; likely auth service/request/controller/tests and mail/config only if approved. Any schema change requires review of all migrations and schema docs; no existing migration edits.  
**Steps:** product chooses whether verification is required, who/what activates an account, delivery channel, token lifetime/replay rules, and whether this is in AUTH-01 or a follow-up task; record approved contract/decision; then implement the minimum authorized flow and test replay/expiry/transaction behavior.  
**Dependency:** product decision; do not proceed to implementation without it.  
**Acceptance:** every registered account has a documented transition to `active` or the product explicitly defines an external/admin activation process; login behavior matches state policy; no unapproved email service/package or schema is added.  
**Risk:** this is a release blocker for self-service onboarding, not a reason to silently change pending to active.

### Phase 2 — AUTH-02 profile and account

**Task AUTH-02A — Approve profile and account contract**  
**Goal/context:** feature spec defines ownership and mass-assignment safeguards but no field list/API or lifecycle behavior.  
**Files:** decision/product contract first; expected later files in owned paths: Auth controller/request/service, `UserPolicy.php`, route file (coordination required), tests, `docs/API.md`.  
**Decisions required:** profile fields; read/update operations; email change and re-verification; password change/confirmation; account disable/delete semantics; sessions/tokens on state change; admin cross-user fields and actions; retention/audit/notifications; response and error shape.  
**Dependency:** product decision.  
**Acceptance:** exact per-field allowlist and actor matrix are approved; no new profile table/column unless separately justified and approved.

**Task AUTH-02B — Implement approved self-profile operations**  
**Goal/context:** allow a signed-in actor to access only the approved projection of their own account.  
**Files:** `backend/app/Http/Controllers/Auth/**`, `backend/app/Http/Requests/Auth/**`, `backend/app/Services/Auth/**`, `backend/app/Policies/UserPolicy.php`, coordinated addition to `backend/routes/api/auth.php`, `backend/tests/Feature/Auth/**`, API docs.  
**Steps:** derive current actor from Sanctum; use explicit response resource/projection; validate field allowlist; authorize ownership with policy; transaction for multi-field sensitive changes; never accept role/status/id/timestamps from a self-service payload; revoke tokens on account-state/password changes only as the approved policy specifies.  
**Dependency:** AUTH-02A and AUTH-01A; route registration coordination.  
**Tests/acceptance:** guest denied; each role reads/updates own allowed fields; user cannot access another profile; crafted `user_id`, `role`, `status`, password hash, timestamps ignored/rejected; email conflicts and soft-deleted target follow approved contract; DB failure makes no partial update; secret-safe response.  
**Risk:** account deletion/state changes can interact with RESTRICT foreign keys for conversations, memories, subscriptions, and learning roadmaps. Do not hard-delete or add broad cascade behavior.

### Phase 3 — AUTH-03 role assignment and backend authorization

**Task AUTH-03A — Approve privilege transition policy**  
**Goal/context:** schema allows multiple roles; feature spec leaves admin self-demotion, last-admin, multiple assignments, target states, audit, notifications, and concurrency unresolved.  
**Files:** decision/contract first. No implementation until resolved.  
**Dependency:** product/security approval.  
**Acceptance:** define allowed grant/revoke transitions among the three roles, whether one or many roles per user, last-admin invariant, self-change, inactive/banned/soft-deleted target handling, audit requirements, and concurrent admin action behavior.

**Task AUTH-03B — Implement approved Admin role management**  
**Goal/context:** Admin-only role assignment is required; no endpoint or UI currently exists.  
**Files:** Auth controller/request/service, `UserPolicy.php` or approved policy boundary, coordinated `backend/routes/api/auth.php`, feature/unit tests, `docs/API.md`; no migration expected because current `user_roles` supports assignments.  
**Steps:** authorize actor before mutation; constrain role name to existing three records; lock user/role rows as needed for the approved last-admin rule; transactionally attach/detach idempotently; return target ID and current role names only; implement audit only if its storage/retention contract is approved.  
**Dependency:** AUTH-03A and AUTH-02A as applicable.  
**Tests/acceptance:** guest/user/contributor denied with no DB change; Admin allowed only by approved matrix; nonexistent role/user, soft-deleted target, duplicate grant, absent revoke, self-demotion, last-admin and simultaneous updates follow decisions; DB failure rolls back.  
**Risk:** privilege escalation and lockout are high severity. No frontend check substitutes for backend policy.

**Task AUTH-03C — Align Learning Admin role check if needed**  
**Goal/context:** `RoadmapPolicy::isAdmin()` currently queries role tables directly. This is valid observed code but duplicates role lookup.  
**Files:** Learning `RoadmapPolicy.php` is owned by TEAM_MEMBER_C; any extraction/change needs explicit coordination and authorization.  
**Steps:** only if approved role model/API changes or concrete duplicate behavior is demonstrated, jointly decide shared helper/policy boundary and update Learning tests. Otherwise leave it unchanged.  
**Acceptance:** all current Learning ownership/Admin outcomes remain identical; no auth integration-only rewrite.  
**Dependency:** AUTH-03A and TEAM_MEMBER_C coordination.  
**Risk:** changing Admin resolution or role cardinality can alter access to all Learning roadmaps.

### Phase 4 — Frontend integration

**Task AUTH-FE-01 — Make frontend auth state reflect server outcomes**  
**Goal/context:** login/register UI exists, but client trusts a local user snapshot and app layouts do not protect routes.  
**Files:** `frontend/src/lib/auth.ts`, `frontend/src/lib/api.ts`, auth/app layouts, auth pages, `AuthActions.tsx`, and route-specific UI only as approved.  
**Steps:** add a shared client auth-state bootstrap and explicit loading/guest/authenticated states; treat local user JSON as display cache; handle 401 by clearing stale credential and returning to guest state; protect UX navigation for authenticated-only screens while preserving backend enforcement; show registration's pending outcome and do not imply the user is signed in; only display role-specific actions based on server-provided role snapshot and still expect backend denial. Adopt cookie/HttpOnly storage only if approved architecture work authorizes the change; do not make a frontend-only switch.  
**Dependency:** AUTH-01 contract, approved browser credential policy, AUTH-02/03 contract for profile/admin screens.  
**Tests/acceptance:** guest/authenticated navigation, reload bootstrap, stale/revoked token, failed logout, pending registration, role changes while client cache stale; backend remains authoritative.  
**Risk:** localStorage bearer token is accessible to injected scripts; XSS mitigation/credential storage choice is an explicit security decision, not resolved by the present implementation.

### Phase 5 — Integration verification and release

**Task AUTH-INT-01 — Integrate AUTH with current `dev` and Learning**  
**Goal/context:** merge AUTH branch through normal PR workflow while protecting Learning contracts and schema.  
**Files:** shared files listed in section 8 plus approved auth-owned files; docs updated in same PR.  
**Steps:** update branch from latest `dev` using team workflow; inspect every shared-file conflict; retain Learning routes and policy mappings, Sanctum UUID token registration, User capabilities required by both domains, and existing tests; run migrations and full backend suites in clean PostgreSQL environment; run frontend type/build checks and E2E smoke test; merge only via reviewed PR to `dev`.  
**Dependency:** phases 0–4 for whichever features are approved in release scope.  
**Acceptance:** full backend test suite, auth tests, all Learning feature tests, frontend build and auth-to-Learning bearer-token smoke test pass; migration is additive/compatible and rollback plan is documented; docs/API inventory matches actual tracked code.  
**Risk:** shared provider/model/route/test bootstrap changes and token table migration are the principal conflict zones.

## 8. Integration and Rollback Plan

**Source:** `p1/AUTH-01-auth-flow`; **target:** `dev`. The inspected local AUTH branch already contains the `dev` commit at the current analyzed base and a merge commit for that integration. This does not guarantee the remote `dev` has not advanced, and no merge has been executed as part of this planning task.

Before PR update, compare latest refs and inspect these hotspots individually:

- `backend/app/Models/User.php`: UUID, `HasApiTokens`, `SoftDeletes`, password cast, roles relation.
- `backend/app/Providers/AppServiceProvider.php`: UUID Sanctum token model registration and explicit Learning policy mapping.
- `backend/composer.json` / `composer.lock`: Sanctum dependency required by Learning and auth.
- `backend/routes/api.php`: preserve content, learning, and auth route includes.
- `backend/tests/TestCase.php`: Laravel app bootstrap used by both auth and Learning tests.
- `database/migrations/2026_10_21_000001_create_personal_access_tokens_table.php`: needed by bearer tokens; verify clean migration and rollback on a disposable database.
- `docs/API.md`: reconcile implemented Identity count with actual endpoints and keep Learning contracts intact.

Pre-merge gates: clean branch diff audit; `php artisan route:list --path=api`; migrate from empty PostgreSQL; run `php artisan test tests/Feature/Auth`; run all `tests/Feature/Learning`; run full backend suite; frontend lint/typecheck/build; inspect migration status and `git diff --check`.

Post-merge regression: register pending account; verify no token; login active test account; call a Learning endpoint with bearer token; verify owner success, foreign owner denial, Admin path per existing policy; logout current token; verify same token now receives 401; verify all content and Learning tests remain green.

Rollback criteria: any Learning test/access outcome changes unexpectedly, route registration failure, auth contract mismatch, migration failure on existing schema, token model mismatch, or frontend build failure. Prefer a corrective follow-up/revert of the isolated AUTH integration commit through normal PR review. Do not roll back by deleting migrated user/token data or editing already-applied migrations. If migration rollback is required, use the reviewed down migration only in an environment where rollback is approved and data impact is understood.

## 9. Test Strategy and Acceptance Checklist

### Backend unit/feature coverage

- Request validation and email canonicalization; malformed and oversized values.
- Registration transaction, default role only, password hash, duplicate/concurrent registration, soft-delete reuse, missing role seed, forced DB failure.
- Login success, wrong/missing credential, soft-deleted/pending/inactive/banned account, no token on denial, generic credential response, token stored hashed, expiration policy, rate limiting after approval.
- Logout missing/invalid/revoked token; only current token deleted; repeat logout; other token remains; old token rejected by a protected Learning route.
- Authorization matrix for Guest/User/Contributor/Admin; profile ownership/mass assignment; role grant/revoke and concurrent last-admin cases after their policies are approved.
- No password, plain token, or sensitive fields in registration/logout response or logs. Plain token is returned only once at successful login under current contract.

### Frontend and end-to-end

- Registration success shows pending/verification outcome and does not set authenticated state.
- Login stores the returned credential under current approved storage behavior and allows an authenticated API request.
- Reload, expired/revoked token, stale local user snapshot, 401, and network-failed logout states are coherent.
- Guest cannot use protected UI flows as an authenticated user; API still rejects guest regardless of UI.
- User/Contributor/Admin navigation reflects role snapshot; direct API requests are separately tested against Laravel policies.

### Learning regression checklist

- All twelve Learning routes still register and are protected by `auth:sanctum`.
- Existing Roadmap owner CRUD and Admin cross-owner behavior is unchanged.
- Foreign User/Contributor cannot read or mutate another user's roadmap/progress; Guest receives 401.
- Real token flow works against a Learning endpoint; logout invalidates it.
- Prerequisite graph checks, progress authority/mirroring, cascades, and content references remain unchanged.
- Run `docker compose exec app php artisan test tests/Feature/Learning/` and full `docker compose exec app php artisan test` in the project test environment. Do not report pass without executing.

## 10. Open Questions and Risks

| ID | Decision required | Why it blocks a complete plan/implementation |
|---|---|---|
| OQ-AUTH-01 | How does a pending registration become active? Email verification, Admin activation, or another approved route? Is delivery in scope? | Current code creates pending accounts that cannot log in; no delivery or activation path exists. |
| OQ-AUTH-02 | Sanctum personal token lifetime, expiration/revocation policy, per-device token naming/listing, and whether persistent browser localStorage remains approved | Current config has unlimited token age; localStorage has XSS exposure; no refresh mechanism exists. |
| OQ-AUTH-03 | Login throttling threshold, lockout duration, keying, response and monitoring | No limiter exists; policy affects externally observable behavior and abuse controls. |
| OQ-AUTH-04 | Registration duplicate email response disclosure policy | Current 422 validation reveals that active email is registered; generic-login requirement does not explicitly settle registration enumeration. |
| OQ-AUTH-05 | AUTH-02 field allowlist and email/password/account lifecycle behavior | Spec explicitly leaves mutable fields, verification, deletion, and dependent data/session handling open. |
| OQ-AUTH-06 | Role cardinality and grant/revoke rules, including self-change, last Admin, inactive/banned targets, audit, and concurrency | Existing schema permits multiple roles and no role API exists; cannot safely guess privilege rules. |
| OQ-AUTH-07 | Does admin management include reading/updating another user's profile or only role/account operations? | RBAC says Admin manages users, but no endpoint projection/action contract is defined. |
| OQ-AUTH-08 | Do AUTH-02/03 require new UI in this release, or are they backend-only deliverables? | Frontend screens and routes are absent and may expand scope materially. |

Primary integration risks: shared `User` and provider changes; any shift to role semantics affecting Learning; stale `docs/API.md` inventory; pending activation dead end; non-expiring bearer tokens; lack of route throttling; browser token exposure; role-aware UI being mistaken for authorization. No schema redesign, new role, auth package, email provider, or global middleware change is implied by this plan.

## 11. Handoff and Definition of Done

Implementation should begin only after the product decisions attached to the chosen scope are recorded in the API contract or approved decision/task. A coding agent should follow phases in order, stop at unresolved decisions rather than infer behavior, preserve cross-domain ownership rules, and report exact commands/results.

This planning deliverable is complete when the team has accepted the scope and resolved which of AUTH-01 hardening, activation, AUTH-02, AUTH-03, and frontend work belong in the implementation release. Implementation completion requires the phase-specific acceptance criteria, the Learning regression checklist, an accurate API inventory, and an audited PR diff. This document itself makes no implementation or integration claim.
