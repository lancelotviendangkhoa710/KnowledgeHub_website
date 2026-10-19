import type { Metadata } from 'next';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import './globals.css';

export const metadata: Metadata = {
  title: 'KnowledgeHub',
  description: 'Curated Learning Platform with AI Companion',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <html lang="en">
      <body>
          <header id="app-header" className="site-header">
            <SiteHeader />
          </header>
          <main id="app-main" className="app-main">{children}</main>
          <footer id="app-footer" className="site-footer">
            <SiteFooter />
          </footer>
      </body>
    </html>
  );
}
