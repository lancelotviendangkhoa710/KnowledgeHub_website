'use client';

import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import s from './profile.module.css';

export type TabDef<T extends string> = { id: T; label: string; count?: number };

/**
 * Tab đồng bộ với `?tab=` trên URL (RMR-05, RMR-06). Tab mặc định không ghi tham số.
 * Đọc URL sau khi mount để không lệch với HTML dựng sẵn; nút Back/Forward cũng đổi tab.
 */
export function useTabParam<T extends string>(ids: readonly T[], fallback: T): [T, (next: T) => void] {
  const [tab, setTab] = useState<T>(fallback);
  const idsKey = ids.join('|');

  useEffect(() => {
    const read = () => {
      const value = new URLSearchParams(window.location.search).get('tab') as T | null;
      setTab(value && ids.includes(value) ? value : fallback);
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, fallback]);

  const change = useCallback((next: T) => {
    const url = new URL(window.location.href);
    if (next === fallback) url.searchParams.delete('tab');
    else url.searchParams.set('tab', next);
    window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    setTab(next);
  }, [fallback]);

  return [tab, change];
}

type Props<T extends string> = {
  tabs: TabDef<T>[];
  value: T;
  onChange: (next: T) => void;
  label: string;
  idPrefix: string;
};

/** Thanh tab theo mẫu WAI-ARIA: mũi tên trái/phải, Home, End. Panel dùng id `${idPrefix}-panel-${id}`. */
export default function Tabs<T extends string>({ tabs, value, onChange, label, idPrefix }: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    const next = event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
        : event.key === 'Home' ? 0 : event.key === 'End' ? last : -1;
    if (next < 0) return;
    event.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div className={s.tabs} role="tablist" aria-label={label}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(node) => { refs.current[index] = node; }}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${tab.id}`}
          aria-selected={value === tab.id}
          aria-controls={`${idPrefix}-panel-${tab.id}`}
          tabIndex={value === tab.id ? 0 : -1}
          className={s.tab}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {tab.label}
          {tab.count !== undefined && <span className={s.tabCount}>{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}
