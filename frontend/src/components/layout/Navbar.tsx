import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="app-header" id="app-header">
      <div className="container header-inner">
        <Link href="/courses" className="brand-logo" aria-label="KnowledgeHub Home">
          <div className="brand-icon">K</div>
          <span>KnowledgeHub</span>
        </Link>

        <nav aria-label="Main Navigation">
          <ul className="nav-links">
            <li>
              <Link href="/courses" className="nav-link">
                Explore Courses
              </Link>
            </li>
            <li>
              <Link href="/bookmarks" className="nav-link">
                My Saved Library
              </Link>
            </li>
            <li>
              <Link href="/courses/create" className="nav-link">
                Contributor Studio
              </Link>
            </li>
          </ul>
        </nav>

        <div className="header-actions">
          <span className="badge badge-gold">
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}></span>
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
