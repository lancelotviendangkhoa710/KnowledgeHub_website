'use client';

import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { LearningRoadmap, RoadmapStatus } from '@/types/learning';
import s from './roadmapCard.module.css';

type Props = {
  roadmap: LearningRoadmap;
  onDelete: () => void;
  deleting: boolean;
};

const statusLabels: Record<RoadmapStatus, string> = {
  active: 'Đang theo dõi',
  paused: 'Tạm dừng',
  completed: 'Hoàn thành',
  archived: 'Lưu trữ',
};

/**
 * Thẻ tóm tắt một lộ trình ở trang "Lộ trình của tôi". "Mở lộ trình" chuyển sang trang chi tiết
 * (/learning/my-roadmaps/<id>), nơi xem các bước và cập nhật tiến độ; sửa nội dung ở trang chỉnh sửa.
 */
export default function RoadmapCard({ roadmap, onDelete, deleting }: Props) {
  const isAiRoadmap = roadmap.origin === 'ai';
  const href = `/learning/my-roadmaps/${encodeURIComponent(roadmap.id)}`;
  const completedCount = roadmap.items.filter((item) => item.status === 'completed').length;
  const percent = roadmap.items.length ? Math.round((completedCount / roadmap.items.length) * 100) : 0;

  return (
    <article id={roadmap.id} className={s.panel}>
      <div className={s.top}>
        <div className={s.info}>
          <h2><Link href={href} className={s.titleLink}>{roadmap.title}</Link></h2>
          <p className={s.muted}>{roadmap.goal}</p>
          {isAiRoadmap && roadmap.ai_summary && <p className={s.muted}>{roadmap.ai_summary}</p>}
          {isAiRoadmap && roadmap.coverage && (
            <p className={s.match}>
              Độ phù hợp {Math.round(roadmap.coverage.overall_percent)}% · Khóa học trong hệ thống {Math.round(roadmap.coverage.internal_percent)}% · Tài nguyên bên ngoài {Math.round(roadmap.coverage.external_percent)}% · Còn thiếu {roadmap.coverage.gaps.length} kỹ năng
            </p>
          )}
          <div className={s.bar} aria-hidden="true"><b style={{ width: `${percent}%` }} /></div>
          <p className={s.count}>
            {completedCount} trên {roadmap.items.length} bước đã xong · {statusLabels[roadmap.status]}
          </p>
          {roadmap.user_id !== getCurrentUser()?.id && (
            <p className={s.small}>Thuộc tài khoản khác · ID {roadmap.user_id}</p>
          )}
        </div>
        <div className={s.side}>
          {isAiRoadmap && (
            <span className={s.aiBadge} title="Lộ trình do trợ lý AI tạo">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 1.5l1.4 3.6 3.6 1.4-3.6 1.4L8 11.5 6.6 7.9 3 6.5l3.6-1.4L8 1.5zM12.5 10.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4z" fill="currentColor" /></svg>
              AI<span className={s.srOnly}> — do trợ lý AI tạo</span>
            </span>
          )}
          <div className={s.actions}>
            <Link className={s.btn} href={href}>Mở lộ trình</Link>
            <button type="button" className={`${s.btn} ${s.btnGhost}`} disabled={deleting} onClick={onDelete}>
              {deleting ? 'Đang xóa…' : 'Xóa'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
