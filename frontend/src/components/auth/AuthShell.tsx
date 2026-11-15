import type { ReactNode } from 'react';
import styles from './authForm.module.css';

/** Khung đăng nhập và đăng ký: khung xanh bên trái, biểu mẫu bên phải (mockup #dang-nhap). */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.auth}>
      <aside className={styles.art} aria-hidden="true">
        <div className={styles.disc} />
        <h2>KnowledgeHub</h2>
        <p>Nền tảng học tập có chọn lọc, kèm trợ lý AI.</p>
      </aside>
      <div className={styles.formCol}>
        <div className={styles.box}>{children}</div>
      </div>
    </div>
  );
}
