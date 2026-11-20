# Decision: Email verification and password reset (AUTH-08)

**Status**: Proposed  
**Date**: 2026-11-21  
**Author**: TEAM_MEMBER_A (Identity/Auth)  
**Related**: `2026-11-03-session-policy.md` (cookie session, `AuthenticateSession`), `2026-11-13-google-sign-in.md`, `2026-11-13-shared-cloud-development-database.md`, `2026-11-21-captcha-turnstile.md`, `docs/ui-redesign/TAI-LIEU-BAN-GIAO-GIAO-DIEN.md` section 7C

## Context

Today a user who registers with email and password gets an account in status `pending` and waits for an admin to activate it. There is no proof that the address belongs to the person, and there is no way to recover a forgotten password. Google sign-in (AUTH-07) already creates `active` accounts because Google vouches for the email. The Auth owner wants the same trust model for password accounts: the email itself is the gate, not a manual admin step. This needs outgoing email, a new table and a change to the registration business rule, so it needs team approval (AGENTS.md §14).

## Decision

1. **Email verification is mandatory for password accounts.** Registration creates the account as `pending` and sends a verification email. A `pending` account cannot sign in (unchanged); the login response tells the person to verify and offers to resend the email.
2. **Verifying moves the account from `pending` to `active` automatically** and sets `users.email_verified_at` (existing column, no schema change for it). The admin approval step is removed for ordinary sign-ups. Admins can still change any status in the user admin page (ban, deactivate, reactivate). A verification link never lifts `inactive` or `banned`.
3. **Links are valid for 60 minutes and work once.** This holds for both the verification and the password reset email. An expired or used link shows a screen that lets the person request a new one.
4. **Resending is rate limited.** One email per address per 60 seconds, plus a per-IP limit. The CAPTCHA rules are in `2026-11-21-captcha-turnstile.md`.
5. **Forgot password always answers the same** (HTTP 200, same text) whether or not the email is registered, so the endpoint cannot be used to find out which accounts exist. Timing is kept similar by sending the email after the response is prepared.
6. **Google-only accounts** (random unknown password, see AUTH-07) receive an email that explains they sign in with Google, instead of a reset link.
7. **A password reset revokes other sessions.** Changing the password updates the stored hash, so Sanctum's `AuthenticateSession` (session policy item 5) ends every other browser session; personal access tokens of the account are deleted in the same step. The success screen says other devices were signed out.
8. **Reset tokens are stored hashed.** Laravel's password broker with its default repository, table `password_reset_tokens` (`config/auth.php` already points at it, `expire` 60). The repository has no migration for it yet, so a **new migration** adds the table (email as primary key, hashed token, `timestampTz` created_at), following the conventions in AGENTS.md §5. Verification links are signed URLs (`URL::temporarySignedRoute`, 60 minutes) bound to the user id and the current email hash; single use is enforced because the status is no longer `pending` after the first success.
9. **The migration goes through the approved process.** The development database is shared (`2026-11-13-shared-cloud-development-database.md`), so nobody runs the migration ad hoc: it is reviewed in the PR and applied once by the agreed person with a backup, as in `docs/DEPLOYMENT.md`.
10. **Links point at the frontend.** The email contains `${FRONTEND_URL}/verify-email?...` and `${FRONTEND_URL}/reset-password?...`; the page calls the API. The frontend host is the only host in the link, so it works behind the Vercel `/api` proxy.
11. **Mail delivery.** Laravel `smtp` mailer configured by `MAIL_*`. Deployment: Brevo SMTP relay. Development: Mailpit (catches all mail, nothing leaves the machine). Templates are plain, with inline styles, as in the handoff document section 7C.

## Consequences

### Positive
- No admin work for ordinary sign-ups; the address is proven before the account works.
- Password recovery without support. No new library (Laravel mail and the password broker are built in).
- One consistent rule: `active` means a verified email (Google or link).

### Negative / limits
- A user who never receives the email cannot sign in until they resend it.
- Removing manual approval removes a human anti-spam step. Mitigation: CAPTCHA, resend limits and the existing admin ban.
- Existing `pending` accounts created before this change have no verification email. An admin must activate them, or they use "resend verification" from the login screen.

### Risks
- **File sessions on Render are lost on every deploy or restart** (session policy, "Session storage"): people are signed out and verification/reset state kept in sessions would be lost. This design keeps verification and reset state in the database and signed links, not in the session, so the links survive a deploy; sign-in sessions do not.
- **Render free tier blocks outgoing SMTP ports 25, 465 and 587** (since 2025-09-26). Brevo must use port **2525**. If 2525 is also blocked, the fallback is Brevo's HTTPS API (needs a mailer transport, a small follow-up) or a paid Render plan.
- **A `gmail.com` sender gets rewritten by Brevo** to a Brevo address, so mail often lands in Spam. Fix: send from an own domain verified in Brevo (SPF/DKIM). Until then, tell testers to check Spam.
- Mail provider outage means no verification or reset email; the screens must say "try again later" rather than pretend success.
- Tokens in links can leak through browser history or a forwarded email; the 60-minute single-use limit bounds this.
- `config:cache` on Render reads env at start: changing `MAIL_*` needs a restart.

## Alternatives Considered

1. **Activate immediately without verification.** Simplest, but anyone can register with someone else's address and spam can not be tied to a real mailbox; rejected.
2. **Keep manual admin approval as well as email verification.** Safest, but it keeps the bottleneck the change is meant to remove; admins keep the ability to ban instead.
3. **Reset link built by the backend (`/api/...` URL).** Needs a redirect to a frontend page anyway and ties the link to the API host; building the frontend URL directly is simpler and shows the new-password form without an extra hop. Chosen: frontend path, backend validates the token.
4. **Magic-link or OTP code login.** A different product decision; not needed to solve recovery.

## Implementation Notes

Separate PRs: this ADR and `docs/API.md`; backend (migration, mail classes, endpoints, tests); frontend (screens in section 7C, mockups already merged). `docs/DEPLOYMENT.md`, `docs/DEV_CHEATSHEET.md` and `backend/.env.example` carry the configuration (protected files, inform the team first).

## Validation

- Register, receive mail, verify: account `active`, `email_verified_at` set; second use of the link fails; link after 60 minutes fails.
- Forgot password: same response for known and unknown email; Google-only account receives the Google message.
- Reset revokes other sessions and tokens; the old password stops working.
- `banned` and `inactive` accounts are not reactivated by a link.
- Resend limit returns 429 and the screen shows the wait.
- Authorization tests for guest, user, contributor and admin still pass.
