'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import TopicBar from '@/components/profile/TopicBar';
import { assignTopicSlots } from '@/components/profile/roadmapMeta';
import p from '@/components/profile/profile.module.css';
import { roadmapTemplates, templateTopics } from '@/data/roadmapTemplates';
import styles from './templates.module.css';


type Topic = { category_slug: string; name: string; count: number };

/** Thanh chủ đề + chú thích một dòng (tối đa 2 chủ đề, phần còn lại gộp "+n") để mọi thẻ cao bằng nhau. */
function TemplateTopics({ topics }: { topics: Topic[] }) {
  const total = topics.reduce((sum, topic) => sum + topic.count, 0);
  const slots = assignTopicSlots(topics);
  const shown = topics.slice(0, 2);
  const rest = topics.length - shown.length;
  return (
    <div className={styles.topics}>
      <TopicBar topics={topics} />
      <p className={styles.legendRow}>
        {shown.map((topic) => (
          <span key={topic.category_slug}>
            <i className={`${p.dot} ${p[`c${slots.get(topic.category_slug) ?? 1}`]}`} aria-hidden="true" />
            {topic.name} <small>{Math.round((topic.count / total) * 100)}%</small>
          </span>
        ))}
        {rest > 0 && <span title={topics.slice(2).map((topic) => topic.name).join(', ')}>+{rest}</span>}
      </p>
    </div>
  );
}

/** Tìm lộ trình mẫu (lọc ngay ở phía trình duyệt), hiện mỗi mẫu một thẻ. */
export default function TemplateGrid() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const term = query.trim().toLowerCase();
  const shown = roadmapTemplates
    .filter((t) => !term || [t.role, t.level, ...t.stages.map((stage) => stage.title)].join(' ').toLowerCase().includes(term));

  return (
    <>
      {/* Thanh công cụ như trang Pull requests của GitHub: ô tìm kiếm rộng có nút xóa + nút kính lúp, hành động chính bên phải. */}
      <div className={styles.toolbar}>
        <form role="search" className={styles.searchBox} onSubmit={(event) => { event.preventDefault(); inputRef.current?.focus(); }}>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Escape') setQuery(''); }}
            placeholder="Tìm theo nghề, cấp độ hoặc khóa học…"
            aria-label="Tìm lộ trình mẫu"
          />
          {query && (
            <button type="button" className={styles.clearBtn} onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Xóa từ khóa">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor" /><path d="M5.5 5.5l5 5m0-5l-5 5" stroke="var(--surface)" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          )}
          <button type="submit" className={styles.searchBtn} aria-label="Tìm">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </form>
        <div className={styles.actions}>
          <Link href="/ai/companion" className={`${styles.btn} ${styles.btnGhost}`}>Tạo bằng AI</Link>
          <Link href="/learning/my-roadmaps/new" className={styles.btn}>＋ Tạo lộ trình</Link>
        </div>
      </div>
      <p className={styles.count} aria-live="polite">{shown.length} lộ trình mẫu</p>
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
            <TemplateTopics topics={templateTopics(template)} />
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
