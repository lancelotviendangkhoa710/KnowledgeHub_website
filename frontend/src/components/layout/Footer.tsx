import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="app-footer site-footer" id="app-footer" style={{ backgroundColor: 'var(--color-charcoal)', padding: '3rem 0', color: 'rgba(255, 255, 255, 0.70)' }}>
      <div className="container" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--color-white)', fontSize: '1.1rem' }}>Knowledge<strong style={{ color: 'var(--color-primary-light)' }}>Hub</strong></span>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.58)' }}>— Curated Editorial Learning Platform</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.48)' }}>
            Operated by the internal content engineering team. All course materials are strictly verified and peer-crafted.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
          <Link href="/courses" style={{ color: 'rgba(255, 255, 255, 0.58)' }}>
            Courses
          </Link>
          <Link href="/bookmarks" style={{ color: 'rgba(255, 255, 255, 0.58)' }}>
            Saved Library
          </Link>
          <Link href="/courses/create" style={{ color: 'rgba(255, 255, 255, 0.58)' }}>
            Contributor Studio
          </Link>
        </div>
      </div>
    </footer>
  );
}
