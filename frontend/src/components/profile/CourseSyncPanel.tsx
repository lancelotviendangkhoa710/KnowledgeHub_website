'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { RoadmapItem, RoadmapItemStatus } from '@/types/learning';
import p from './profile.module.css';
import s from './roadmapDetail.module.css';

const STATUS_TEXT: Record<RoadmapItemStatus, string> = {
  pending: 'Chưa bắt đầu',
  in_progress: 'Đang học',
  completed: 'Đã xong',
  skipped: 'Đã bỏ qua',
};

type Props = {
  items: RoadmapItem[];
  busy: boolean;
  onConfirm: (ids: string[]) => void;
  onIgnore: (ids: string[]) => void;
};

/**
 * LRN-FE-06: các khóa học đã đánh dấu hoàn thành ở trang bài học nhưng bước trong lộ trình chưa đổi.
 * Thu gọn thành một dòng tóm tắt; "Xem chi tiết" mở danh sách có checkbox cho từng bước (trạng thái hiện
 * tại → Đã xong), ô "Chọn tất cả" ba trạng thái, và hai hành động áp dụng cho các bước đang chọn.
 */
export default function CourseSyncPanel({ items, busy, onConfirm, onIgnore }: Props) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(items.map((item) => item.id)));
  const masterRef = useRef<HTMLInputElement>(null);

  // Danh sách thay đổi (đã xác nhận/bỏ qua một phần): giữ lựa chọn của bước còn lại, bước mới mặc định được chọn.
  const key = items.map((item) => item.id).join('|');
  const known = useRef(new Set(items.map((item) => item.id)));
  useEffect(() => {
    setChecked((current) => new Set(items.filter((item) => current.has(item.id) || !known.current.has(item.id)).map((item) => item.id)));
    known.current = new Set(items.map((item) => item.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const selected = items.filter((item) => checked.has(item.id)).map((item) => item.id);
  const all = selected.length === items.length;
  const none = selected.length === 0;
  useEffect(() => {
    if (masterRef.current) masterRef.current.indeterminate = !all && !none;
  }, [all, none]);

  function toggle(id: string, on: boolean) {
    setChecked((current) => {
      const next = new Set(current);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }

  return (
    <section className={s.sync} aria-label="Khóa học đã hoàn thành chưa cập nhật vào lộ trình">
      <div className={s.syncHead}>
        <p>
          <strong>{items.length} khóa học</strong> bạn đã đánh dấu hoàn thành ở trang bài học chưa được cập nhật vào lộ trình này.
        </p>
        <button type="button" className={`${p.btn} ${p.btnGhost} ${p.btnSm}`} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
          {open ? 'Ẩn chi tiết' : 'Xem chi tiết'}
          <svg className={s.chev} data-open={open || undefined} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      {open && (
        <div id={panelId} className={s.syncBody}>
          <label className={s.syncAll}>
            <input ref={masterRef} type="checkbox" checked={all} disabled={busy} onChange={(event) => setChecked(event.target.checked ? new Set(items.map((item) => item.id)) : new Set())} />
            <span>{all ? 'Hủy chọn tất cả' : 'Chọn tất cả'}</span>
            <span className={s.syncCount}>Đã chọn {selected.length}/{items.length}</span>
          </label>
          <ul className={s.syncList}>
            {items.map((item) => (
              <li key={item.id}>
                <label className={s.syncRow}>
                  <input type="checkbox" checked={checked.has(item.id)} disabled={busy} onChange={(event) => toggle(item.id, event.target.checked)} />
                  <span className={s.syncTitle}>{item.title}</span>
                  <span className={s.syncState}>
                    <span className={s.syncFrom}>{STATUS_TEXT[item.status]}</span>
                    <span aria-hidden="true">→</span>
                    <span className={s.syncTo}>Đã xong</span>
                    <span className={s.sr}>: trạng thái hiện tại {STATUS_TEXT[item.status]}, sẽ chuyển thành Đã xong</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className={s.syncActions}>
            <button type="button" className={`${p.btn} ${p.btnSm}`} disabled={busy || none} onClick={() => onConfirm(selected)}>
              {busy ? 'Đang cập nhật…' : `Xác nhận đã xong (${selected.length})`}
            </button>
            <button type="button" className={`${p.btn} ${p.btnGhost} ${p.btnSm}`} disabled={busy || none} onClick={() => onIgnore(selected)}>
              Bỏ qua ({selected.length})
            </button>
            <span className={s.syncHint}>Bỏ qua: không gợi ý lại các bước này; bạn vẫn đổi tiến độ được trong tab Các bước.</span>
          </div>
        </div>
      )}
    </section>
  );
}
