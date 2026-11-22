import Link from 'next/link';
import { redirect } from 'next/navigation';
import TemplateGrid from './TemplateGrid';
import styles from './templates.module.css';

export default function RoadmapTemplatesPage({ searchParams }: { searchParams?: { mode?: string } }) {
  if (searchParams?.mode === 'ai') redirect('/ai/companion');

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div className={styles.row}>
          <div>
            <h1>Lộ trình mẫu</h1>
            <p>Các lộ trình tham khảo theo nghề và trình độ. Bạn có thể nhờ trợ lý AI chỉnh lại theo mục tiêu và thời gian của mình.</p>
          </div>
          <div className={styles.btns}>
            <Link href="/learning/my-roadmaps/new" className={styles.btn}>＋ Tạo lộ trình</Link>
            <Link href="/ai/companion" className={`${styles.btn} ${styles.btnGhost}`}>Tạo bằng AI</Link>
            <Link href="/learning/my-roadmaps" className={`${styles.btn} ${styles.btnGhost}`}>Lộ trình của tôi</Link>
          </div>
        </div>
      </header>
      <TemplateGrid />
    </div>
  );
}
