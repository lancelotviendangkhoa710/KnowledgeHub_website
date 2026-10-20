import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'KnowledgeHub — Curated Engineering & Science Learning Platform',
  description: 'Curated deep-dive courses and educational materials crafted by internal technical contributors with AI companion integration.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main id="app-main" className="app-main" style={{ flex: 1, paddingBottom: '4rem' }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
