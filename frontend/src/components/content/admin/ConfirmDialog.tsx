'use client';

import { ReactNode, useEffect, useId, useRef } from 'react';

type ConfirmDialogProps = {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'grid',
  placeItems: 'center',
  padding: '1.5rem',
  background: 'rgba(36, 33, 36, 0.45)',
};

const panelStyle: React.CSSProperties = {
  width: 'min(100%, 30rem)',
  padding: '1.75rem',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  background: 'var(--color-white)',
  boxShadow: 'var(--shadow-lg)',
  color: 'var(--color-charcoal)',
};

const busyStyle: React.CSSProperties = { opacity: 0.55, cursor: 'not-allowed' };

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
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const cancelHandler = useRef(onCancel);
  cancelHandler.current = onCancel;

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
    <div style={overlayStyle} onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId} style={panelStyle}>
        <h2 id={titleId} style={{ margin: '0 0 0.75rem', fontSize: 'var(--text-xl)' }}>{title}</h2>
        <div id={bodyId} style={{ color: 'var(--color-gray)' }}>{children}</div>
        {error && (
          <p ref={errorRef} tabIndex={-1} className="auth-error" role="alert" style={{ marginTop: '1rem' }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          {/* aria-disabled + click guard (not `disabled`) so the focused button keeps focus while a request runs. */}
          <button
            ref={cancelRef}
            type="button"
            className="button button--secondary"
            onClick={() => { if (!busy) onCancel(); }}
            aria-disabled={busy}
            style={busy ? busyStyle : undefined}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => { if (!busy) onConfirm(); }}
            aria-disabled={busy}
            aria-busy={busy}
            style={busy ? busyStyle : undefined}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
