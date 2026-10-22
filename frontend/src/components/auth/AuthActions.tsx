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
      window.location.href = '/login';
    }
  }

  if (!userName) {
    return (
      <div className="nav-actions">
        <Link href="/login" className="nav-link nav-link--signin">Sign In</Link>
        <Link href="/register" className="btn btn--primary btn--sm">Get Started</Link>
      </div>
    );
  }

  return (
    <div className="nav-actions">
      <span className="nav-user">Hi, {userName}</span>
      <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
