import type { Metadata } from 'next';
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
        <header id="app-header">
          {/* Header component */}
        </header>
        <main id="app-main">{children}</main>
        <footer id="app-footer">
          {/* Footer component */}
        </footer>
      </body>
    </html>
  );
}
