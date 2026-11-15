import Link from 'next/link';
import styles from '@/components/content/versions/versions.module.css';

/** Đường dẫn và đầu trang. `courseTitle` và `courseHref` chỉ có khi đã tải được khóa học. */
export default function VersionsHeader({ courseTitle, courseHref }: { courseTitle?: string; courseHref?: string }) {
  return (
    <>
      <nav className={styles.crumb} aria-label="Đường dẫn">
        <Link href="/courses">Khóa học</Link>
        <span aria-hidden="true">/</span>
        {courseTitle && courseHref && (
          <>
            <Link href={courseHref}>{courseTitle}</Link>
            <span aria-hidden="true">/</span>
          </>
        )}
        <span aria-current="page">Lịch sử phiên bản</span>
      </nav>
      <header className={styles.head}>
        <h1>Lịch sử phiên bản</h1>
        <p>Xem lại từng phiên bản của khóa học và so sánh nội dung giữa hai phiên bản.</p>
      </header>
    </>
  );
}
