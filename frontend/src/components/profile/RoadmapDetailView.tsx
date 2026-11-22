'use client';

import Link from 'next/link';
import type { LearningRoadmap } from '@/types/learning';
import RoadmapActivity from './RoadmapActivity';
import RoadmapSteps from './RoadmapSteps';
import Tabs, { useTabParam } from './Tabs';
import TopicBar from './TopicBar';
import { completedCount, fullDateTime, itemsCount, lastActivity, formatHours, LEVEL_LABELS, progressPercent, relativeTime, STATUS_LABELS } from './roadmapMeta';
import p from './profile.module.css';
import s from './roadmapDetail.module.css';

const TAB_IDS = ['overview', 'steps', 'activity'] as const;
type DetailTab = (typeof TAB_IDS)[number];

/** RMR-06: trang chi tiết lộ trình kiểu trang repo. Chỉ đọc; cập nhật tiến độ vẫn ở trang Lộ trình của tôi. */
export default function RoadmapDetailView({ roadmap }: { roadmap: LearningRoadmap }) {
  const [tab, setTab] = useTabParam<DetailTab>(TAB_IDS, 'overview');
  const doneCount = roadmap.items.filter((item) => item.status === 'completed' && item.completed_at).length;
  const updated = lastActivity(roadmap);
  const totalHours = roadmap.items.reduce((sum, item) => sum + (item.study_hours ?? 0), 0);

  return (
    <div className={s.wrap}>
      <nav className={s.crumbs} aria-label="Đường dẫn">
        <Link href="/account?tab=roadmaps">Hồ sơ</Link>
        <span aria-hidden="true">/</span>
        <Link href="/learning/my-roadmaps">Lộ trình của tôi</Link>
      </nav>
      <header className={s.head}>
        <div className={s.titleRow}>
          <h1>{roadmap.title}</h1>
          <span className={`${p.badge} ${p[`st_${roadmap.status}`]}`}>{STATUS_LABELS[roadmap.status]}</span>
          {roadmap.origin === 'ai' && <span className={`${p.badge} ${p.ai}`}>AI tạo</span>}
          {roadmap.level && <span className={`${p.badge} ${s.levelBadge}`}>{LEVEL_LABELS[roadmap.level]}</span>}
        </div>
        <p className={s.meta}>
          <span>{completedCount(roadmap)}/{itemsCount(roadmap)} bước · {progressPercent(roadmap)}%</span>
          {roadmap.duration_weeks ? <span>Dự kiến {roadmap.duration_weeks} tuần</span> : null}
          {totalHours > 0 && <span>{formatHours(totalHours)} giờ học</span>}
          {updated && <span title={fullDateTime(updated)}>Cập nhật {relativeTime(updated)}</span>}
          <span>Tạo ngày {new Date(roadmap.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })}</span>
        </p>
        <div className={s.actions}>
          <Link className={`${p.btn} ${p.btnSm}`} href={`/learning/my-roadmaps/${encodeURIComponent(roadmap.id)}/edit`}>Chỉnh sửa</Link>
          <Link className={`${p.btn} ${p.btnGhost} ${p.btnSm}`} href={`/learning/my-roadmaps#${encodeURIComponent(roadmap.id)}`}>Cập nhật tiến độ</Link>
        </div>
      </header>

      <Tabs<DetailTab>
        label="Nội dung lộ trình"
        idPrefix="roadmap"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Tổng quan' },
          { id: 'steps', label: 'Các bước', count: itemsCount(roadmap) },
          { id: 'activity', label: 'Hoạt động', count: doneCount },
        ]}
      />

      <div role="tabpanel" id="roadmap-panel-overview" aria-labelledby="roadmap-tab-overview" tabIndex={0} hidden={tab !== 'overview'} className={p.panel}>
        <article className={s.readme}>
          <h2>Mục tiêu</h2>
          <p className={s.prose}>{roadmap.goal}</p>
          {roadmap.ai_summary && (
            <>
              <h2>Tóm tắt từ trợ lý AI</h2>
              <p className={s.prose}>{roadmap.ai_summary}</p>
            </>
          )}
          <h2>Chủ đề</h2>
          <TopicBar topics={roadmap.topics ?? []} legend />
          {(roadmap.topics ?? []).length === 0 && <p className={s.note}>Các bước chưa gắn với khóa học nào nên chưa xác định được chủ đề.</p>}
          <h2>Tiến độ</h2>
          <div className={s.progress} aria-hidden="true"><b style={{ width: `${progressPercent(roadmap)}%` }} /></div>
          <p className={s.note}>Đã xong {completedCount(roadmap)} trên {itemsCount(roadmap)} bước ({progressPercent(roadmap)}%).</p>
        </article>
      </div>
      <div role="tabpanel" id="roadmap-panel-steps" aria-labelledby="roadmap-tab-steps" tabIndex={0} hidden={tab !== 'steps'} className={p.panel}>
        <RoadmapSteps roadmap={roadmap} />
      </div>
      <div role="tabpanel" id="roadmap-panel-activity" aria-labelledby="roadmap-tab-activity" tabIndex={0} hidden={tab !== 'activity'} className={p.panel}>
        <RoadmapActivity roadmap={roadmap} />
      </div>
    </div>
  );
}
