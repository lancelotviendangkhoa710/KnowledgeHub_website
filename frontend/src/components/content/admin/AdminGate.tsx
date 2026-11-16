import type { ReactNode } from 'react';
import AdminTabs from './AdminTabs';
import styles from './admin.module.css';

/** Trang Quản trị khi chưa vào được nội dung (chưa đăng nhập, thiếu quyền, lỗi): vẫn giữ h1 và thanh tab. */
export function AdminGate({ title, text, alert, children }: { title: string; text: string; alert?: boolean; children?: ReactNode }) {
  return (
    <div className={styles.wrap}>
      <AdminTabs />
      <div className={styles.state} role={alert ? 'alert' : undefined}>
        <h3>{title}</h3>
        <p>{text}</p>
        {children}
      </div>
    </div>
  );
}

export function AdminChecking() {
  return (
    <div className={styles.wrap}>
      <AdminTabs />
      <p role="status" aria-busy="true" className={styles.loading}>Đang kiểm tra quyền truy cập...</p>
    </div>
  );
}
