'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCurrentUser, logout, subscribeCurrentUser } from '@/lib/auth';

/** Chữ cái đầu của hai từ cuối trong tên, dùng cho ảnh đại diện. */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.length > 1 ? parts[parts.length - 2][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

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
      setLogoutError('Không đăng xuất được. Vui lòng thử lại.');
    } finally {
      setLoggingOut(false);
    }
  }

  if (!user) {
    return (
      <div className="site-header__actions kh-auth">
        <Link className="kh-link" href="/login">Đăng nhập</Link>
        <Link className="kh-btn" href="/register">Bắt đầu</Link>
      </div>
    );
  }

  return (
    <div className="site-header__actions kh-auth">
      {user.roles.includes('admin') && (
        <Link className="kh-link" href="/admin/users">Quản trị</Link>
      )}
      <Link className="kh-avatar" href="/account" title={`Tài khoản của ${user.name}`} aria-label={`Tài khoản của ${user.name}`}>
        {initials(user.name)}
      </Link>
      <button type="button" className="kh-link" onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
      </button>
      {logoutError && <span role="alert" className="kh-auth__error">{logoutError}</span>}
    </div>
  );
}
