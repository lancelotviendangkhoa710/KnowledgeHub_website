'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import Select from '@/components/ui/Select';
import type { LearningRoadmap, RoadmapStatus } from '@/types/learning';
import RoadmapRepoCard from './RoadmapRepoCard';
import { lastActivity, progressPercent, STATUS_LABELS } from './roadmapMeta';
import s from './profile.module.css';

type Sort = 'recent' | 'name' | 'progress';

type Props = {
  roadmaps: LearningRoadmap[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}

const collator = new Intl.Collator('vi');

/** RMR-05: tab "Lộ trình": tìm theo tên, lọc trạng thái, lọc chủ đề, sắp xếp. */
export default function RoadmapsTab({ roadmaps, loading, error, onRetry }: Props) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'' | RoadmapStatus>('');
  const [topic, setTopic] = useState('');
  const [sort, setSort] = useState<Sort>('recent');

  const topicOptions = useMemo(() => {
    const names = new Map<string, string>();
    roadmaps.forEach((roadmap) => (roadmap.topics ?? []).forEach((entry) => names.set(entry.category_slug, entry.name)));
    return [...names.entries()].sort((a, b) => collator.compare(a[1], b[1])).map(([value, label]) => ({ value, label }));
  }, [roadmaps]);

  const shown = useMemo(() => {
    const q = normalize(query.trim());
    const list = roadmaps.filter((roadmap) =>
      (!q || normalize(roadmap.title).includes(q))
      && (!status || roadmap.status === status)
      && (!topic || (roadmap.topics ?? []).some((entry) => entry.category_slug === topic)));
    return list.sort((a, b) => {
      if (sort === 'name') return collator.compare(a.title, b.title);
      if (sort === 'progress') return progressPercent(b) - progressPercent(a) || collator.compare(a.title, b.title);
      return Date.parse(lastActivity(b)) - Date.parse(lastActivity(a));
    });
  }, [roadmaps, query, status, topic, sort]);

  const filtered = Boolean(query.trim() || status || topic);

  return (
    <section className={s.block} aria-labelledby="all-roadmaps">
      <div className={s.blockHead}>
        <h2 id="all-roadmaps">Tất cả lộ trình</h2>
        <Link className={`${s.btn} ${s.btnSm}`} href="/ai/companion">Tạo lộ trình</Link>
      </div>
      <div className={s.tools}>
        <label className={s.search}>
          <span className={s.sr}>Tìm lộ trình theo tên</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm lộ trình…" />
        </label>
        <Select
          compact
          className={s.filter}
          ariaLabel="Lọc theo trạng thái"
          value={status}
          onChange={(value) => setStatus(value as '' | RoadmapStatus)}
          options={[{ value: '', label: 'Mọi trạng thái' }, ...(Object.keys(STATUS_LABELS) as RoadmapStatus[]).map((value) => ({ value, label: STATUS_LABELS[value] }))]}
        />
        <Select
          compact
          className={s.filter}
          ariaLabel="Lọc theo chủ đề"
          value={topic}
          onChange={setTopic}
          options={[{ value: '', label: 'Mọi chủ đề' }, ...topicOptions]}
        />
        <Select
          compact
          className={s.filter}
          ariaLabel="Sắp xếp"
          value={sort}
          onChange={(value) => setSort(value as Sort)}
          options={[
            { value: 'recent', label: 'Cập nhật gần nhất' },
            { value: 'name', label: 'Tên' },
            { value: 'progress', label: 'Tiến độ' },
          ]}
        />
      </div>

      {loading ? (
        <p className={s.state} role="status">Đang tải lộ trình của bạn…</p>
      ) : error ? (
        <div className={s.errorBox} role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>Thử lại</button>
        </div>
      ) : roadmaps.length === 0 ? (
        <div className={s.emptyBox}>
          <p>Bạn chưa có lộ trình nào.</p>
          <div className={s.emptyActions}>
            <Link className={s.btn} href="/ai/companion">Tạo lộ trình</Link>
            <Link className={`${s.btn} ${s.btnGhost}`} href="/learning/roadmaps">Xem lộ trình mẫu</Link>
          </div>
        </div>
      ) : (
        <>
          <p className={s.count} role="status">
            {filtered ? `Hiển thị ${shown.length} trên ${roadmaps.length} lộ trình` : `${roadmaps.length} lộ trình`}
          </p>
          {shown.length === 0 ? (
            <div className={s.emptyBox}>
              <p>Không có lộ trình nào khớp bộ lọc.</p>
              <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => { setQuery(''); setStatus(''); setTopic(''); }}>Xóa bộ lọc</button>
            </div>
          ) : (
            <ul className={s.repoList}>
              {shown.map((roadmap) => <li key={roadmap.id}><RoadmapRepoCard roadmap={roadmap} /></li>)}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
