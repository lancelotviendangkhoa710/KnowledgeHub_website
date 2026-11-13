# Decision: Google sign-in (AUTH-07)

**Status**: Approved by the Auth owner (TEAM_MEMBER_A); reviewed with the PR  
**Date**: 2026-11-13  
**Author**: TEAM_MEMBER_A (Identity/Auth)  
**Related**: `2026-11-03-session-policy.md` (cookie session), `docs/API.md` section 4

## Context

Users can only sign in with email and password, and a new account stays `pending` until an admin activates it. The Auth owner wants "Continue with Google". It adds one library (`laravel/socialite`, not in the AGENTS.md §2 list), which is why this ADR exists.

## Decision

1. **OAuth by redirect (Laravel Socialite, Google provider).** `GET /api/auth/google/redirect` sends the browser to Google; Google returns to `GET /api/auth/google/callback`. Both are browser navigations, so they are defined in `routes/web.php` (session middleware always runs) under the `/api` path so the existing Next.js `/api` proxy forwards them. Redirects back to the app are relative (`/login`, `/login?error=...`): behind the proxy the API does not know its public host. The login page forwards a signed-in visitor to the app.
2. **Result is the same cookie session as the password login** (`AuthService::startWebSession`): session cookie, 30-minute idle and 12-hour absolute limits, no token in JavaScript.
3. **Only a verified Google email counts.** The profile must have `email_verified = true`; otherwise nothing is created and nobody is signed in.
4. **Account rules** (the email is lowercased):

   | Situation | Result |
   |---|---|
   | No account with that email (soft-deleted accounts do not count) | New account: status `active` (Google verified the email, decided by the Auth owner), role `user`, `email_verified_at` set |
   | Account exists and is `active` | Signed in as that account; its roles are unchanged |
   | Account exists but is `pending`, `inactive` or `banned` | Refused (`/login?error=google_unavailable`): Google must not lift a ban or skip the admin gate |

5. **No schema change.** Accounts are matched by verified email only; nothing is stored about the Google identity. A Google-created account gets a random 64-character password that nobody knows, so password login for it is impossible.
6. **Configuration** (private env, never committed): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (the web origin plus `/api/auth/google/callback`, registered in Google Cloud). Without a client id the redirect route sends the user back to `/login?error=google_not_configured`.

## Consequences

### Positive
- One-click sign-in; no new tables or columns; reuses the session policy and the existing `/api` proxy.
- Existing admin gating cannot be bypassed for registered, suspended or pending accounts.

### Negative / limits
- **Google-only users cannot use actions that ask for the current password** (change password, delete account, admin role changes). A "set a password" flow is a follow-up task.
- Linking by email rather than by Google's stable account id (`sub`): if a Google address were ever re-assigned to another person, that person would reach the old account. Upgrade path: add a `google_id` column (needs a migration, DATABASE.md and ERD updates, team approval) and match on it first. Marked in the code as the known shortcut.
- New accounts become `active` immediately, a different path from registration (`pending`). This is an explicit business decision, not a default.
- New runtime dependency: `laravel/socialite` v5 (6 packages added to `composer.lock`, no existing package changed).

### Risks
- Callback failures (denied consent, expired state, Google outage) all land on `/login?error=google_failed`; they are not logged in detail.
- The Google Cloud OAuth client must list the exact redirect URI per environment.

## Alternatives Considered

1. **Add a `google_id` column now.** Stricter, but a schema change the Auth owner wanted to avoid; deferred as the upgrade path above.
2. **Frontend-side Google button (Google Identity Services, ID token posted to the API).** Needs a Google script in the page and token verification on the server; the redirect flow keeps secrets on the server and needs no frontend dependency.
3. **New Google accounts as `pending`.** Consistent with registration, but defeats one-click use; rejected by the Auth owner.

## Validation

- Feature tests with Google mocked (`tests/Feature/Auth/GoogleLoginTest.php`): new verified email, reuse of an active account, refusal of `pending`/`inactive`/`banned`, unverified email, Google failure, not configured, soft-deleted email, no usable password.
- Redirect step and failed callback checked through the Next.js `/api` proxy.
- Real Google sign-in needs Google Cloud credentials and must be verified manually per environment.
