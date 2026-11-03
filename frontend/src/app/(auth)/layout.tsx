import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-off-white)' }}>
      <header className="site-header" role="banner">
        <SiteHeader />
      </header>
      <main style={{ flex: 1 }}>{children}</main>
      <footer className="site-footer" role="contentinfo">
        <SiteFooter />
      </footer>
    </div>
  );
}
