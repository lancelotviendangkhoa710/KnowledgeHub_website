import Link from 'next/link';

function BrandMark() {
  return (
    <span className="nav-logo__mark" aria-hidden="true">
      <span className="logo-node logo-node--a" />
      <span className="logo-node logo-node--b" />
      <span className="logo-node logo-node--c" />
    </span>
  );
}

export default function Navbar() {
  return (
    <header className="app-header site-header" id="app-header" style={{ background: 'var(--color-white)', borderBottom: '1px solid var(--color-border-light)' }}>
      <div className="container header-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>
        <Link href="/courses" className="brand-logo nav-logo" aria-label="KnowledgeHub Home" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <BrandMark />
          <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-charcoal)' }}>
            Knowledge<strong style={{ color: 'var(--color-primary)' }}>Hub</strong>
          </span>
        </Link>

        <nav aria-label="Main Navigation">
          <ul className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', listStyle: 'none' }}>
            <li>
              <Link href="/courses" className="nav-link" style={{ color: 'var(--color-gray)', fontWeight: 500 }}>
                Explore Courses
              </Link>
            </li>
            <li>
              <Link href="/bookmarks" className="nav-link" style={{ color: 'var(--color-gray)', fontWeight: 500 }}>
                Saved Library
              </Link>
            </li>
            <li>
              <Link href="/courses/create" className="nav-link" style={{ color: 'var(--color-gray)', fontWeight: 500 }}>
                Contributor Studio
              </Link>
            </li>
          </ul>
        </nav>

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="badge badge-gold">
            Contributor Access
          </span>
          <Link href="/courses/create" className="btn btn-primary" style={{ padding: '0.45rem 0.95rem', fontSize: '0.875rem' }}>
            + New Course
          </Link>
        </div>
      </div>
    </header>
  );
}
