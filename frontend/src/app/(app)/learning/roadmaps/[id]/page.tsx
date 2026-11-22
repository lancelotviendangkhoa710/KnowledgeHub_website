import Link from 'next/link';
import { notFound } from 'next/navigation';
import TopicBar from '@/components/profile/TopicBar';
import { findTemplate, roadmapTemplates, templateTopics } from '@/data/roadmapTemplates';
import styles from '../templates.module.css';

export function generateStaticParams() {
  return roadmapTemplates.map((template) => ({ id: template.id }));
}

/** LRN-FE-01: chi tiết một lộ trình mẫu. Dữ liệu tĩnh trong data/roadmapTemplates.ts, mỗi bước là một khóa học thật. */
export default function RoadmapTemplatePage({ params }: { params: { id: string } }) {
  const template = findTemplate(params.id);
  if (!template) notFound();

  return (
    <div className={styles.wrap}>
      <nav className={styles.crumbs} aria-label="Đường dẫn">
        <Link href="/learning/roadmaps">Lộ trình mẫu</Link>
        <span aria-hidden="true">/</span>
        <span>{template.role} — {template.level}</span>
      </nav>
      <header className={styles.detailHead}>
        <div>
          <div className={styles.pills}>
            <span className={styles.pill}>{template.level}</span>
            <span className={styles.pill}>{template.duration}</span>
          </div>
          <h1>{template.role}</h1>
          <p>{template.summary}</p>
        </div>
        <Link className={styles.btn} href={`/learning/my-roadmaps/new?template=${encodeURIComponent(template.id)}`}>Dùng mẫu này</Link>
      </header>
      <section className={styles.detailCard} aria-labelledby="tpl-topics">
        <h2 id="tpl-topics">Chủ đề</h2>
        <TopicBar topics={templateTopics(template)} legend />
      </section>
      <section className={styles.detailCard} aria-labelledby="tpl-steps">
        <h2 id="tpl-steps">Các khóa học theo thứ tự</h2>
        <ol className={styles.detailSteps}>
          {template.stages.map((stage, index) => (
            <li key={stage.courseSlug}>
              <span className={styles.stepNo} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <Link href={`/courses/${encodeURIComponent(stage.courseSlug)}`}><strong>{stage.title}</strong></Link>
                <small>{stage.category.name}</small>
                <p>{stage.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
