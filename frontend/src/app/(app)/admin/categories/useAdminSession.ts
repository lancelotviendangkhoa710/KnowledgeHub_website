'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { accountClient } from '@/lib/accountClient';
import { AuthUser, getCurrentUser, setCurrentUser, subscribeCurrentUser } from '@/lib/auth';
import { getAccessToken } from '@/lib/authToken';

export type AuthState = 'checking' | 'guest' | 'ready' | 'error';

/**
 * Session for an admin page: the signed-in marker, resolving the user via /me when only the marker is known.
 * A guest (no session, or /me answers 401/403) is sent to `loginUrl`. A transient /me failure (network, 5xx)
 * ends in "error" so the page can offer `retry` instead of logging the user out.
 */
export default function useAdminSession(loginUrl: string) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser);
  const [authState, setAuthState] = useState<AuthState>(() => (getCurrentUser() ? 'ready' : 'checking'));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = subscribeCurrentUser(() => {
      if (!cancelled) setUser(getCurrentUser());
    });
    const current = getCurrentUser();
    if (current) {
      setUser(current);
      setAuthState('ready');
    } else if (getAccessToken()) {
      setAuthState('checking');
      const signedInMarker = getAccessToken(); // a late answer must not revive a session that changed meanwhile
      accountClient
        .me()
        .then((response) => {
          if (cancelled || getAccessToken() !== signedInMarker) return;
          setCurrentUser(response.data.user);
          setUser(response.data.user);
          setAuthState('ready');
        })
        .catch((error: { status?: number }) => {
          if (cancelled || getAccessToken() !== signedInMarker) return;
          setAuthState(error?.status === 401 || error?.status === 403 ? 'guest' : 'error');
        });
    } else {
      setAuthState('guest');
    }
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [attempt]);

  useEffect(() => {
    if (authState === 'ready' && !user) setAuthState('guest'); // signed out elsewhere
  }, [authState, user]);

  useEffect(() => {
    if (authState === 'guest') router.replace(loginUrl);
  }, [authState, router, loginUrl]);

  return { user, authState, retry: () => setAttempt((n) => n + 1) };
}
