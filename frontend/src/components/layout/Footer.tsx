import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="app-footer" id="app-footer">
      <div className="container" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>KnowledgeHub</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>— Curated Editorial Learning Platform</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-faint)' }}>
            Operated by the internal content engineering team. All course materials are strictly verified and peer-crafted.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
          <Link href="/courses" style={{ color: 'var(--text-muted)' }}>
            Courses
          </Link>
          <Link href="/bookmarks" style={{ color: 'var(--text-muted)' }}>
            Saved Library
          </Link>
          <Link href="/courses/create" style={{ color: 'var(--text-muted)' }}>
            Contributor Studio
          </Link>
        </div>
      </div>
    </footer>
  );
}
