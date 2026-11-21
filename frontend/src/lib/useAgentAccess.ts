'use client';

import { useEffect, useState } from 'react';
import { AuthUser, getCurrentUser, restoreSession, subscribeCurrentUser } from '@/lib/auth';

/** The API performs the real authorization; this only controls the page state. */
export function useAgentAccess(): { user: AuthUser | null; checking: boolean } {
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeCurrentUser(() => {
      if (active) setUser(getCurrentUser());
    });
    void restoreSession().finally(() => {
      if (active) {
        setUser(getCurrentUser());
        setChecking(false);
      }
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  return { user, checking };
}
