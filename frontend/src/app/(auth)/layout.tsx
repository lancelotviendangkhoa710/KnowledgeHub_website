import SiteHeader from '@/components/layout/SiteHeader';

// Theo mockup, màn đăng nhập không có chân trang.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg)' }}>
      <header className="kh-top" role="banner">
        <SiteHeader />
      </header>
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
