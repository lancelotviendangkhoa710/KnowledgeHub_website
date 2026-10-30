import Link from 'next/link';

export default function SiteFooter() {
  return (
    <div className="site-footer__inner content-container">
      <div className="site-footer__brand">
        <Link className="site-brand" href="/" aria-label="KnowledgeHub home">
          Knowledge<strong>Hub</strong>
        </Link>
        <p>A curated learning platform for curious minds.</p>
      </div>
      <nav className="site-footer__nav" aria-label="Footer navigation">
        <Link href="/courses">Explore courses</Link>
        <Link href="/login">Sign in</Link>
        <Link href="/register">Create an account</Link>
      </nav>
    </div>
  );
}
