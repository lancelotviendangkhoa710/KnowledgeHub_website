# Decision: CAPTCHA with Cloudflare Turnstile (AUTH-08)

**Status**: Proposed  
**Date**: 2026-11-21  
**Author**: TEAM_MEMBER_A (Identity/Auth)  
**Related**: `2026-11-21-email-verification-and-password-reset.md`, `2026-11-13-google-sign-in.md`, `docs/ui-redesign/TAI-LIEU-BAN-GIAO-GIAO-DIEN.md` section 7C

## Context

Registration, "forgot password" and "resend verification email" cause outgoing email and create accounts without any admin gate (see the email verification ADR). Without a bot check, a script can fill the database with accounts, flood third-party mailboxes with our email and exhaust the mail quota. Per-IP rate limits alone are weak here because the API sits behind proxies (Vercel rewrite, Render) and often sees one shared address (see the Google sign-in ADR, decision 5). A CAPTCHA is a third-party service called from the browser and from the server, so it needs team approval.

## Decision

1. **Cloudflare Turnstile.** Free, no image puzzles in most cases, themes with light and dark mode and Vietnamese.
2. **Required on** register, forgot password and resend verification email.
3. **Login only after repeated failures.** The server counts failed logins; once the threshold is passed it answers with the error code `captcha_required`, and the login form then shows the widget and sends the token on the next attempt. A normal first login never sees a CAPTCHA.
4. **The backend verifies every token** by calling Cloudflare `siteverify` with `TURNSTILE_SECRET_KEY` and the token (and the client IP when the API can see the real one). The frontend only renders the widget with `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and sends the token; it never decides anything. Tokens are single use and short lived (Cloudflare rule), so each submit needs a fresh one; the widget is reset after every failed submit.
5. **Test keys for development and automated tests.** Cloudflare publishes dummy keys: site key `1x00000000000000000000AA` and secret `1x0000000000000000000000000000000AA` (always pass). They are public, so they may appear in docs and `.env.example`. Tests may also fake the HTTP call.
6. **Production widget is limited to the Vercel hostname.** In the Cloudflare dashboard the widget lists only the Vercel host, not `localhost`, so a copied site key does not work from other sites. Development uses the dummy keys instead.
7. **If Cloudflare does not answer** (timeout, 5xx, network error) the request is **rejected** with a retryable error ("Could not verify CAPTCHA, try again"). It is never silently skipped. The HTTP call has a short timeout (a few seconds) so a Cloudflare outage does not hang Render workers. A missing secret in production fails the same way (closed).
8. **Errors:** missing token and failed token have separate messages; the screen shows "Chưa xác nhận CAPTCHA" (handoff document) without clearing the form.

## Consequences

### Positive
- Bots are stopped before an email is sent or an account is created.
- No cost, no new PHP package (plain HTTP call with Laravel's HTTP client), one small frontend component.
- Honest users are not asked on normal login.

### Negative / limits
- Third-party script loaded on four pages, a privacy trade-off to mention in the privacy text.
- People with blockers or restrictive networks may not see the widget and cannot register until it loads.
- If Cloudflare is down, registration, reset and resend are down too (decision 7 chooses safety over availability).

### Risks
- **File sessions on Render are lost on deploy**: failed-login counters kept in the cache or session reset with it, so the "after repeated failures" threshold restarts. Use the shared cache store for the counters if this matters; accepted for now.
- **Render free tier blocks SMTP 25/465/587**; mail goes over Brevo port 2525 (see email ADR). If mail is down the CAPTCHA still passes but nothing arrives.
- **A `gmail.com` sender is rewritten by Brevo**, so mail can land in Spam; this is an email delivery problem, not a CAPTCHA one, but testers will see "no mail" and may blame the CAPTCHA.
- A mistaken hostname list on the widget makes it fail on production while dummy keys still pass locally; check on the real site after the first deploy.
- A leaked `TURNSTILE_SECRET_KEY` would let someone verify forged tokens against our account; rotate it in Cloudflare and keep it in Render env only, never in the repository.

## Alternatives Considered

1. **Google reCAPTCHA.** Well known but heavier, shows image puzzles and adds Google tracking; rejected.
2. **hCaptcha.** Similar to Turnstile, but more visible challenges and a commercial plan for features we do not need; rejected.
3. **Rate limiting only.** No third party, but the shared proxy IP makes per-IP limits either useless or a way to lock everybody out; kept as a second layer, not the only one.

## Implementation Notes

Backend: a small verifier service and a validation rule used by the three endpoints and by login when `captcha_required`. Frontend: one widget component (theme follows light/dark, Vietnamese, 300×65). Configuration in `docs/DEPLOYMENT.md`, `docs/DEV_CHEATSHEET.md`, `backend/.env.example`.

## Validation

- With the dummy keys, requests without a token and with a failed token are rejected; valid requests pass.
- Cloudflare timeout or 5xx returns the retry error and sends no email.
- Login shows no widget until `captcha_required`, then requires it.
- On production, the widget loads on the Vercel host and fails on any other host.
- Tests fake the HTTP call; the real widget needs a manual check per environment.
