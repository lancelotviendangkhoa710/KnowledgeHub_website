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
