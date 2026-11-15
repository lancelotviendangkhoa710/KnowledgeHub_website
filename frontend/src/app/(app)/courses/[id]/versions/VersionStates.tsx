import type { ReactNode } from 'react';
import Link from 'next/link';
import styles from '@/components/content/versions/versions.module.css';

/** Câu thông báo của từng trạng thái; cũng được đọc qua vùng aria-live có sẵn trong trang (xem page.tsx). */
export const STATE_MESSAGES = {
  signin: 'Đăng nhập để xem lịch sử phiên bản',
  forbidden: 'Bạn không có quyền xem trang này',
  notfound: 'Không tìm thấy khóa học',
  empty: 'Khóa học này chưa có phiên bản nào được lưu.',
} as const;

/** Khung trạng thái giữa trang (chưa đăng nhập, không có quyền, không tìm thấy, lỗi...). */
function StateCard({ title, description, alert, children }: { title: string; description: string; alert?: boolean; children?: ReactNode }) {
  return (
    <div className={styles.state} role={alert ? 'alert' : undefined}>
      <h3>{title}</h3>
      <p>{description}</p>
      {children && <div className={styles.stateActions}>{children}</div>}
    </div>
  );
}

export function VersionLoading() {
  return <p role="status" aria-busy="true" className={styles.loading}>Đang tải lịch sử phiên bản...</p>;
}

export function VersionSignIn({ loginHref }: { loginHref: string }) {
  return (
    <StateCard title={STATE_MESSAGES.signin} description="Khóa học này chưa xuất bản, nên bạn cần đăng nhập bằng tài khoản có quyền.">
      <Link className={styles.btn} href={loginHref}>Đăng nhập</Link>
    </StateCard>
  );
}

export function VersionForbidden() {
  return (
    <StateCard title={STATE_MESSAGES.forbidden} description="Chỉ tác giả và quản trị viên xem được lịch sử của khóa học chưa xuất bản.">
      <Link className={`${styles.btn} ${styles.ghost}`} href="/courses">Về danh sách khóa học</Link>
    </StateCard>
  );
}

export function VersionNotFound() {
  return (
    <StateCard title={STATE_MESSAGES.notfound} description="Khóa học có thể đã bị xóa hoặc đường dẫn không đúng.">
      <Link className={`${styles.btn} ${styles.ghost}`} href="/courses">Về danh sách khóa học</Link>
    </StateCard>
  );
}

export function VersionLoadError({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <StateCard alert title="Không tải được lịch sử phiên bản" description="Kiểm tra kết nối mạng rồi thử lại.">
      <button type="button" className={styles.btn} onClick={onRetry} disabled={retrying} aria-busy={retrying}>
        {retrying ? 'Đang thử lại...' : 'Thử lại'}
      </button>
    </StateCard>
  );
}

export function VersionEmpty() {
  return (
    <div className={styles.state}>
      <p>{STATE_MESSAGES.empty}</p>
    </div>
  );
}
