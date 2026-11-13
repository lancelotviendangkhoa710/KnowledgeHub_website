import { api } from '@/lib/api';
import { getAccessToken, setAccessToken, setFallbackBearer } from '@/lib/authToken';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'active' | 'inactive' | 'banned';
  roles: string[];
};

type AuthResponse = {
  data: {
    user: AuthUser;
    token?: string;
  };
  message: string;
  status: 'success' | 'error';
};

let currentUser: AuthUser | null = null;
const listeners = new Set<() => void>();

export function setCurrentUser(user: AuthUser | null): void {
  currentUser = user;
  setAccessToken(user?.id ?? null); // keep the signed-in marker in step with the user
  if (!user) setFallbackBearer(null);
  listeners.forEach((listener) => listener());
}

/** Lets shell components (header) react to sign-in, sign-out and profile edits. */
export function subscribeCurrentUser(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/register', input);
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  // The server answers with a session cookie; the body carries the user only.
  const response = await api.post<AuthResponse>('/auth/login', input);
  setFallbackBearer(response.data.token ?? null); // only set when the API did not start a cookie session
  setCurrentUser(response.data.user);

  return response;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout', {});
  } catch (error) {
    // A 401 means the server no longer recognises the session, so the local
    // state must be dropped as well. Any other failure keeps it so the caller
    // can show the error and retry.
    if ((error as { status?: number }).status !== 401) {
      throw error;
    }
  }

  setCurrentUser(null);
}

/** Asks the server who the cookie session belongs to, whatever the local marker says. */
export async function probeSession(): Promise<AuthUser | null> {
  try {
    const res = await api.get<{ data: { user: AuthUser } }>('/me');
    setCurrentUser(res.data.user);
    return res.data.user;
  } catch {
    return null;
  }
}

let restoring: Promise<void> | null = null;

/** After a reload the cookie session may still be valid: ask the server who we are (once at a time). */
export function restoreSession(): Promise<void> {
  if (currentUser || !getAccessToken()) return Promise.resolve();

  restoring ??= api
    .get<{ data: { user: AuthUser } }>('/me')
    .then((res) => setCurrentUser(res.data.user))
    .catch((error: { status?: number }) => {
      if (error?.status === 401) setCurrentUser(null);
    })
    .finally(() => {
      restoring = null;
    });

  return restoring;
}

export function getCurrentUser(): AuthUser | null {
  return currentUser;
}
