import type { RoadmapTopic } from '@/types/learning';
import { assignTopicSlots } from './roadmapMeta';
import s from './profile.module.css';

type Props = { topics: RoadmapTopic[]; legend?: boolean; className?: string };

/**
 * RMR-03: thanh nhiều màu theo tỉ lệ chủ đề của các bước (như thanh ngôn ngữ của GitHub).
 * Mỗi đoạn có tooltip (title); trình đọc màn hình đọc một câu tóm tắt thay cho màu.
 */
export default function TopicBar({ topics, legend = false, className }: Props) {
  const total = topics.reduce((sum, topic) => sum + topic.count, 0);
  const slots = assignTopicSlots(topics);
  const parts = topics.map((topic) => ({ ...topic, slot: slots.get(topic.category_slug) ?? 1, percent: total ? (topic.count / total) * 100 : 0 }));
  const summary = total
    ? `Chủ đề: ${parts.map((part) => `${part.name} ${Math.round(part.percent)}%`).join(', ')}`
    : 'Chưa có bước nào gắn với khóa học có chủ đề';

  return (
    <div className={className}>
      <div className={s.topicBar} role="img" aria-label={summary}>
        {total === 0
          ? <span className={`${s.seg} ${s.t_other}`} style={{ width: '100%' }} title="Chưa có chủ đề" />
          : parts.map((part) => (
            <span
              key={part.category_slug}
              className={`${s.seg} ${s[`c${part.slot}`]}`}
              style={{ width: `${part.percent}%` }}
              title={`${part.name}: ${part.count} bước (${Math.round(part.percent)}%)`}
            />
          ))}
      </div>
      {legend && total > 0 && (
        <ul className={s.legend} aria-hidden="true">
          {parts.map((part) => (
            <li key={part.category_slug}>
              <i className={`${s.dot} ${s[`c${part.slot}`]}`} />
              <b>{part.name}</b> {Math.round(part.percent)}%
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
