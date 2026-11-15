'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { getCurrentUser, logout, subscribeCurrentUser } from '@/lib/auth';
import styles from './AuthActions.module.css';

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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getCurrentUser());
    return subscribeCurrentUser(() => setUser(getCurrentUser()));
  }, []);

  // Menu tài khoản: đóng khi bấm ra ngoài hoặc nhấn Escape (trả focus về ảnh đại diện); mở ra thì focus mục đầu.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

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

  /** Mũi tên lên/xuống, Home, End di chuyển giữa các mục; Tab rời menu thì đóng. */
  function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (e.key === 'ArrowDown') next = (index + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else if (e.key === 'Tab') {
      // Focus về ảnh đại diện trước, để Tab đi tiếp từ đúng vị trí thay vì nhảy về đầu trang.
      triggerRef.current?.focus();
      setOpen(false);
    }
    if (next >= 0) {
      e.preventDefault();
      items[next]?.focus();
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
    <div className={`site-header__actions kh-auth ${styles.root}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.avatar}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menu tài khoản của ${user.name}`}
        title={user.name}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {initials(user.name)}
      </button>
      {open && (
        <div className={styles.menu} role="menu" aria-label="Tài khoản" ref={menuRef} onKeyDown={onMenuKeyDown}>
          <div className={styles.who}>
            <b>{user.name}</b>
            <small title={user.email}>{user.email}</small>
          </div>
          <Link role="menuitem" href="/account" onClick={() => setOpen(false)}>Tài khoản</Link>
          {user.roles.includes('admin') && (
            <Link role="menuitem" href="/admin/users" onClick={() => setOpen(false)}>Quản trị</Link>
          )}
          <button type="button" role="menuitem" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
          {logoutError && <p role="alert" className={styles.error}>{logoutError}</p>}
        </div>
      )}
    </div>
  );
}
