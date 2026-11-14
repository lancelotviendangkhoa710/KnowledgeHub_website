'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthActions from '@/components/auth/AuthActions';
import Logo from '@/components/layout/Logo';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { getCurrentUser, restoreSession, subscribeCurrentUser, AuthUser } from '@/lib/auth';

const STUDIO_PATH = /^\/courses\/(manage|create|[^/]+\/versions)/;

const NAV = [
  { href: '/courses', label: 'Khóa học', active: (p: string) => p.startsWith('/courses') && !STUDIO_PATH.test(p) },
  { href: '/learning/roadmaps', label: 'Lộ trình', active: (p: string) => p.startsWith('/learning') },
  { href: '/ai/companion', label: 'Trợ lý AI', active: (p: string) => p.startsWith('/ai') },
  { href: '/bookmarks', label: 'Đã lưu', active: (p: string) => p.startsWith('/bookmarks') },
];

/**
 * Thanh đầu trang: logo, điều hướng chính, lối vào Studio cho contributor/admin, nút sáng tối và tài khoản.
 */
export default function SiteHeader() {
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser);
  const pathname = usePathname() ?? '';

  useEffect(() => {
    setUser(getCurrentUser());
    const unsubscribe = subscribeCurrentUser(() => setUser(getCurrentUser()));
    void restoreSession(); // keeps the session after a page reload (AUTH-06)
    return unsubscribe;
  }, []);

  const isContributorOrAdmin =
    user?.roles?.includes('contributor') || user?.roles?.includes('admin');

  return (
    <div className="kh-wrap kh-top__inner">
      <Logo />
      <nav className="kh-nav" aria-label="Điều hướng chính">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} aria-current={item.active(pathname) ? 'page' : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="kh-top__right">
        {isContributorOrAdmin && (
          <Link className="kh-studio" href="/courses/manage" aria-current={STUDIO_PATH.test(pathname) ? 'page' : undefined}>
            <svg className="kh-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
            <span>Studio</span>
          </Link>
        )}
        <ThemeToggle />
        <AuthActions />
      </div>
    </div>
  );
}
