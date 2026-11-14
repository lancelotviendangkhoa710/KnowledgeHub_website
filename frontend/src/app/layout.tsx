import type { Metadata } from 'next';
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google';
import './globals.css';

// UX-04: one self-hosted UI font with full Vietnamese support, plus the code font.
// next/font serves both from our own origin and exposes them as CSS variables.
const uiFont = Be_Vietnam_Pro({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
});

const codeFont = JetBrains_Mono({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-code',
});

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
    <html lang="vi" className={`${uiFont.variable} ${codeFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
