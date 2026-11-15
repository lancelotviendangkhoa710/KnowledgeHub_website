import type { ReactNode } from 'react';
import styles from './authForm.module.css';

const DONE = ['Database, giao dịch và đồng thời', 'Thiết kế pipeline ETL và ELT'];

/** Khung đăng nhập và đăng ký: khung xanh bên trái, biểu mẫu bên phải (mockup #dang-nhap). */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.auth}>
      <aside className={styles.art} aria-hidden="true">
        <span className={styles.ghost}>HỌC</span>
        <div className={styles.disc} />
        <div className={styles.ring} />
        <div className={styles.artBody}>
          <h2 className={styles.rise1}>KnowledgeHub</h2>
          <p className={styles.rise2}>Nền tảng học tập có chọn lọc, kèm trợ lý AI.</p>
          <div className={`${styles.demo} ${styles.rise3}`}>
            <b>Data Engineer, trình độ Intermediate</b>
            <small>Ví dụ minh họa, 3 trên 5 khóa đã xong</small>
            <div className={styles.bar}><i /></div>
            <ol>
              {DONE.map((t) => (
                <li key={t}>
                  <span className={styles.tick}><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
                  {t}
                </li>
              ))}
              <li><span className={styles.now} />Kiểm thử và quan sát pipeline <em>Đang học</em></li>
            </ol>
          </div>
        </div>
      </aside>
      <div className={styles.formCol}>
        <div className={styles.box}>{children}</div>
      </div>
    </div>
  );
}
