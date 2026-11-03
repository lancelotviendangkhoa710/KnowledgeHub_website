import Link from 'next/link';
import AuthActions from '@/components/auth/AuthActions';

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
        </nav>
      </div>
      <AuthActions />
    </div>
  );
}
