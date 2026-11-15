'use client';

import { ReactNode, useEffect, useId, useRef } from 'react';
import styles from './confirmDialog.module.css';

type ConfirmDialogProps = {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Accessible, non-native confirmation modal: focus moves to Cancel on open, Tab is trapped inside,
 * Escape cancels (unless a request is running) and focus returns to the opener on close.
 */
export default function ConfirmDialog({ title, children, confirmLabel, busy, error, onConfirm, onCancel }: ConfirmDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  // Latest props for the document-level key handler; refreshed after every render, never during it.
  const busyRef = useRef(busy);
  const cancelHandler = useRef(onCancel);
  useEffect(() => {
    busyRef.current = busy;
    cancelHandler.current = onCancel;
  });

  // Lock background scrolling while the dialog is open; restore the previous value on close/unmount.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  // A new error (e.g. a 422 conflict) gets focus so it is announced and focus stays in the dialog.
  useEffect(() => {
    if (error && !busy) errorRef.current?.focus();
  }, [error, busy]);

  useEffect(() => {
    /** Escape cancels (unless busy); Tab and Shift+Tab wrap around inside the panel. */
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!busyRef.current) cancelHandler.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div role="presentation" className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId} className={styles.panel}>
        <h2 id={titleId} className={styles.title}>{title}</h2>
        <div id={bodyId} className={styles.body}>{children}</div>
        {error && (
          <p ref={errorRef} tabIndex={-1} className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          {/* aria-disabled + click guard (not `disabled`) so the focused button keeps focus while a request runs. */}
          <button
            ref={cancelRef}
            type="button"
            className={`${styles.btn} ${styles.ghost} ${busy ? styles.busy : ''}`}
            onClick={() => { if (!busy) onCancel(); }}
            aria-disabled={busy}
          >
            Hủy
          </button>
          <button
            type="button"
            className={`${styles.btn} ${busy ? styles.busy : ''}`}
            onClick={() => { if (!busy) onConfirm(); }}
            aria-disabled={busy}
            aria-busy={busy}
          >
            {busy ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
