import Link from 'next/link';
import AuthActions from '@/components/auth/AuthActions';

export default function SiteHeader() {
  return (
    <div className="site-header__inner content-container">
      <Link className="site-brand" href="/" aria-label="KnowledgeHub home">
        Knowledge<strong>Hub</strong>
      </Link>
      <nav className="site-nav" aria-label="Main navigation">
        <Link href="/">Discover</Link>
        <Link href="/courses">Courses</Link>
      </nav>
      <AuthActions />
    </div>
  );
}
