'use client';

import { useEffect, useRef, useState } from 'react';
import { accountClient, errorMessage, type AccountUser } from '@/lib/accountClient';
import { getCurrentUser, setCurrentUser, subscribeCurrentUser, type AuthUser } from '@/lib/auth';
import { getAccessToken, setAccessToken } from '@/lib/authToken';

export type FreshUserInfo = { switchedAccount: boolean; cachedName: string };

/**
 * Người dùng đang đăng nhập cho trang hồ sơ và trang cài đặt.
 * Hiện ngay bản lưu tạm, rồi hỏi lại `/me` (có `created_at`). 401 thì xóa phiên cục bộ để trang
 * chuyển sang trạng thái "Cần đăng nhập". `onFresh` chạy trước khi bản lưu tạm bị ghi đè.
 */
export function useAccountUser(onFresh?: (user: AccountUser, info: FreshUserInfo) => void) {
  const [user, setUser] = useState<(AuthUser & { created_at?: string | null }) | null>(getCurrentUser);
  const [refreshing, setRefreshing] = useState(false); // /me in flight: cached data may be stale
  const [loadError, setLoadError] = useState<string | null>(null);
  const onFreshRef = useRef(onFresh);
  onFreshRef.current = onFresh;
  const userId = user?.id ?? null;

  // Follow sign-out / sign-in done elsewhere (e.g. the header).
  useEffect(() => subscribeCurrentUser(() => setUser(getCurrentUser())), []);

  // Runs again when the user first appears (session restored after load), not only on mount.
  useEffect(() => {
    if (!getCurrentUser()) return;
    let active = true; // false after sign-out or a user change: a late /me answer must be ignored
    const tokenAtRequest = getAccessToken();
    setRefreshing(true);
    setLoadError(null);
    accountClient.me().then((response) => {
      // Signed out or switched account while /me was in flight: this answer is stale.
      if (!active || getAccessToken() !== tokenAtRequest) return;
      const fresh = response.data.user;
      // Read the cached user before setCurrentUser overwrites it.
      const cached = getCurrentUser();
      onFreshRef.current?.(fresh, { switchedAccount: cached?.id !== fresh.id, cachedName: cached?.name ?? '' });
      setUser(fresh);
      setCurrentUser(fresh);
    }).catch((error: { status?: number }) => {
      if (!active) return;
      // Token revoked: drop the local session so the page shows signed-out state.
      if (error?.status === 401) {
        // Ignore a stale 401 if the user signed in again meanwhile.
        if (getAccessToken() === tokenAtRequest) {
          setAccessToken(null);
          setCurrentUser(null);
        }
        return;
      }
      setLoadError(errorMessage(error, 'Không tải lại được hồ sơ của bạn.'));
    }).finally(() => { if (active) setRefreshing(false); });
    return () => { active = false; };
  }, [userId]);

  return { user, setUser, refreshing, loadError };
}

export function roleName(roles: string[] | undefined): string {
  if (roles?.includes('admin')) return 'Quản trị viên';
  if (roles?.includes('contributor')) return 'Người đóng góp';
  return 'Người học';
}

export function initialOf(name: string | undefined): string {
  return name ? name.trim().slice(0, 1).toUpperCase() || 'U' : 'U';
}
