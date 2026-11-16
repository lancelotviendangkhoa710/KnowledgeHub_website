'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import styles from './select.module.css';

export type SelectOption = { value: string; label: string; group?: string; /** Hiện nhưng không chọn được (bị bỏ qua khi dùng mũi tên). */ disabled?: boolean };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  ariaLabel: string;
  /** Trường bắt buộc: báo cho trình đọc màn hình qua aria-required trên danh sách. */
  required?: boolean;
  className?: string;
  /** Cỡ gọn 40px dùng trong cột ghi nhớ. */
  compact?: boolean;
  /** Cỡ nhỏ 34px dùng trong dòng của bảng. */
  small?: boolean;
  /**
   * Vẽ danh sách ngoài ô cha (qua document.body, position: fixed) để không bị cắt bởi khung cuộn như bảng.
   * Danh sách đóng khi cuộn hoặc đổi cỡ cửa sổ.
   */
  portal?: boolean;
};

/** Ô chọn tự vẽ (thay select gốc để danh sách xổ ra theo giao diện). Hỗ trợ bàn phím: mũi tên, Home/End, Enter/Space, Esc, gõ chữ cái. */
export default function Select({ value, onChange, options, placeholder = 'Chọn', disabled, ariaLabel, required, className, compact, small, portal }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const [pos, setPos] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      // The portal list lives outside rootRef, so a press inside it is not an outside click.
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  // A fixed-position list would drift away from its button: close it when anything scrolls or the window resizes.
  useEffect(() => {
    if (!open || !portal) return;
    const onScroll = (event: Event) => {
      if (listRef.current && event.target instanceof Node && listRef.current.contains(event.target)) return; // the list's own scrolling
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, portal]);

  useEffect(() => {
    if (open) {
      listRef.current?.focus({ preventScroll: true }); // a fixed list must not scroll the page (that would close it)
      listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, active]);

  function openList() {
    if (disabled) return;
    // Thiếu chỗ phía dưới (ví dụ ô nằm sát đáy cột) mà phía trên rộng hơn thì sổ lên.
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const need = Math.min(280, options.length * 38 + 20);
      const below = window.innerHeight - rect.bottom;
      const up = below < need && rect.top > below;
      setDropUp(up);
      if (portal) {
        setPos(up
          ? { left: Math.max(8, rect.left), minWidth: rect.width, top: 'auto', bottom: window.innerHeight - rect.top + 6 }
          : { left: Math.max(8, rect.left), minWidth: rect.width, top: rect.bottom + 6 });
      }
    }
    const current = options.findIndex((option) => option.value === value);
    setActive(current >= 0 ? current : Math.max(0, options.findIndex((option) => !option.disabled)));
    setOpen(true);
  }

  function choose(index: number) {
    if (options[index].disabled) return;
    onChange(options[index].value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  /** Next enabled option from `from` in `dir`; stays put when there is none. */
  function step(from: number, dir: 1 | -1): number {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir) if (!options[i].disabled) return i;
    return from;
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key === 'ArrowDown') setActive((i) => step(i, 1));
    else if (event.key === 'ArrowUp') setActive((i) => step(i, -1));
    else if (event.key === 'Home') setActive(step(-1, 1));
    else if (event.key === 'End') setActive(step(options.length, -1));
    else if (event.key === 'Enter' || event.key === ' ') choose(active);
    else if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false);
      if (event.key === 'Escape') {
        event.stopPropagation(); // do not also close a panel that contains this select
        buttonRef.current?.focus();
      } else if (portal) {
        buttonRef.current?.focus(); // the portal list is at the end of <body>: Tab must continue from the button
      }
      return;
    } else if (event.key.length === 1) {
      const key = event.key.toLowerCase();
      const matches = (option: SelectOption) => !option.disabled && option.label.toLowerCase().startsWith(key);
      const next = options.findIndex((option, i) => i > active && matches(option));
      const found = next >= 0 ? next : options.findIndex(matches);
      if (found >= 0) setActive(found);
      return;
    } else return;
    event.preventDefault();
  }

  let lastGroup: string | undefined;
  const list = open && (
    <ul
      ref={listRef}
      className={`${styles.list} ${portal ? styles.portal : dropUp ? styles.up : ''}`}
      style={portal ? pos : undefined}
      role="listbox"
      tabIndex={-1}
      aria-label={ariaLabel}
      aria-required={required || undefined}
      aria-activedescendant={`${id}-${active}`}
      onKeyDown={onListKeyDown}
    >
      {options.map((option, index) => {
        const heading = option.group && option.group !== lastGroup ? option.group : null;
        lastGroup = option.group;
        return (
          <li key={option.value} role="presentation">
            {heading && <span className={styles.group} aria-hidden="true">{heading}</span>}
            <span
              id={`${id}-${index}`}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              data-active={index === active}
              className={`${styles.option} ${option.group ? styles.indent : ''} ${index === active ? styles.active : ''} ${option.disabled ? styles.optionOff : ''}`}
              onMouseEnter={() => { if (!option.disabled) setActive(index); }}
              onClick={() => choose(index)}
            >
              {option.label}
              {option.value === value && (
                <svg className={styles.check} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div ref={rootRef} className={`${styles.root} ${className ?? ''}`}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.trigger} ${compact ? styles.compact : ''} ${small ? styles.small : ''} ${selected ? '' : styles.placeholder}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${selected?.label ?? placeholder}`}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            openList();
          }
        }}
      >
        <span>{selected?.label ?? placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {portal && typeof document !== 'undefined' ? list && createPortal(list, document.body) : list}
    </div>
  );
}
