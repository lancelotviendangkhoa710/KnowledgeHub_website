# Decision: Session policy for the SPA (AUTH-06)

**Status**: Proposed  
**Date**: 2026-11-03 (revised 2026-11-13)  
**Author**: TEAM_MEMBER_A (Identity/Auth)  
**Related**: AUTH-01 (login/logout), AUTH-02 (password change, account deletion), AUTH-03 (role change revokes tokens), `2026-11-13-shared-cloud-development-database.md`, `docs/API.md`

> Task ID history: first drafted as AUTH-04. AUTH-04 (RBAC account UI) and AUTH-05 (auth error handling) were then used by other PRs, so the session policy is AUTH-06.

## Context

AUTH-01 issues a Sanctum personal access token and the Next.js frontend keeps it in memory only (not in web storage, to limit XSS theft). Consequences:

- Pressing F5 or opening a second tab loses the session.
- `sanctum.expiration` was `null`: a token never expired on its own.
- There was no idle timeout.

Since the local-first Docker setup (ADR 2026-11-13), the browser already talks to **one origin**: Next.js (`localhost:3000`) forwards `/api/*` to nginx/Laravel (`rewrites()` in `frontend/next.config.mjs`, `NEXT_PUBLIC_API_URL=/api`). A cookie set by the API is therefore a first-party cookie, which is what Sanctum's stateful SPA mode needs. This is an authentication mechanism change, so it needs team approval (AGENTS.md §14).

## Decision

Approved by the task owner (TEAM_MEMBER_A); the team is asked to review.

1. **Cookie session for the web app (Sanctum stateful mode).** The session cookie is `HttpOnly` and `SameSite=Lax` (`Secure` when served over HTTPS). A request is "web" when its `Origin`/`Referer` host is in `SANCTUM_STATEFUL_DOMAINS` (default `localhost:3000,127.0.0.1:3000`; add the real web host in any deployed environment). JavaScript never sees a credential and a reload keeps the session.
2. **CSRF.** The SPA calls `GET /api/sanctum/csrf-cookie` (Sanctum's route, moved under `/api` with `SANCTUM_PREFIX=api/sanctum` so the existing `/api` proxy forwards it; no change to `next.config.mjs` or nginx) and sends `X-XSRF-TOKEN` on state-changing requests.
3. **Idle timeout:** `SESSION_LIFETIME` 30 minutes of inactivity (value to be confirmed; the Auth owner first suggested 5-10, a longer value suits learners reading long content).
4. **Absolute lifetime:** 12 hours from login (`login_at` stored in the session, checked by `EnforceSessionPolicy`). Personal access tokens, still used by non-browser clients, expire after 720 minutes (`sanctum.expiration`).
5. **Revocation without a sessions table.** Password change: Sanctum's `AuthenticateSession` ends sessions whose stored password hash no longer matches. Status leaving `active`: `EnforceSessionPolicy` drops the session on the next request. Account deletion: the user is soft-deleted, so the session no longer resolves to a user. Role change: roles are read from the database on every request, so access changes immediately. Logout invalidates the current session. Tokens are revoked exactly as in AUTH-02/03.
6. **Login response.** A web login returns `data.user` and no `data.token`; any other client keeps receiving a token, so Bearer clients and the existing tests are unaffected.
7. **Frontend.** Remove the in-memory token (`lib/authToken.ts`); `lib/api` sends `credentials: 'include'` and the CSRF header; pages that used `getAccessToken()` as a "signed in?" check read the user from `GET /api/me`; on `401` the SPA clears its user state and redirects to login.

## Session storage

`file` (today's default) is kept. No `sessions` table and no schema change. Because revocation (item 5) does not need to delete other sessions from a store, the file driver is enough for a single app instance whose `storage/` persists (the local Docker bind mount). If the API is ever run on several instances or on ephemeral disk (for example a hosted container), switch `SESSION_DRIVER` to `database` or `redis`; that is a configuration change plus, for `database`, a new migration that needs separate team approval.

## Consequences

### Positive
- No credential readable from JavaScript; F5 and multi-tab work.
- Bounded exposure for a stolen session (idle and absolute limits) and for a stolen token (720 minutes).
- No database change, no CORS change, no proxy change beyond what ADR 2026-11-13 already introduced.

### Negative
- CSRF handling is needed in the frontend client.
- `docs/API.md` auth sections change for browser clients (Bearer stays for other clients).
- Shorter idle timeout means more re-logins.

### Risks
- A web host missing from `SANCTUM_STATEFUL_DOMAINS` silently falls back to token login, so the SPA would not keep its session. Mitigation: document the variable in `docs/DEPLOYMENT.md` and `backend/.env.example` (protected file, own small PR).
- Sessions on the file driver are lost when `storage/` is wiped; users just log in again.
- Another team member's pages that call `getAccessToken()` must move to the shared user state; the AUTH-06 frontend PR migrates all current callers.

## Alternatives Considered

1. **Keep in-memory bearer token, add expiration only.** Smallest change, but F5 still logs the user out.
2. **Bearer token in localStorage.** Fixes F5 but exposes the token to any XSS; rejected.
3. **Cookie directly from an API on another site (`SameSite=None`, CORS credentials).** Third-party cookie, blocked or partitioned by modern browsers; unnecessary now that the proxy gives one origin.
4. **`sessions` database table now.** Enables "log out everywhere" on demand, but item 5 already covers the required revocation events; deferred until the API runs on more than one instance.
5. **Refresh-token rotation with a custom endpoint.** More moving parts than Sanctum's built-in mode; deferred.

## Implementation Notes

Task `AUTH-06-session-policy`, in separate PRs: this ADR, `docs/API.md`, backend (`bootstrap/app.php`, `config/sanctum.php`, `config/session.php`, `EnforceSessionPolicy`, login/logout, tests), frontend (`lib/api`, `lib/auth`, pages that read the token, tests). `backend/.env.example` and `docs/DEPLOYMENT.md` get their own small PR.

## Validation

- Login, reload the page, still authenticated.
- No credential in `localStorage`, `sessionStorage` or JS-readable cookies.
- Session rejected after the absolute limit and after the idle limit.
- Password change ends other sessions; non-active status ends the session; logout ends the current one.
- Bearer clients still authenticate and their tokens expire after 720 minutes.
- Authorization tests for guest, user, contributor and admin still pass.
