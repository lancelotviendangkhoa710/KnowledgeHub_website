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
      <div className="site-header__actions" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <Link className="site-header__action" href="/login" style={{ color: 'var(--color-charcoal)', fontWeight: 500, fontSize: '0.9rem' }}>
          Sign in
        </Link>
        <Link className="btn btn-primary" href="/register" style={{ padding: '0.45rem 1rem', fontSize: '0.875rem' }}>
          Get started
        </Link>
      </div>
    );
  }

  return (
    <div className="site-header__actions" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
      <span aria-label={`Signed in as ${userName}`} style={{ color: 'var(--color-charcoal)', fontWeight: 600, fontSize: '0.9rem' }}>
        {userName}
      </span>
      <button type="button" className="btn btn-secondary" onClick={handleLogout} disabled={loggingOut} style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
        {loggingOut ? 'Signing out...' : 'Sign out'}
      </button>
      {logoutError && <span role="alert" style={{ color: 'var(--color-primary-light)', fontSize: '0.85rem' }}>{logoutError}</span>}
    </div>
  );
}
