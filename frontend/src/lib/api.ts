/**
 * api.ts -- KnowledgeHub API client
 *
 * Centralized HTTP client for Laravel REST API.
 * All endpoints defined in docs/API.md.
 */

import { getAccessToken } from '@/lib/authToken';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const bearerToken = getAccessToken();
  if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`;
  }

  const options: RequestInit = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, options);
  } catch {
    throw {
      message: 'Unable to reach the KnowledgeHub API. Check that the API service is running.',
    };
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw { status: response.status, ...error };
  }
  return response.json();
}

export const api = {
  get:    <T>(path: string)              => request<T>('GET', path),
  post:   <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put:    <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch:  <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string)              => request<T>('DELETE', path),
};
