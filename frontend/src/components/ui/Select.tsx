'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import styles from './select.module.css';

export type SelectOption = { value: string; label: string; group?: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
};

/** Ô chọn tự vẽ (thay select gốc để danh sách xổ ra theo giao diện). Hỗ trợ bàn phím: mũi tên, Home/End, Enter/Space, Esc, gõ chữ cái. */
export default function Select({ value, onChange, options, placeholder = 'Chọn', disabled, ariaLabel, className }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (open) {
      listRef.current?.focus();
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
      setDropUp(below < need && rect.top > below);
    }
    setActive(Math.max(0, options.findIndex((option) => option.value === value)));
    setOpen(true);
  }

  function choose(index: number) {
    onChange(options[index].value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const last = options.length - 1;
    if (event.key === 'ArrowDown') setActive((i) => Math.min(last, i + 1));
    else if (event.key === 'ArrowUp') setActive((i) => Math.max(0, i - 1));
    else if (event.key === 'Home') setActive(0);
    else if (event.key === 'End') setActive(last);
    else if (event.key === 'Enter' || event.key === ' ') choose(active);
    else if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false);
      if (event.key === 'Escape') buttonRef.current?.focus();
      return;
    } else if (event.key.length === 1) {
      const key = event.key.toLowerCase();
      const next = options.findIndex((option, i) => i > active && option.label.toLowerCase().startsWith(key));
      const found = next >= 0 ? next : options.findIndex((option) => option.label.toLowerCase().startsWith(key));
      if (found >= 0) setActive(found);
      return;
    } else return;
    event.preventDefault();
  }

  let lastGroup: string | undefined;
  return (
    <div ref={rootRef} className={`${styles.root} ${className ?? ''}`}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.trigger} ${selected ? '' : styles.placeholder}`}
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
      {open && (
        <ul
          ref={listRef}
          className={`${styles.list} ${dropUp ? styles.up : ''}`}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
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
                  data-active={index === active}
                  className={`${styles.option} ${option.group ? styles.indent : ''} ${index === active ? styles.active : ''}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(index)}
                >
                  {option.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
