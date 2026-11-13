/**
 * authToken.ts -- "signed in" marker for the cookie session (AUTH-06).
 *
 * The credential is the HttpOnly session cookie, which JavaScript cannot read. This module only
 * remembers the signed-in user's id so pages can ask "am I signed in?" synchronously (and detect
 * a change of user) before `/api/me` answers. The id is not a secret and grants nothing; the
 * server decides on every request. The names are kept so existing callers did not have to change.
 */

const KEY = 'kh_signed_in';
let memory: string | null = null;

/** Browser-only. Do not read it while rendering (the server cannot): use it in effects and handlers. */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory; // storage blocked: the marker lasts until reload
  }
}

// Fallback for a deployment where the API is not reached through the same-origin /api proxy: the
// backend then answers login with a bearer token instead of a cookie. Memory only (lost on reload).
let fallbackBearer: string | null = null;

export function getFallbackBearer(): string | null {
  return fallbackBearer;
}

export function setFallbackBearer(token: string | null): void {
  fallbackBearer = token;
}

export function setAccessToken(marker: string | null): void {
  memory = marker;
  if (typeof window === 'undefined') return;

  try {
    if (marker) window.localStorage.setItem(KEY, marker);
    else window.localStorage.removeItem(KEY);
  } catch {
    // ignore: the in-memory copy above still works
  }
}
