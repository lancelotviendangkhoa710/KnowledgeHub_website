'use client';

import Link from 'next/link';
import { useState } from 'react';
import TopicBar from '@/components/profile/TopicBar';
import { roadmapTemplates, templateTopics } from '@/data/roadmapTemplates';
import styles from './templates.module.css';

const ROLES = Array.from(new Set(roadmapTemplates.map((t) => t.role)));

/** Lọc lộ trình mẫu theo nghề (chỉ ở phía trình duyệt) và hiện từng mẫu; các giai đoạn mở ra bằng "Xem lộ trình". */
export default function TemplateGrid() {
  const [role, setRole] = useState<string>('all');
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const shown = roadmapTemplates
    .filter((t) => role === 'all' || t.role === role)
    .filter((t) => !term || [t.role, t.level, ...t.stages.map((stage) => stage.title)].join(' ').toLowerCase().includes(term));

  return (
    <>
      <div className={styles.search}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm lộ trình theo nghề, cấp độ hoặc tên khóa học…"
          aria-label="Tìm lộ trình mẫu"
        />
      </div>
      <div className={styles.filters} role="group" aria-label="Lọc theo nghề">
        {['all', ...ROLES].map((r) => (
          <button key={r} type="button" className={styles.chip} aria-pressed={role === r} onClick={() => setRole(r)}>
            {r === 'all' ? 'Tất cả' : r}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className={styles.empty}>Không tìm thấy lộ trình mẫu nào khớp với “{query.trim()}”.</p>}
      <div className={styles.grid}>
        {shown.map((template) => (
          <article className={styles.card} key={template.id}>
            <div className={styles.pills}>
              <span className={styles.pill}>{template.level}</span>
              <span className={styles.pill}>{template.duration}</span>
            </div>
            <h3><Link href={`/learning/roadmaps/${encodeURIComponent(template.id)}`}>{template.role}</Link></h3>
            <p>{template.summary}</p>
            <TopicBar topics={templateTopics(template)} legend className={styles.topics} />
            <ol className={styles.steps} aria-label={`Các khóa học của ${template.role} ${template.level}`}>
              {template.stages.map((stage) => <li key={stage.courseSlug}>{stage.title}</li>)}
            </ol>
            <div className={styles.cardFoot}>
              <Link className={styles.more} href={`/learning/roadmaps/${encodeURIComponent(template.id)}`}>Xem chi tiết →</Link>
              <Link className={styles.useTemplate} href={`/learning/my-roadmaps/new?template=${encodeURIComponent(template.id)}`}>
                Dùng mẫu này
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
