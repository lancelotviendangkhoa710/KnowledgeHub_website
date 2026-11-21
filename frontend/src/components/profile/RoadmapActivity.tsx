import type { LearningRoadmap } from '@/types/learning';
import { vnDateKey } from './roadmapMeta';
import s from './roadmapDetail.module.css';

const dayTitle = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
/** "Thứ Năm, 19/11/2026" → "Thứ năm, 19/11/2026" như mockup. */
export function dayLabel(date: Date): string {
  const text = dayTitle.format(date);
  return text.charAt(0) + text.slice(1).toLocaleLowerCase('vi');
}
const clock =new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });

/** RMR-06, tab "Hoạt động": các lần hoàn thành bước, nhóm theo ngày (giờ Việt Nam) như danh sách commit. */
export default function RoadmapActivity({ roadmap }: { roadmap: LearningRoadmap }) {
  const done = roadmap.items
    .filter((item) => item.status === 'completed' && item.completed_at)
    .sort((a, b) => Date.parse(b.completed_at as string) - Date.parse(a.completed_at as string));

  if (done.length === 0) {
    return <p className={s.empty}>Chưa hoàn thành bước nào. Khi bạn đánh dấu một bước là đã xong, hoạt động sẽ hiện ở đây.</p>;
  }

  const groups = new Map<string, typeof done>();
  done.forEach((item) => {
    const key = vnDateKey(item.completed_at as string);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });

  return (
    <div className={s.commits}>
      {[...groups.entries()].map(([key, items]) => (
        <section key={key} className={s.day}>
          <h3>{dayLabel(new Date(items[0].completed_at as string))}</h3>
          <ul className={s.commitList}>
            {items.map((item) => (
              <li key={item.id}>
                <span>Hoàn thành bước <b>{item.title}</b></span>
                <time dateTime={item.completed_at as string}>{clock.format(new Date(item.completed_at as string))}</time>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
