import Link from 'next/link';

export default function SiteFooter() {
  return (
    <div className="container footer-inner">
      <div className="footer-brand">
        <Link href="/" className="nav-logo" aria-label="KnowledgeHub home">
          <span className="nav-logo__mark" aria-hidden="true">
            <span className="logo-node logo-node--a" />
            <span className="logo-node logo-node--b" />
            <span className="logo-node logo-node--c" />
          </span>
          <span className="nav-logo__wordmark">Knowledge<strong>Hub</strong></span>
        </Link>
        <p className="footer-brand__desc">A curated learning platform with an AI Learning Companion. Built for curious minds who take learning seriously.</p>
      </div>
      <nav className="footer-nav" aria-label="Footer navigation">
        <div className="footer-nav__col"><p className="footer-nav__label">Platform</p><Link href="/courses" className="footer-nav__link">Explore</Link><Link href="/#features" className="footer-nav__link">Features</Link><Link href="/#how-it-works" className="footer-nav__link">How It Works</Link></div>
        <div className="footer-nav__col"><p className="footer-nav__label">Learning</p><Link href="/courses" className="footer-nav__link">Courses</Link><Link href="/#features" className="footer-nav__link">AI Companion</Link><Link href="/#how-it-works" className="footer-nav__link">Learning Paths</Link></div>
        <div className="footer-nav__col"><p className="footer-nav__label">Company</p><Link href="/#about" className="footer-nav__link">About</Link><a href="#" className="footer-nav__link">Privacy</a><a href="#" className="footer-nav__link">Terms</a></div>
      </nav>
    </div>
  );
}
