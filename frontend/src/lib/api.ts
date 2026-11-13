/**
 * api.ts -- KnowledgeHub API client
 *
 * Centralized HTTP client for Laravel REST API.
 * All endpoints defined in docs/API.md.
 */

const rawBase = process.env.NEXT_PUBLIC_API_URL || '/api';
const BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

function readXsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Fetches Sanctum's CSRF cookie (same origin through the /api proxy). */
async function refreshCsrfCookie(): Promise<void> {
  await fetch(`${BASE_URL}/sanctum/csrf-cookie`, { credentials: 'include', headers: { Accept: 'application/json' } });
}

/**
 * fetch() for the cookie session (AUTH-06): sends the session cookie, adds the CSRF header on
 * state-changing requests and retries once on 419 (stale CSRF cookie after logout or expiry).
 */
export async function sessionFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const isWrite = method !== 'GET' && method !== 'HEAD';

  const send = async (): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (isWrite) {
      if (!readXsrfCookie()) await refreshCsrfCookie();
      const xsrf = readXsrfCookie();
      if (xsrf) headers.set('X-XSRF-TOKEN', xsrf);
    }
    return fetch(input, { ...init, headers, credentials: 'include' });
  };

  const response = await send();
  if (response.status === 419 && isWrite) {
    await refreshCsrfCookie();
    return send();
  }
  return response;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const options: RequestInit = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  let response: Response;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  try {
    response = await sessionFetch(`${BASE_URL}${normalizedPath}`, options);
  } catch {
    throw {
      message: 'Unable to reach the KnowledgeHub API. Check that the API service is running.',
    };
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw { ...error, status: response.status };
  }
  return response.json();
}

export const api = {
  get:    <T>(path: string)              => request<T>('GET', path),
  post:   <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put:    <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch:  <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
};
