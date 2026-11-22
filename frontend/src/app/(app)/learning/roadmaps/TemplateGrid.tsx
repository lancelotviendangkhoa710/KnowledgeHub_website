'use client';

import Link from 'next/link';
import { useState } from 'react';
import { roadmapTemplates } from '@/data/roadmapTemplates';
import styles from './templates.module.css';

const ROLES = Array.from(new Set(roadmapTemplates.map((t) => t.role)));

/** Lọc lộ trình mẫu theo nghề (chỉ ở phía trình duyệt) và hiện từng mẫu; các giai đoạn mở ra bằng "Xem lộ trình". */
export default function TemplateGrid() {
  const [role, setRole] = useState<string>('all');
  const shown = roadmapTemplates.filter((t) => role === 'all' || t.role === role);

  return (
    <>
      <div className={styles.filters} role="group" aria-label="Lọc theo nghề">
        {['all', ...ROLES].map((r) => (
          <button key={r} type="button" className={styles.chip} aria-pressed={role === r} onClick={() => setRole(r)}>
            {r === 'all' ? 'Tất cả' : r}
          </button>
        ))}
      </div>
      <div className={styles.grid}>
        {shown.map((template) => (
          <article className={styles.card} key={template.id}>
            <div className={styles.pills}>
              <span className={styles.pill}>{template.level}</span>
              <span className={styles.pill}>{template.duration}</span>
            </div>
            <h3>{template.role}</h3>
            <p>{template.summary}</p>
            <details>
              <summary>Xem lộ trình</summary>
              <ol>
                {template.stages.map((stage) => (
                  <li key={stage.courseSlug}>
                    <Link href={`/courses/${encodeURIComponent(stage.courseSlug)}`}><strong>{stage.title}</strong></Link>
                    <span>{stage.description}</span>
                  </li>
                ))}
              </ol>
            </details>
          </article>
        ))}
      </div>
      <p className={styles.notice}>Đây là lộ trình tham khảo, chưa được cá nhân hóa theo mục tiêu hay lịch học của bạn.</p>
    </>
  );
}
