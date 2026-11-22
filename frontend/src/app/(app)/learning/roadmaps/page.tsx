import Link from 'next/link';
import { redirect } from 'next/navigation';
import TemplateGrid from './TemplateGrid';
import styles from './templates.module.css';

export default function RoadmapTemplatesPage({ searchParams }: { searchParams?: { mode?: string } }) {
  if (searchParams?.mode === 'ai') redirect('/ai/companion');

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div className={styles.titleRow}>
          <h1>Lộ trình mẫu</h1>
          <Link href="/learning/my-roadmaps" className={styles.myLink}>Lộ trình của tôi →</Link>
        </div>
        <p>Lộ trình theo nghề và cấp độ, dựng từ các khóa học đang có. Chọn một mẫu rồi chỉnh theo mục tiêu của bạn.</p>
      </header>
      <TemplateGrid />
    </div>
  );
}
