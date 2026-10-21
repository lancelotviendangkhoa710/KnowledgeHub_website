import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="site-header" role="banner">
        <SiteHeader />
      </header>
      <main>{children}</main>
      <footer className="site-footer" role="contentinfo">
        <SiteFooter />
      </footer>
    </>
  );
}
