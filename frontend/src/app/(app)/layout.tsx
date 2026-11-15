import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg)' }}>
      <header className="kh-top" role="banner">
        <SiteHeader />
      </header>
      <main style={{ flex: 1, paddingBottom: '4rem' }}>{children}</main>
      <footer className="kh-foot" role="contentinfo">
        <SiteFooter />
      </footer>
    </div>
  );
}
