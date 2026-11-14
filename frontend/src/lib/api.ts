/**
 * api.ts -- KnowledgeHub API client
 *
 * Centralized HTTP client for Laravel REST API.
 * All endpoints defined in docs/API.md.
 */

import { getFallbackBearer } from '@/lib/authToken';

const rawBase = process.env.NEXT_PUBLIC_API_URL || '/api';
const BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

function readXsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Fetches Sanctum's CSRF cookie (same origin through the /api proxy). */
async function refreshCsrfCookie(): Promise<void> {
  try {
    await fetch(`${BASE_URL}/sanctum/csrf-cookie`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
  } catch {
    // Cross-origin API (no proxy): there is no cookie session to protect, the bearer fallback applies.
  }
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
    const fallbackBearer = getFallbackBearer();
    if (fallbackBearer) headers.set('Authorization', `Bearer ${fallbackBearer}`);
    if (isWrite && !fallbackBearer) {
      if (!readXsrfCookie()) await refreshCsrfCookie();
      const xsrf = readXsrfCookie();
      if (xsrf) headers.set('X-XSRF-TOKEN', xsrf);
    }
    return fetch(input, { ...init, headers, credentials: 'same-origin' });
  };

  const response = await send();
  if (response.status === 419 && isWrite) {
    await refreshCsrfCookie();
    return send();
  }
  return response;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const options: RequestInit = { method, headers };
  if (body) {
    options.body = isFormData ? body as FormData : JSON.stringify(body);
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
