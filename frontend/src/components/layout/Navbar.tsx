import Link from 'next/link';
import AuthActions from '@/components/auth/AuthActions';

export default function Navbar() {
  return (
    <header className="app-header landing-header" id="app-header">
      <div className="container header-inner">
        <Link href="/" className="brand-logo landing-logo" aria-label="KnowledgeHub Home">
          <span className="landing-logo__mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>Knowledge<span className="landing-logo__accent">Hub</span></span>
        </Link>

        <nav className="landing-nav" aria-label="Main Navigation">
          <Link href="/">Home</Link>
          <a href="/#features">Features</a>
          <a href="/#how-it-works">How It Works</a>
          <a href="/#about">About</a>
        </nav>

        <AuthActions />
      </div>
    </header>
  );
}
