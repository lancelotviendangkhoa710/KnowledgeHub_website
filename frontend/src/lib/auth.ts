import { api } from '@/lib/api';
import { setAccessToken } from '@/lib/authToken';

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

export async function register(input: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/register', input);
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', input);

  if (response.data.token) {
    setAccessToken(response.data.token);
    currentUser = response.data.user;
  }

  return response;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout', {});
  } catch (error) {
    // A 401 means the server no longer recognises the token, so the local
    // credential must be dropped as well. Any other failure keeps the token so
    // the caller can show the error and retry the revocation.
    if ((error as { status?: number }).status !== 401) {
      throw error;
    }
  }

  setAccessToken(null);
  currentUser = null;
}

export function getCurrentUser(): AuthUser | null {
  return currentUser;
}
