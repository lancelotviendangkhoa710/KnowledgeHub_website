import Link from 'next/link';
import { redirect } from 'next/navigation';
import { roadmapTemplates } from '@/data/roadmapTemplates';
import styles from './templates.module.css';

export default function RoadmapTemplatesPage({ searchParams }: { searchParams?: { mode?: string } }) {
  if (searchParams?.mode === 'ai') redirect('/ai/companion');

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.header}>
        <span className="badge">Curated learning paths</span>
        <h1>Roadmap Templates Library</h1>
        <p>Explore example paths by career and experience level. These templates are references, not plans personalized to your goals or schedule.</p>
        <div className={styles.actions}>
          <Link href="/ai/companion" className="btn btn-primary">Create Roadmap with AI</Link>
          <Link href="/learning/my-roadmaps" className="btn btn-secondary">My AI Roadmaps</Link>
        </div>
      </header>
      <div className={styles.grid}>
        {roadmapTemplates.map((template) => (
          <article className={styles.card} key={template.id}>
            <div className={styles.cardTop}><span className={styles.level}>{template.level}</span><span className={styles.duration}>{template.duration}</span></div>
            <h2>{template.role}</h2>
            <p>{template.summary}</p>
            <details>
              <summary>Explore template</summary>
              <ol>{template.stages.map((stage) => <li key={stage.title}><strong>{stage.title}</strong><span>{stage.description}</span></li>)}</ol>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
