import Link from 'next/link';
import type { LearningRoadmap } from '@/types/learning';
import RoadmapRepoCard from './RoadmapRepoCard';
import { lastActivity } from './roadmapMeta';
import s from './profile.module.css';

type Props = {
  roadmaps: LearningRoadmap[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onShowAll: () => void;
};

export const FEATURED_LIMIT = 6;

/** Sáu lộ trình có hoạt động gần nhất. */
export function featured(roadmaps: LearningRoadmap[]): LearningRoadmap[] {
  return [...roadmaps]
    .sort((a, b) => Date.parse(lastActivity(b)) - Date.parse(lastActivity(a)))
    .slice(0, FEATURED_LIMIT);
}

/** RMR-04: khối "Lộ trình nổi bật" trên trang hồ sơ, có trạng thái đang tải, trống và lỗi. */
export default function FeaturedRoadmaps({ roadmaps, loading, error, onRetry, onShowAll }: Props) {
  const list = featured(roadmaps);

  return (
    <section className={s.block} aria-labelledby="featured-roadmaps">
      <div className={s.blockHead}>
        <h2 id="featured-roadmaps">Lộ trình nổi bật</h2>
        {roadmaps.length > FEATURED_LIMIT && (
          <button type="button" className={s.linkBtn} onClick={onShowAll}>Xem tất cả {roadmaps.length} lộ trình</button>
        )}
      </div>
      {loading ? (
        <p className={s.state} role="status">Đang tải lộ trình của bạn…</p>
      ) : error ? (
        <div className={s.errorBox} role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>Thử lại</button>
        </div>
      ) : list.length === 0 ? (
        <div className={s.emptyBox}>
          <p>Bạn chưa có lộ trình nào. Tạo lộ trình đầu tiên để theo dõi tiến độ học tập ở đây.</p>
          <div className={s.emptyActions}>
            <Link className={s.btn} href="/ai/companion">Tạo lộ trình</Link>
            <Link className={`${s.btn} ${s.btnGhost}`} href="/learning/roadmaps">Xem lộ trình mẫu</Link>
          </div>
        </div>
      ) : (
        <div className={s.grid}>
          {list.map((roadmap) => <RoadmapRepoCard key={roadmap.id} roadmap={roadmap} />)}
        </div>
      )}
    </section>
  );
}
