'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import styles from './datePicker.module.css';

type Props = {
  /** Giá trị dạng YYYY-MM-DD hoặc chuỗi rỗng, giống input type=date. */
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
};

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function parse(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Bộ chọn ngày tự vẽ (thay lịch gốc của trình duyệt để theo giao diện sáng/tối). */
export default function DatePicker({ value, onChange, ariaLabel, disabled }: Props) {
  const selected = parse(value);
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [focusDay, setFocusDay] = useState<Date>(selected ?? new Date());
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (open) gridRef.current?.querySelector<HTMLButtonElement>('[data-focus="true"]')?.focus();
  }, [open, focusDay]);

  function openPicker() {
    if (disabled) return;
    setFocusDay(selected ?? new Date());
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setDropUp(window.innerHeight - rect.bottom < 330 && rect.top > window.innerHeight - rect.bottom);
    setOpen(true);
  }

  function pick(day: Date) {
    onChange(toIso(day));
    setOpen(false);
    buttonRef.current?.focus();
  }

  function shift(days: number, months = 0) {
    setFocusDay((current) => new Date(current.getFullYear(), current.getMonth() + months, current.getDate() + days));
  }

  function onGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, () => void> = {
      ArrowLeft: () => shift(-1), ArrowRight: () => shift(1), ArrowUp: () => shift(-7), ArrowDown: () => shift(7),
      PageUp: () => shift(0, -1), PageDown: () => shift(0, 1),
    };
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (moves[event.key]) {
      event.preventDefault();
      moves[event.key]();
    }
  }

  const year = focusDay.getFullYear();
  const month = focusDay.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // tuần bắt đầu từ thứ Hai
  const cells = Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i));
  const todayIso = toIso(new Date());
  const display = selected ? `${pad(selected.getDate())}/${pad(selected.getMonth() + 1)}/${selected.getFullYear()}` : 'dd/mm/yyyy';

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.trigger} ${selected ? '' : styles.placeholder}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${selected ? display : 'chưa chọn'}`}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPicker())}
      >
        <span>{display}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
      </button>
      {open && (
        <div className={`${styles.pop} ${dropUp ? styles.up : ''}`} role="dialog" aria-label={`Chọn ngày, tháng ${month + 1} năm ${year}`}>
          <div className={styles.head}>
            <button type="button" className={styles.nav} onClick={() => shift(0, -1)} aria-label="Tháng trước">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
            </button>
            <b aria-live="polite">Tháng {month + 1}, {year}</b>
            <button type="button" className={styles.nav} onClick={() => shift(0, 1)} aria-label="Tháng sau">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
            </button>
          </div>
          <div className={styles.grid} ref={gridRef} role="grid" onKeyDown={onGridKeyDown}>
            {WEEKDAYS.map((w) => <span key={w} className={styles.dow}>{w}</span>)}
            {cells.map((day) => {
              const iso = toIso(day);
              const isFocus = iso === toIso(focusDay);
              return (
                <button
                  key={iso}
                  type="button"
                  tabIndex={isFocus ? 0 : -1}
                  data-focus={isFocus}
                  aria-label={`${day.getDate()} tháng ${day.getMonth() + 1} năm ${day.getFullYear()}`}
                  aria-pressed={iso === value}
                  className={`${styles.day} ${day.getMonth() !== month ? styles.out : ''} ${iso === todayIso ? styles.today : ''} ${iso === value ? styles.sel : ''}`}
                  onClick={() => pick(day)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className={styles.foot}>
            <button type="button" onClick={() => { onChange(''); setOpen(false); buttonRef.current?.focus(); }}>Xóa</button>
            <button type="button" onClick={() => pick(new Date())}>Hôm nay</button>
          </div>
        </div>
      )}
    </div>
  );
}
