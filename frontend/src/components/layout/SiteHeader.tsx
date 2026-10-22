import Link from 'next/link';
import AuthActions from '@/components/auth/AuthActions';

export default function SiteHeader() {
  return (
    <header className="nav-header" role="banner">
      <div className="container nav-inner">
        <Link href="/" className="nav-logo" aria-label="KnowledgeHub home">
          <span className="nav-logo__mark" aria-hidden="true">
            <span className="logo-node logo-node--a" />
            <span className="logo-node logo-node--b" />
            <span className="logo-node logo-node--c" />
          </span>
          <span className="nav-logo__wordmark">Knowledge<strong>Hub</strong></span>
        </Link>
        <nav className="nav-links" aria-label="Primary navigation">
          <Link href="/" className="nav-link">Home</Link>
          <Link href="/#features" className="nav-link">Features</Link>
          <Link href="/#how-it-works" className="nav-link">How It Works</Link>
          <Link href="/#about" className="nav-link">About</Link>
        </nav>
        <AuthActions />
      </div>
    </header>
  );
}
