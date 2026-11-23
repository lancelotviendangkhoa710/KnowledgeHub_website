import Link from 'next/link';
import Select from '@/components/ui/Select';
import type { LearningRoadmap, RoadmapItem, RoadmapItemStatus } from '@/types/learning';
import { fullDateTime, importanceTier, relativeTime } from './roadmapMeta';
import s from './roadmapDetail.module.css';

const ITEM_LABELS: Record<RoadmapItemStatus, string> = {
  pending: 'Chưa bắt đầu',
  in_progress: 'Đang học',
  completed: 'Đã xong',
  skipped: 'Đã bỏ qua',
};

/** Đường dẫn khóa học của một bước: ưu tiên link AI đã kiểm tra còn xuất bản. */
export function lessonLink(item: RoadmapItem): { href: string; title: string } | null {
  const course = item.ai_details?.course;
  if (course?.url) return { href: course.url, title: course.title || 'Mở khóa học' };
  // `article_title` chỉ có khi khóa học đang xuất bản; không có thì không tạo link (tránh trang lỗi).
  if (item.article_id && item.article_title) {
    return { href: `/courses/${encodeURIComponent(item.article_id)}`, title: item.article_title || 'Mở khóa học' };
  }
  return null;
}

function StatusIcon({ status }: { status: RoadmapItemStatus }) {
  return (
    <span className={`${s.icon} ${s[`i_${status}`]}`} aria-hidden="true">
      {status === 'completed' && <svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></svg>}
      {status === 'skipped' && <svg viewBox="0 0 24 24"><path d="M6 12h12" /></svg>}
    </span>
  );
}

const PROGRESS_OPTIONS = (Object.keys(ITEM_LABELS) as RoadmapItemStatus[]).map((value) => ({ value, label: ITEM_LABELS[value] }));

type Props = {
  roadmap: LearningRoadmap;
  /** Có giá trị khi người xem là chủ lộ trình: hiện ô chọn tiến độ cho từng bước. */
  onProgress?: (item: RoadmapItem, next: RoadmapItemStatus) => void;
  busyId?: string | null;
};

/** RMR-06, tab "Các bước": danh sách như danh sách tệp của repo; chủ lộ trình cập nhật tiến độ ngay tại đây. */
export default function RoadmapSteps({ roadmap, onProgress, busyId = null }: Props) {
  const items = [...roadmap.items].sort((a, b) => a.position - b.position);
  if (items.length === 0) return <p className={s.empty}>Lộ trình này chưa có bước nào.</p>;

  return (
    <ol className={s.files}>
      {items.map((item) => {
        const lesson = lessonLink(item);
        return (
          <li key={item.id} className={s.file}>
            <StatusIcon status={item.status} />
            <div className={s.fileMain}>
              <span className={s.fileTitle}><span className={s.sr}>{ITEM_LABELS[item.status]}: </span>{item.title}</span>
              {lesson && <Link className={s.fileLink} href={lesson.href}>{lesson.title}</Link>}
              {item.note && <p className={s.fileNote}>{item.note}</p>}
              {(item.importance != null || item.study_hours != null) && (
                <span className={s.fileFacts}>
                  {item.importance != null && (
                    <span className={`${s.tier} ${s[`tier_${importanceTier(item.importance).tone}`]}`}>
                      {item.importance}/100 · {importanceTier(item.importance).label}
                    </span>
                  )}
                  {item.study_hours != null && <span>{item.study_hours} giờ</span>}
                </span>
              )}
            </div>
            <span className={s.fileWhen}>
              {onProgress ? (
                <Select
                  portal
                  compact
                  small
                  className={s.progressSelect}
                  ariaLabel={`Tiến độ của ${item.title}`}
                  value={item.status}
                  disabled={busyId !== null}
                  onChange={(value) => onProgress(item, value as RoadmapItemStatus)}
                  options={PROGRESS_OPTIONS}
                />
              ) : null}
              {item.status === 'completed' && item.completed_at
                ? <time dateTime={item.completed_at} title={fullDateTime(item.completed_at)}>Hoàn thành {relativeTime(item.completed_at)}</time>
                : !onProgress && ITEM_LABELS[item.status]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
