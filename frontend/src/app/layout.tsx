import type { Metadata } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans, Roboto } from 'next/font/google';
import './globals.css';

const display = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600', '700', '800'],
  variable: '--f-display',
  display: 'swap',
});
const body = Roboto({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '700'],
  variable: '--f-body',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500'],
  variable: '--f-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KnowledgeHub',
  description: 'Nền tảng học tập có chọn lọc, kèm trợ lý AI.',
};

// Chạy trước khi vẽ trang để không nháy sai màu sáng/tối (khóa localStorage: kh-theme).
const themeScript = `try{var r=document.documentElement,s=localStorage.getItem('kh-theme');r.setAttribute('data-theme',s==='light'||s==='dark'?s:(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'))}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
