'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { activityClient, type ActivityEntry } from '@/lib/activityClient';
import { longDate } from './heatmapDates';
import { vnDateKey } from './roadmapMeta';
import s from './history.module.css';

type Props = { userId: string; date: string | null; onClearDate: () => void };

const monthTitle = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
const clock = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
/** "19/11, 08:17" theo giờ Việt Nam. */
const stamp = {
  format: (date: Date) => {
    const key = vnDateKey(date.getTime());
    return `${key.slice(8, 10)}/${key.slice(5, 7)}, ${clock.format(date)}`;
  },
};

/** "tháng 11 năm 2026" → "Tháng 11 năm 2026". */
function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase('vi') + text.slice(1);
}

/**
 * PRF-09: "Lịch sử hoạt động" dạng dòng thời gian theo tháng (như Contribution activity của GitHub).
 * Bấm một ô của bảng hoạt động thì chỉ hiện ngày đó; "Xem thêm" tải trang tiếp theo.
 */
export default function ActivityHistory({ userId, date, onClearDate }: Props) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'loading' | 'more' | 'ready' | 'error'>('loading');
  const ticket = useRef(0);

  async function fetchPage(next: number, replace: boolean) {
    const mine = ++ticket.current; // a filter change while loading makes older answers stale
    setStatus(replace ? 'loading' : 'more');
    try {
      const result = await activityClient.recent(next, date ?? undefined);
      if (mine !== ticket.current) return;
      setEntries((current) => (replace ? result.data : [...current, ...result.data]));
      setPage(result.meta.current_page);
      setLastPage(result.meta.last_page);
      setTotal(result.meta.total);
      setStatus('ready');
    } catch {
      if (mine === ticket.current) setStatus('error');
    }
  }

  useEffect(() => {
    void fetchPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, userId]);

  const groups: { key: string; title: string; items: ActivityEntry[] }[] = [];
  entries.forEach((entry) => {
    const key = vnDateKey(entry.completed_at).slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(entry);
    else groups.push({ key, title: capitalize(monthTitle.format(new Date(entry.completed_at))), items: [entry] });
  });

  return (
    <section className={s.history} aria-labelledby="history-title">
      <div className={s.head}>
        <h2 id="history-title">Lịch sử hoạt động</h2>
        {date && (
          <p className={s.filter}>
            <span>Đang xem ngày {longDate(date)}</span>
            <button type="button" onClick={onClearDate}>Xem tất cả</button>
          </p>
        )}
      </div>

      {status === 'loading' ? (
        <p className={s.state} role="status">Đang tải lịch sử…</p>
      ) : status === 'error' && entries.length === 0 ? (
        <div className={s.error} role="alert">
          <span>Không tải được lịch sử hoạt động.</span>
          <button type="button" onClick={() => void fetchPage(1, true)}>Thử lại</button>
        </div>
      ) : entries.length === 0 ? (
        <p className={s.state}>{date ? 'Ngày này bạn chưa hoàn thành bước nào.' : 'Chưa có hoạt động nào. Các bước bạn hoàn thành sẽ hiện ở đây.'}</p>
      ) : (
        <>
          {groups.map((group) => (
            <div key={group.key} className={s.month}>
              <h3>{group.title}</h3>
              <ol className={s.timeline}>
                {group.items.map((entry) => (
                  <li key={`${entry.item_id}-${entry.completed_at}`}>
                    <span className={s.mark} aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></svg>
                    </span>
                    <div className={s.text}>
                      <p>Hoàn thành bước <b>{entry.item_title}</b></p>
                      <p className={s.sub}>
                        Lộ trình <Link href={`/learning/my-roadmaps/${encodeURIComponent(entry.roadmap_id)}`}>{entry.roadmap_title}</Link>
                        {entry.article_id && entry.article_title && <> · Bài học <Link href={`/courses/${encodeURIComponent(entry.article_id)}`}>{entry.article_title}</Link></>}
                      </p>
                    </div>
                    <time dateTime={entry.completed_at}>{stamp.format(new Date(entry.completed_at))}</time>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <div className={s.more}>
            {page < lastPage ? (
              <button type="button" className={s.moreBtn} onClick={() => void fetchPage(page + 1, false)} disabled={status === 'more'}>
                {status === 'more' ? 'Đang tải…' : `Xem thêm (${total - entries.length})`}
              </button>
            ) : (
              <span className={s.end}>{total} hoạt động{date ? ' trong ngày này' : ''}</span>
            )}
            {status === 'error' && <span className={s.inlineError} role="alert">Không tải thêm được. Hãy thử lại.</span>}
          </div>
        </>
      )}
    </section>
  );
}
