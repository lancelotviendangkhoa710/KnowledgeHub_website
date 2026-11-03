'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCurrentUser, logout, subscribeCurrentUser } from '@/lib/auth';

export default function AuthActions() {
  const [user, setUser] = useState(getCurrentUser);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
    return subscribeCurrentUser(() => setUser(getCurrentUser()));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError(null);

    try {
      await logout();
    } catch {
      setLogoutError('Could not sign out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  }

  if (!user) {
    return (
      <div className="site-header__actions">
        <Link className="site-header__action" href="/login">Sign in</Link>
        <Link className="button button--primary site-header__action" href="/register">Get started</Link>
      </div>
    );
  }

  return (
    <div className="site-header__actions">
      {user.roles.includes('admin') && <Link href="/admin/users">Users</Link>}
      <Link href="/account" aria-label={`Account of ${user.name}`}>{user.name}</Link>
      <button type="button" className="button button--secondary" onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? 'Signing out...' : 'Sign out'}
      </button>
      {logoutError && <span role="alert">{logoutError}</span>}
    </div>
  );
}
