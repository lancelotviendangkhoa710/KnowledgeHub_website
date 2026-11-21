'use client';

import Link from 'next/link';
import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { activityClient } from '@/lib/activityClient';
import { addDays, daysBetween, level, longDate, mondayIndex, rangeFor, RangeMode, shortDate, streaks, todayKey } from './heatmapDates';
import s from './heatmap.module.css';

type Props = {
  userId: string;
  selected: string | null;
  onSelect: (date: string | null) => void;
  /** Tab chứa bảng đang hiện; dùng để cuộn tới tuần mới nhất khi bảng hiện lần đầu. */
  visible?: boolean;
};

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; counts: Map<string, number> };

const MODES: RangeMode[] = ['rolling', 'this-year', 'last-year'];

/**
 * PRF-08: bảng "Hoạt động học tập" theo mockup #tai-khoan, vẽ bằng HTML và CSS thuần.
 * Cột là tuần, hàng đầu là Thứ hai. Đi giữa các ô bằng mũi tên; bấm ô để lọc Lịch sử hoạt động theo ngày đó.
 */
export default function ActivityHeatmap({ userId, selected, onSelect, visible = true }: Props) {
  const [today] = useState(() => todayKey());
  const [mode, setMode] = useState<RangeMode>('rolling');
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [tip, setTip] = useState<{ text: string; count: number; x: number; y: number } | null>(null);
  const cache = useRef(new Map<string, Map<string, number>>());
  const scroller = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());

  const range = useMemo(() => rangeFor(mode, today), [mode, today]);
  const days = useMemo(() => daysBetween(range.from, range.to), [range]);
  const lead = mondayIndex(range.from);
  const currentYear = Number(today.slice(0, 4));

  useEffect(() => { cache.current.clear(); }, [userId]);

  useEffect(() => {
    let active = true;
    const key = `${range.from}:${range.to}`;
    const hit = cache.current.get(key);
    if (hit) {
      setLoad({ status: 'ready', counts: hit });
      return;
    }
    setLoad({ status: 'loading' });
    activityClient.daily(range.from, range.to).then((result) => {
      const counts = new Map(result.data.map((day) => [day.date, day.count]));
      cache.current.set(key, counts);
      if (active) setLoad({ status: 'ready', counts });
    }).catch(() => { if (active) setLoad({ status: 'error' }); });
    return () => { active = false; };
  }, [range, attempt, userId]);

  const counts = useMemo(() => (load.status === 'ready' ? load.counts : new Map<string, number>()), [load]);
  const total = days.reduce((sum, key) => sum + (counts.get(key) ?? 0), 0);
  const activeDays = days.filter((key) => (counts.get(key) ?? 0) > 0).length;
  const streak = streaks(days, counts, today);

  // Mới nhất nằm bên phải: trên điện thoại cuộn tới tuần gần nhất (năm trước thì về đầu năm).
  // Chỉ cuộn khi bảng đang hiện (panel ẩn không có bố cục để cuộn), và một lần cho mỗi khoảng đã tải,
  // nên quay lại tab vẫn giữ vị trí người dùng đã cuộn.
  const positioned = useRef<string | null>(null);
  useEffect(() => {
    const el = scroller.current;
    const key = `${mode}:${load.status}`;
    if (!el || !visible || positioned.current === key || el.clientWidth === 0) return;
    el.scrollLeft = mode === 'last-year' ? 0 : el.scrollWidth;
    positioned.current = key;
  }, [mode, load.status, visible]);

  // Ô nhận Tab: ô đang chọn trong khoảng, nếu không thì ngày cuối của khoảng.
  const tabKey = focusKey && days.includes(focusKey) ? focusKey : selected && days.includes(selected) ? selected : days[days.length - 1];

  const months = useMemo(() => {
    const labels: { col: number; text: string }[] = [];
    let last = -1;
    days.forEach((key, index) => {
      const month = Number(key.slice(5, 7));
      const day = Number(key.slice(8, 10));
      const col = Math.floor((lead + index) / 7);
      if (day <= 7 && month !== last && (col > 0 || day === 1)) {
        labels.push({ col, text: `Th${month}` });
        last = month;
      }
    });
    return labels;
  }, [days, lead]);
  const columns = Math.ceil((lead + days.length) / 7);

  const label = (key: string) => {
    const count = counts.get(key) ?? 0;
    return `${count || 'Không'} hoạt động, ${longDate(key)}`;
  };

  const showTip = useCallback((key: string, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    setTip({ text: shortDate(key), count: counts.get(key) ?? 0, x: rect.left + rect.width / 2, y: rect.top - 6 });
  }, [counts]);

  function move(event: KeyboardEvent<HTMLButtonElement>, key: string) {
    const step = ({ ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 } as Record<string, number>)[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = addDays(key, step);
    if (!days.includes(next)) return;
    setFocusKey(next);
    const node = cellRefs.current.get(next);
    node?.focus();
    if (node) node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  const loading = load.status === 'loading';

  return (
    <section className={s.hm} aria-labelledby="hm-title">
      <div className={s.head}>
        <div>
          <h2 id="hm-title">Hoạt động học tập</h2>
          <p>Mỗi bước lộ trình bạn hoàn thành được tính 1 hoạt động vào ngày đó, theo giờ Việt Nam.</p>
        </div>
        <div className={s.seg} role="group" aria-label="Khoảng thời gian">
          {MODES.map((value) => (
            <button key={value} type="button" aria-pressed={mode === value} onClick={() => { setMode(value); setFocusKey(null); }}>
              {value === 'rolling' ? '12 tháng qua' : value === 'this-year' ? currentYear : currentYear - 1}
            </button>
          ))}
        </div>
      </div>

      <div className={s.stats} aria-live="polite">
        {loading ? <p className={s.muted} role="status">Đang tải hoạt động…</p> : load.status === 'error' ? null : (
          <>
            <div><b>{total}</b>hoạt động trong {range.label}</div>
            <div><b>{activeDays}</b>ngày có học</div>
            {mode !== 'last-year' && <div><b>{streak.current} ngày</b>chuỗi hiện tại</div>}
            <div><b>{streak.longest} ngày</b>chuỗi dài nhất</div>
          </>
        )}
      </div>

      {load.status === 'error' ? (
        <div className={s.error} role="alert">
          <span>Không tải được hoạt động học tập.</span>
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>Thử lại</button>
        </div>
      ) : (
        <div className={s.body} aria-busy={loading}>
          <div className={s.days} aria-hidden="true"><span>T2</span><span /><span>T4</span><span /><span>T6</span><span /><span /></div>
          <div className={s.scroll} ref={scroller} onScroll={() => setTip(null)}>
            <div className={s.inner}>
              <div className={s.months} aria-hidden="true" style={{ gridTemplateColumns: `repeat(${columns}, var(--hm-cell))` }}>
                {months.map((month) => <span key={`${month.col}-${month.text}`} style={{ gridColumn: month.col + 1 }}>{month.text}</span>)}
              </div>
              <div className={s.grid} role="group" aria-label="Lịch hoạt động theo ngày" onMouseLeave={() => setTip(null)}>
                {Array.from({ length: lead }, (_, index) => <i key={`lead-${index}`} className={`${s.cell} ${s.blank}`} />)}
                {days.map((key) => (
                  <button
                    key={key}
                    ref={(node) => { if (node) cellRefs.current.set(key, node); else cellRefs.current.delete(key); }}
                    type="button"
                    className={`${s.cell}${key === today ? ` ${s.today}` : ''}`}
                    data-l={level(counts.get(key) ?? 0)}
                    tabIndex={key === tabKey ? 0 : -1}
                    aria-pressed={selected === key}
                    aria-label={label(key)}
                    disabled={loading}
                    onClick={() => { setFocusKey(key); onSelect(selected === key ? null : key); }}
                    onKeyDown={(event) => move(event, key)}
                    onMouseEnter={(event) => showTip(key, event.currentTarget)}
                    onFocus={(event) => showTip(key, event.currentTarget)}
                    onBlur={() => setTip(null)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={s.foot}>
        <span>Mỗi ô là một ngày. Bấm vào ô để xem hoạt động của ngày đó.</span>
        <span className={s.legend} aria-hidden="true">Ít <i className={s.cell} data-l="0" /><i className={s.cell} data-l="1" /><i className={s.cell} data-l="2" /><i className={s.cell} data-l="3" /><i className={s.cell} data-l="4" /> Nhiều</span>
      </div>

      {load.status === 'ready' && total === 0 && (
        <div className={s.empty}>
          {mode === 'rolling'
            ? <>Bạn chưa có hoạt động nào. Hoàn thành bước đầu tiên trong một lộ trình và ô của hôm nay sẽ được tô màu.<Link className={s.btn} href="/courses">Xem khóa học</Link></>
            : <>Không có hoạt động nào trong {range.label}.</>}
        </div>
      )}

      {tip && (
        <div className={s.tip} role="presentation" style={{ left: tip.x, top: tip.y }}>
          <b>{tip.count ? `${tip.count} hoạt động` : 'Không có hoạt động'}</b> ngày {tip.text}
        </div>
      )}
    </section>
  );
}
