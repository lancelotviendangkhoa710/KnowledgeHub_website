import { api } from '@/lib/api';

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

export type AuthError = {
  message?: string;
  errors?: Record<string, string[]>;
};

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
    localStorage.setItem('auth_token', response.data.token);
    localStorage.setItem('auth_user', JSON.stringify(response.data.user));
  }

  return response;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout', {});
  } finally {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem('auth_user');
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  } catch {
    return null;
  }
}
