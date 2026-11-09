'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthActions from '@/components/auth/AuthActions';
import { getCurrentUser, subscribeCurrentUser, AuthUser } from '@/lib/auth';

function BrandMark() {
  return (
    <span className="nav-logo__mark" aria-hidden="true">
      <span className="logo-node logo-node--a" />
      <span className="logo-node logo-node--b" />
      <span className="logo-node logo-node--c" />
    </span>
  );
}

export default function SiteHeader() {
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser);

  useEffect(() => {
    setUser(getCurrentUser());
    return subscribeCurrentUser(() => setUser(getCurrentUser()));
  }, []);

  const isContributorOrAdmin =
    user?.roles?.includes('contributor') || user?.roles?.includes('admin');

  return (
    <div className="site-header__inner content-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
        <Link className="site-brand nav-logo" href="/" aria-label="KnowledgeHub home" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <BrandMark />
          <span className="nav-logo__wordmark" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-charcoal)', letterSpacing: '-0.02em' }}>
            Knowledge<strong style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Hub</strong>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Main navigation" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--color-gray)', fontWeight: 500, fontSize: '0.92rem' }}>Discover</Link>
          <Link href="/courses" style={{ color: 'var(--color-gray)', fontWeight: 500, fontSize: '0.92rem' }}>Courses</Link>
          <Link href="/bookmarks" style={{ color: 'var(--color-gray)', fontWeight: 500, fontSize: '0.92rem' }}>Saved</Link>
          <Link href="/learning/roadmaps" style={{ color: 'var(--color-gray)', fontWeight: 500, fontSize: '0.92rem' }}>Roadmaps</Link>
          <Link href="/ai/companion" style={{ color: 'var(--color-gray)', fontWeight: 500, fontSize: '0.92rem' }}>AI Companion</Link>
          {isContributorOrAdmin && (
            <Link
              href="/courses/manage"
              style={{
                color: 'var(--color-primary)',
                fontWeight: 600,
                fontSize: '0.92rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Studio</span>
            </Link>
          )}
        </nav>
      </div>
      <AuthActions />
    </div>
  );
}
