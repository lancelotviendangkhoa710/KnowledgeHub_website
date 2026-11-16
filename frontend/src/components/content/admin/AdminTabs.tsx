'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './admin.module.css';

const TABS = [
  { href: '/admin/users', label: 'Người dùng' },
  { href: '/admin/categories', label: 'Danh mục' },
  { href: '/admin/tags', label: 'Thẻ' },
];

/** Đầu trang Quản trị dùng chung: tiêu đề, mô tả và ba liên kết kiểu chip (trang hiện tại có aria-current). */
export default function AdminTabs() {
  const pathname = usePathname();
  return (
    <>
      <header className={styles.head}>
        <h1>Quản trị</h1>
        <p>Quản lý người dùng, danh mục và thẻ của nền tảng.</p>
      </header>
      <nav className={styles.tabs} aria-label="Phần quản trị">
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href} className={styles.chip} aria-current={pathname === tab.href ? 'page' : undefined}>
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
