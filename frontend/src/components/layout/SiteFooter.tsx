import Link from 'next/link';

function BrandMark() {
  return (
    <span className="nav-logo__mark footer-logo__mark" aria-hidden="true">
      <span className="logo-node logo-node--a" style={{ backgroundColor: 'var(--color-primary-light)' }} />
      <span className="logo-node logo-node--b" style={{ backgroundColor: 'var(--color-primary-light)' }} />
      <span className="logo-node logo-node--c" style={{ backgroundColor: 'var(--color-primary-light)' }} />
    </span>
  );
}

export default function SiteFooter() {
  return (
    <div className="site-footer__inner content-container" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', padding: '3rem 0' }}>
      <div className="site-footer__brand" style={{ maxWidth: 440 }}>
        <Link className="site-brand nav-logo footer-logo" href="/" aria-label="KnowledgeHub home" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <BrandMark />
          <span className="nav-logo__wordmark" style={{ color: 'var(--color-white)', fontSize: '1.2rem', fontWeight: 600 }}>
            Knowledge<strong style={{ color: 'var(--color-primary-light)' }}>Hub</strong>
          </span>
        </Link>
        <p style={{ marginTop: '0.75rem', color: 'rgba(255, 255, 255, 0.58)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          A curated learning platform with an AI Learning Companion. Operated by the internal engineering content team for serious learners.
        </p>
      </div>
      <nav className="site-footer__nav" aria-label="Footer navigation" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.75rem' }}>
        <Link href="/courses" style={{ color: 'rgba(255, 255, 255, 0.58)', fontSize: '0.875rem', transition: 'color 150ms ease' }}>
          Explore courses
        </Link>
        <Link href="/learning/roadmaps" style={{ color: 'rgba(255, 255, 255, 0.58)', fontSize: '0.875rem', transition: 'color 150ms ease' }}>
          Learning roadmaps
        </Link>
        <Link href="/bookmarks" style={{ color: 'rgba(255, 255, 255, 0.58)', fontSize: '0.875rem', transition: 'color 150ms ease' }}>
          Saved library
        </Link>
        <Link href="/login" style={{ color: 'rgba(255, 255, 255, 0.58)', fontSize: '0.875rem', transition: 'color 150ms ease' }}>
          Sign in
        </Link>
        <Link href="/register" style={{ color: 'rgba(255, 255, 255, 0.58)', fontSize: '0.875rem', transition: 'color 150ms ease' }}>
          Create account
        </Link>
      </nav>
    </div>
  );
}
