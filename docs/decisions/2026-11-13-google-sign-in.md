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
3. **Only an email Google vouches for counts.** The profile must have `email_verified = true` **and** the address must be authoritative: a Gmail address, or an address whose domain equals the account's hosted domain (`hd`, Google Workspace). For any other address (a personal Google account registered with some other email) `email_verified` does not prove the person still owns the mailbox: if the mailbox was recycled the previous owner may keep the Google account, so signing in would reach the current owner's account, including an admin's. Such sign-ins are refused (`google_email_unconfirmed`) before any account is looked up or created. `GOOGLE_REQUIRE_AUTHORITATIVE_EMAIL=false` switches this off for a deployment that accepts the risk.
4. **Account rules** (the email is lowercased):

   | Situation | Result |
   |---|---|
   | No account with that email (soft-deleted accounts do not count) and the domain is allowed (see 5) | New account: status `active` (Google verified the email, decided by the Auth owner), role `user`, `email_verified_at` set |
   | No account and the domain is not allowed | Refused (`/login?error=google_domain_not_allowed`), nothing created |
   | Account exists and is `active` | Signed in as that account; its roles are unchanged |
   | Account exists but is `pending`, `inactive` or `banned` | Refused (`/login?error=google_unavailable`): Google must not lift a ban or skip the admin gate |

5. **Anti-spam controls for new accounts.** The intended use is production with open sign-up and no admin approval, so account creation is limited in three ways (existing `active` accounts are never affected):
   - **Allowed email domains:** `GOOGLE_ALLOWED_DOMAINS`, default `*.edu,*.edu.vn` (school addresses only; add `gmail.com` for development or a wider audience): a plain entry matches the domain exactly, `*.x` matches any domain ending in `.x`, an empty value removes the limit.
   - **Per-IP limit:** `GOOGLE_MAX_NEW_ACCOUNTS_PER_IP` new accounts per public IP per day (default 3, `0` = off). It counts creations only, never sign-ins, and is skipped for private/internal addresses, otherwise a proxy in front of the API would turn it into one global limit. **It only works if the API sees real client IPs**: list the real edge proxies in `TRUSTED_PROXIES` (comma separated, CIDR allowed; default none; it must be a real process environment variable, not only a line in `.env`, because a cached config does not read `.env`). The Next.js `/api` rewrite does **not** forward the client IP and a trusted proxy that does not overwrite `X-Forwarded-For` lets a client fake its IP, so do not list it; a production edge proxy (nginx, load balancer) that sets the header is required. Verified locally: through the rewrite Laravel only sees the proxy address, so the limit is inactive there.
   - **Overall brake:** `GOOGLE_MAX_NEW_ACCOUNTS_PER_HOUR` new Google accounts per hour in total (default 30, `0` = off). It needs no client IP, so it limits a sign-up wave today. Both limits answer `/login?error=google_too_many_signups`. The check, the account creation and the counting run under one short cache lock (`google-signup`), so two sign-ups arriving together cannot both pass at 29 of 30; if the lock stays busy for 3 seconds the person is sent back to retry (`google_failed`), and if the cache itself is broken the limits are skipped (fail open) rather than blocking sign-in.
   - **Admin review:** the admin user list can be sorted newest first and filtered by sign-up date (`sort`, `created_within_days`); an admin can ban an account, which ends its sessions and tokens at the next request.
6. **No schema change.** Accounts are matched by verified email only; nothing is stored about the Google identity. A Google-created account gets a random 64-character password that nobody knows, so password login for it is impossible.
7. **Configuration** (private env, never committed): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, optional `GOOGLE_ALLOWED_DOMAINS` (the web origin plus `/api/auth/google/callback`, registered in Google Cloud). Without a client id the redirect route sends the user back to `/login?error=google_not_configured`.

## Consequences

### Positive
- One-click sign-in; no new tables or columns; reuses the session policy and the existing `/api` proxy.
- Existing admin gating cannot be bypassed for registered, suspended or pending accounts.

### Negative / limits
- **Google-only users cannot use actions that ask for the current password** (change password, delete account, admin role changes). A "set a password" flow is a follow-up task.
- Linking by email rather than by Google's stable account id (`sub`). With the authoritative-email rule (decision 3) the remaining risk is small (Gmail and Workspace addresses are controlled by Google or the domain owner), but a Workspace domain that re-issues an address to another person can still hand over the old account. Upgrade path: add a `google_id` column (needs a migration, DATABASE.md and ERD updates, team approval) and match on it first. Marked in the code as the known shortcut.
- School addresses only work when the school uses Google Workspace (the `hd` claim). A personal Google account registered with a school email is refused. Not verified against a real Workspace account: if Google's user-info response does not carry `hd`, Workspace users are refused too; check the log line `email not vouched for by Google` (domain only), then read `hd` from the ID token or set `GOOGLE_REQUIRE_AUTHORITATIVE_EMAIL=false`.
- New accounts become `active` immediately, a different path from registration (`pending`). This is an explicit business decision, not a default.
- New runtime dependency: `laravel/socialite` v5 (6 packages added to `composer.lock`, no existing package changed).

### Risks
- Open sign-up is still abusable by someone with many accounts on an allowed domain. Layers: domain allowlist, per-IP limit (needs an edge proxy), the overall hourly brake, Google's own checks, and admin review plus ban. The callback has no per-IP throttle on purpose: behind the proxy all visitors share one IP, so it would let anyone lock everyone out of Google sign-in; a bad callback is rejected on the OAuth `state` before any call to Google. Rate-limit counters live in the app cache; with the file cache they reset if the cache is cleared.
- Callback failures (denied consent, expired state, Google outage) all land on `/login?error=google_failed`; they are not logged in detail.
- The Google Cloud OAuth client must list the exact redirect URI per environment.

## Alternatives Considered

1. **Add a `google_id` column now.** Stricter, but a schema change the Auth owner wanted to avoid; deferred as the upgrade path above.
2. **Frontend-side Google button (Google Identity Services, ID token posted to the API).** Needs a Google script in the page and token verification on the server; the redirect flow keeps secrets on the server and needs no frontend dependency.
3. **New Google accounts as `pending`.** Consistent with registration, but defeats one-click use; rejected by the Auth owner.

## Validation

- Feature tests with Google mocked (`tests/Feature/Auth/GoogleLoginTest.php`): new verified email, reuse of an active account, refusal of `pending`/`inactive`/`banned`, unverified email, Google failure, not configured, soft-deleted email, no usable password, domain allowlist (exact, wildcard, existing accounts exempt, empty list), authoritative-email rule (Gmail, matching hosted domain, no hosted domain refused even for an existing account, switch off), per-IP limit (counts creations only, internal addresses skipped, other addresses unaffected) and the overall hourly brake; admin list sorting and date window in `AdminUserTest`.
- Redirect step and failed callback checked through the Next.js `/api` proxy.
- Real Google sign-in needs Google Cloud credentials and must be verified manually per environment.
