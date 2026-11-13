import { api } from '@/lib/api';
import type { AuthUser } from '@/lib/auth';

export type AccountUser = AuthUser & { created_at: string | null };
export type UserStatus = AuthUser['status'];

type Envelope<T> = { status: 'success' | 'error'; message?: string; data: T };

export type AdminUsersPage = {
  data: AccountUser[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

export type AdminUserFilters = { status?: string; role?: string; search?: string; page?: number; sort?: 'newest' | 'oldest'; created_within_days?: number };

export const accountClient = {
  me: () => api.get<Envelope<{ user: AccountUser }>>('/me'),
  updateName: (name: string) => api.patch<Envelope<{ user: AccountUser }>>('/me', { name }),
  changePassword: (input: { current_password: string; password: string; password_confirmation: string }) =>
    api.put<Envelope<null>>('/me/password', input),
  deleteAccount: (current_password: string) => api.delete<Envelope<null>>('/me', { current_password }),
};

export const adminUserClient = {
  list: (filters: AdminUserFilters) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && query.set(key, String(value)));
    const qs = query.toString();
    return api.get<AdminUsersPage & { status: string }>(`/admin/users${qs ? `?${qs}` : ''}`);
  },
  setStatus: (id: string, status: Exclude<UserStatus, 'pending'>) =>
    api.patch<Envelope<{ user: AccountUser }>>(`/admin/users/${id}/status`, { status }),
  setRole: (id: string, role: AssignableRole, confirmation?: string) => {
    const body: Record<string, string> = { role };
    if (confirmation) body['current_password'] = confirmation;
    return api.put<Envelope<{ user: AccountUser }>>(`/admin/users/${id}/role`, body);
  },
};

export type AssignableRole = 'user' | 'contributor' | 'admin';
export const ASSIGNABLE_ROLES: AssignableRole[] = ['user', 'contributor', 'admin'];

/** First human-readable message from a Laravel validation or API error. */
export function errorMessage(error: unknown, fallback: string): string {
  const e = error as { message?: string; errors?: Record<string, string[]>; status?: number };
  const first = e.errors ? Object.values(e.errors)[0]?.[0] : undefined;
  if (e.status === 401) return 'Your session has expired. Please sign in again.';
  if (e.status === 403) return 'You do not have permission to do that.';
  if (e.status === 429) return 'Too many attempts. Please wait a minute and try again.';
  return first ?? e.message ?? fallback;
}
