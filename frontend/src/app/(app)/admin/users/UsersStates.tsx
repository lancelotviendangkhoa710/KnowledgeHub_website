import Link from 'next/link';
import styles from '@/components/content/admin/admin.module.css';

export function UsersLoading() {
  return <p role="status" aria-busy="true" className={styles.loading}>Đang tải người dùng...</p>;
}

export function UsersEmpty() {
  return <div className={styles.state}><h3>Không tìm thấy người dùng</h3><p>Thử từ khóa hoặc bộ lọc khác.</p></div>;
}

export function UsersLoadError({ detail, onRetry }: { detail: string; onRetry: () => void }) {
  return (
    <div className={styles.state} role="alert">
      <h3>Không tải được danh sách người dùng</h3>
      <p>Kiểm tra kết nối mạng rồi thử lại.{detail ? ` ${detail}` : ''}</p>
      <button type="button" className={styles.btn} onClick={onRetry}>Thử lại</button>
    </div>
  );
}

export function UsersSignIn() {
  return (
    <div className={styles.state}>
      <h3>Cần đăng nhập</h3>
      <p>Đăng nhập bằng tài khoản quản trị để quản lý người dùng.</p>
      <Link className={styles.btn} href="/login?redirect=/admin/users">Đăng nhập</Link>
    </div>
  );
}
