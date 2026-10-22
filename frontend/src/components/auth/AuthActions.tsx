'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getStoredUser, logout } from '@/lib/auth';

export default function AuthActions() {
  const [userName, setUserName] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setUserName(getStoredUser()?.name ?? null);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await logout();
    } finally {
      setUserName(null);
      setLoggingOut(false);
    }
  }

  if (!userName) {
    return (
      <div className="site-header__actions">
        <Link className="site-header__action" href="/login">Sign in</Link>
        <Link className="button button--primary site-header__action" href="/register">Get started</Link>
      </div>
    );
  }

  return (
    <div className="site-header__actions">
      <span aria-label={`Signed in as ${userName}`}>{userName}</span>
      <button type="button" className="button button--secondary" onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? 'Signing out...' : 'Sign out'}
      </button>
    </div>
  );
}
