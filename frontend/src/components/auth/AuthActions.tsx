'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCurrentUser, logout } from '@/lib/auth';

export default function AuthActions() {
  const [userName, setUserName] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    setUserName(getCurrentUser()?.name ?? null);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError(null);

    try {
      await logout();
      setUserName(null);
    } catch {
      setLogoutError('Could not sign out. Please try again.');
    } finally {
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
      {logoutError && <span role="alert">{logoutError}</span>}
    </div>
  );
}
