import Link from 'next/link';
import styles from './editorLayout.module.css';

export function EditorAccessDenied() {
  return (
    <div className={styles.wrap}>
      <div className={styles.state}>
        <h2>Bạn không có quyền soạn khóa học</h2>
        <p>
          Chỉ người đóng góp và quản trị viên mới được soạn khóa học. Hãy xin quyền người đóng góp ở trang Tài khoản.
        </p>
        <div className={styles.stateActions}>
          <Link href="/courses/manage" className={styles.btn}>Về Studio</Link>
          <Link href="/account" className={`${styles.btn} ${styles.ghost}`}>Tài khoản</Link>
        </div>
      </div>
    </div>
  );
}
