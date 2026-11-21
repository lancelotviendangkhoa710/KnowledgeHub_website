import Link from 'next/link';
import type { LearningRoadmap } from '@/types/learning';
import TopicBar from './TopicBar';
import { completedCount, fullDateTime, itemsCount, lastActivity, relativeTime, STATUS_LABELS, topicTone } from './roadmapMeta';
import s from './profile.module.css';

type Props = { roadmap: LearningRoadmap; headingLevel?: 'h3' | 'h4' };

/**
 * RMR-02: thẻ lộ trình kiểu thẻ repo của GitHub. Tên dẫn tới trang chi tiết, nhãn trạng thái,
 * nhãn "AI tạo", mô tả hai dòng, thanh chủ đề và dòng meta (chủ đề chính, số bước, cập nhật).
 * Khác `components/learning/RoadmapCard` (thẻ chỉnh sửa ở trang Lộ trình của tôi).
 */
export default function RoadmapRepoCard({ roadmap, headingLevel = 'h3' }: Props) {
  const Heading = headingLevel;
  const description = (roadmap.origin === 'ai' && roadmap.ai_summary) || roadmap.goal;
  const topics = roadmap.topics ?? [];
  const main = topics[0];
  const updated = lastActivity(roadmap);

  return (
    <article className={s.repo}>
      <div className={s.repoHead}>
        <Heading className={s.repoTitle}>
          <Link href={`/learning/my-roadmaps/${encodeURIComponent(roadmap.id)}`}>{roadmap.title}</Link>
        </Heading>
        <span className={`${s.badge} ${s[`st_${roadmap.status}`]}`}>{STATUS_LABELS[roadmap.status]}</span>
        {roadmap.origin === 'ai' && <span className={`${s.badge} ${s.ai}`}>AI tạo</span>}
      </div>
      {description && <p className={s.repoDesc}>{description}</p>}
      <TopicBar topics={topics} className={s.repoBar} />
      <p className={s.repoMeta}>
        {main && (
          <span className={s.metaTopic}>
            <i className={`${s.dot} ${s[`t_${topicTone(main)}`]}`} aria-hidden="true" />
            {main.name}
          </span>
        )}
        <span>{completedCount(roadmap)}/{itemsCount(roadmap)} bước</span>
        {updated && <span title={fullDateTime(updated)}>Cập nhật {relativeTime(updated)}</span>}
      </p>
    </article>
  );
}
