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
      <body>{children}</body>
    </html>
  );
}
