import Link from 'next/link';
import styles from './studio.module.css';

/** Đầu trang Studio: tiêu đề, mô tả và nút tạo khóa học (ẩn khi người dùng chưa có quyền). */
export default function StudioHeader({ canCreate }: { canCreate: boolean }) {
  return (
    <header className={styles.head}>
      <div className={styles.row}>
        <div>
          <h1>Studio</h1>
          <p>Quản lý các khóa học bạn viết và xuất bản.</p>
        </div>
        {canCreate && (
          <div className={styles.btns}>
            <Link className={styles.btn} href="/courses/create">
              <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" /></svg>
              Tạo khóa học
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
