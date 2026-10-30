/**
 * authToken.ts -- in-memory bearer token store.
 *
 * The token is deliberately kept in a module variable instead of web storage.
 * `localStorage`/`sessionStorage` are readable by any script on the origin, so
 * a token kept there survives XSS and browser restarts. The trade-off is that
 * a full page reload drops the session; moving the token to an HttpOnly cookie
 * requires a backend + API-contract decision (docs/API.md documents the
 * `Authorization: Bearer` contract), so it is tracked as a follow-up.
 */

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
