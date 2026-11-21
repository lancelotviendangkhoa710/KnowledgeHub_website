'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthActions from '@/components/auth/AuthActions';
import Logo from '@/components/layout/Logo';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { getCurrentUser, restoreSession, subscribeCurrentUser, AuthUser } from '@/lib/auth';

const STUDIO_PATH = /^\/courses\/(manage|create|agent-create|[^/]+\/versions)/;

// `auth: true` = chỉ hiện khi đã đăng nhập (user có trong kho `auth`; lúc đang khôi phục phiên thì chưa hiện).
const NAV: { href: string; label: string; auth?: boolean; active: (p: string) => boolean }[] = [
  { href: '/courses', label: 'Khóa học', active: (p: string) => p.startsWith('/courses') && !STUDIO_PATH.test(p) },
  { href: '/learning/roadmaps', label: 'Lộ trình', active: (p: string) => p.startsWith('/learning') },
  { href: '/ai/companion', label: 'Trợ lý AI', active: (p: string) => p === '/ai' || p.startsWith('/ai/companion') },
  { href: '/ai/cv-assessment', label: 'Đánh giá CV', active: (p: string) => p.startsWith('/ai/cv-assessment') },
  { href: '/bookmarks', label: 'Đã lưu', active: (p: string) => p.startsWith('/bookmarks'), auth: true },
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
        {NAV.filter((item) => !item.auth || user).map((item) => (
          <Link key={item.href} href={item.href} aria-current={item.active(pathname) ? 'page' : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="kh-top__right">
        {user?.roles?.includes('admin') && <Link className="kh-studio" href="/admin/agent" aria-current={pathname.startsWith('/admin/agent') ? 'page' : undefined}>Trợ lý Admin</Link>}
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
