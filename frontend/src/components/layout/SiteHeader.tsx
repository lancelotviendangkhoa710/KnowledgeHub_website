'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthActions from '@/components/auth/AuthActions';
import { getCurrentUser, restoreSession, subscribeCurrentUser, AuthUser } from '@/lib/auth';
import styles from './siteHeader.module.css';

/**
 * Renders the brand logo icon mark with animated nodes.
 */
function BrandMark() {
  return (
    <span className="nav-logo__mark" aria-hidden="true">
      <span className="logo-node logo-node--a" />
      <span className="logo-node logo-node--b" />
      <span className="logo-node logo-node--c" />
    </span>
  );
}

type NavItem = { href: string; label: string; match: (path: string) => boolean };

const startsWith = (prefix: string) => (path: string) => path === prefix || path.startsWith(`${prefix}/`);

const NAV_ITEMS: NavItem[] = [
  { href: '/courses', label: 'Courses', match: (p) => startsWith('/courses')(p) && !p.startsWith('/courses/manage') && !p.startsWith('/courses/create') },
  { href: '/bookmarks', label: 'Saved', match: startsWith('/bookmarks') },
  { href: '/learning/roadmaps', label: 'Roadmap Templates', match: startsWith('/learning/roadmaps') },
];

/**
 * Main navigation shell header: brand, primary links with the current page marked,
 * the role-based Studio shortcut and the account actions. Below 960px the links and
 * actions collapse behind a menu button.
 */
export default function SiteHeader() {
  const pathname = usePathname() ?? '';
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    const unsubscribe = subscribeCurrentUser(() => setUser(getCurrentUser()));
    void restoreSession(); // keeps the session after a page reload (AUTH-06)
    return unsubscribe;
  }, []);

  // Close the mobile menu after navigating.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isContributorOrAdmin =
    user?.roles?.includes('contributor') || user?.roles?.includes('admin');

  const linkClass = (active: boolean, extra?: string) =>
    [styles.link, active ? styles.active : '', extra ?? ''].filter(Boolean).join(' ');

  const items: NavItem[] = [
    ...NAV_ITEMS,
    ...(user ? [{ href: '/learning/my-roadmaps', label: 'My Roadmaps', match: startsWith('/learning/my-roadmaps') }] : []),
    { href: '/ai/companion', label: 'AI Companion', match: startsWith('/ai') },
  ];

  return (
    <div className={`site-header__inner content-container ${styles.bar}`}>
      <Link className={`site-brand nav-logo ${styles.brand}`} href="/" aria-label="KnowledgeHub home">
        <BrandMark />
        <span className={`nav-logo__wordmark ${styles.wordmark}`}>
          Knowledge<strong>Hub</strong>
        </span>
      </Link>

      <button
        type="button"
        className={styles.toggle}
        aria-expanded={menuOpen}
        aria-controls="site-header-panel"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {menuOpen ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      <div id="site-header-panel" className={`${styles.panel} ${menuOpen ? styles.panelOpen : ''}`}>
        <nav className={styles.nav} aria-label="Main navigation">
          {items.map((item) => {
            const active = item.match(pathname);
            return (
              <Link key={item.href} href={item.href} className={linkClass(active)} aria-current={active ? 'page' : undefined}>
                {item.label}
              </Link>
            );
          })}
          {isContributorOrAdmin && (
            <Link
              href="/courses/manage"
              className={linkClass(startsWith('/courses/manage')(pathname) || startsWith('/courses/create')(pathname), styles.studio)}
              aria-current={startsWith('/courses/manage')(pathname) ? 'page' : undefined}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Studio</span>
            </Link>
          )}
        </nav>
        <div className={styles.actions}>
          <AuthActions />
        </div>
      </div>
    </div>
  );
}
