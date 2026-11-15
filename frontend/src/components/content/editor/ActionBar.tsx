import Link from 'next/link';
import styles from './editorLayout.module.css';

export function ActionBar({
  isSubmitting,
  isRevisionBlocked,
  handleSubmit,
}: {
  isSubmitting: boolean;
  isRevisionBlocked: boolean;
  handleSubmit: (publish: boolean) => void;
}) {
  return (
    <div className={styles.actbar}>
      <Link href="/courses" className={`${styles.btn} ${styles.ghost}`}>
        Hủy
      </Link>
      <button
        type="button"
        disabled={isSubmitting || isRevisionBlocked}
        onClick={() => handleSubmit(false)}
        className={`${styles.btn} ${styles.ghost}`}
      >
        Lưu bản nháp
      </button>
      <button
        type="button"
        disabled={isSubmitting || isRevisionBlocked}
        onClick={() => handleSubmit(true)}
        className={styles.btn}
      >
        {isSubmitting ? 'Đang xuất bản...' : 'Xuất bản'}
      </button>
    </div>
  );
}
