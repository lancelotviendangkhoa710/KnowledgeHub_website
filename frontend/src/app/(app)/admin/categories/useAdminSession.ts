'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { accountClient } from '@/lib/accountClient';
import { AuthUser, getCurrentUser, setCurrentUser, subscribeCurrentUser } from '@/lib/auth';
import { getAccessToken } from '@/lib/authToken';

export type AuthState = 'checking' | 'guest' | 'ready';

/**
 * Session for an admin page: the signed-in marker, resolving the user via /me when only the marker is known.
 * A guest is sent to `loginUrl`; signing out elsewhere also ends in "guest".
 */
export default function useAdminSession(loginUrl: string) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser);
  const [authState, setAuthState] = useState<AuthState>(() => (getCurrentUser() ? 'ready' : 'checking'));

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
      accountClient
        .me()
        .then((response) => {
          if (cancelled) return;
          setCurrentUser(response.data.user);
          setUser(response.data.user);
          setAuthState('ready');
        })
        .catch(() => {
          if (!cancelled) setAuthState('guest');
        });
    } else {
      setAuthState('guest');
    }
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authState === 'ready' && !user) setAuthState('guest'); // signed out elsewhere
  }, [authState, user]);

  useEffect(() => {
    if (authState === 'guest') router.replace(loginUrl);
  }, [authState, router, loginUrl]);

  return { user, authState };
}
