import type { ReactNode } from 'react';
import Link from 'next/link';
import styles from './studio.module.css';

type StateProps = {
  title: string;
  description: string;
  icon: 'plus' | 'alert' | 'lock' | 'search';
  alert?: boolean;
  children?: ReactNode;
};

const ICONS: Record<StateProps['icon'], ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  alert: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
  lock: <><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
};

/** Khung trạng thái giữa trang (rỗng, lỗi, không có quyền...). */
function StateCard({ title, description, icon, alert, children }: StateProps) {
  return (
    <div className={styles.state} role={alert ? 'alert' : undefined}>
      <div className={styles.stateIcon} aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">{ICONS[icon]}</svg></div>
      <h2>{title}</h2>
      <p>{description}</p>
      {children && <div className={styles.stateActions}>{children}</div>}
    </div>
  );
}

export function StudioLoading({ label = 'Đang tải khóa học của bạn...' }: { label?: string }) {
  return <p role="status" aria-busy="true" className={styles.loading}>{label}</p>;
}

export function StudioNoAccess() {
  return (
    <StateCard icon="lock" title="Bạn chưa có quyền viết khóa học" description="Hãy xin quyền người đóng góp ở trang Tài khoản.">
      <Link className={styles.btn} href="/courses">Xem khóa học</Link>
      <Link className={`${styles.btn} ${styles.ghost}`} href="/account">Tài khoản</Link>
    </StateCard>
  );
}

export function StudioLoadError({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <StateCard alert icon="alert" title="Không tải được danh sách khóa học" description="Hãy kiểm tra kết nối hoặc thử lại.">
      <button type="button" className={styles.btn} onClick={onRetry} disabled={retrying} aria-busy={retrying}>
        {retrying ? 'Đang thử lại...' : 'Thử lại'}
      </button>
    </StateCard>
  );
}

export function StudioEmpty() {
  return (
    <StateCard icon="plus" title="Bạn chưa có khóa học nào" description="Tạo khóa học đầu tiên để bắt đầu.">
      <Link className={styles.btn} href="/courses/create">Tạo khóa học</Link>
    </StateCard>
  );
}

export function StudioNoMatch({ onClear }: { onClear: () => void }) {
  return (
    <StateCard icon="search" title="Không có khóa học nào khớp" description="Thử từ khóa ngắn hơn hoặc bỏ bộ lọc trạng thái.">
      <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={onClear}>Xóa bộ lọc</button>
    </StateCard>
  );
}
