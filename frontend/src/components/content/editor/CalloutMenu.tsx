import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import styles from './editorToolbar.module.css';

export function CalloutMenu({
  showCalloutDropdown,
  setShowCalloutDropdown,
  handleInsertCallout,
}: {
  showCalloutDropdown: boolean;
  setShowCalloutDropdown: Dispatch<SetStateAction<boolean>>;
  handleInsertCallout: (kind: 'NOTE' | 'TIP' | 'WARNING') => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Esc đóng menu và trả focus về nút; bấm ra ngoài thì đóng.
  useEffect(() => {
    if (!showCalloutDropdown) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setShowCalloutDropdown(false);
      buttonRef.current?.focus();
    };
    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setShowCalloutDropdown(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [showCalloutDropdown, setShowCalloutDropdown]);

  return (
    <div ref={rootRef} className={styles.dd}>
      <button
        ref={buttonRef}
        type="button"
        title="Chèn ghi chú"
        aria-label="Chèn ghi chú"
        aria-haspopup="true"
        aria-expanded={showCalloutDropdown}
        onClick={() => setShowCalloutDropdown((prev) => !prev)}
      >
        <span>Ghi chú</span>
      </button>

      {showCalloutDropdown && (
        <div className={styles.menu}>
          <button type="button" className={styles.lead} onClick={() => handleInsertCallout('NOTE')}>
            <span className={`${styles.dot} ${styles.dotNote}`} aria-hidden="true" />
            <span>Lưu ý</span>
          </button>
          <button type="button" className={styles.lead} onClick={() => handleInsertCallout('TIP')}>
            <span className={`${styles.dot} ${styles.dotTip}`} aria-hidden="true" />
            <span>Mẹo</span>
          </button>
          <button type="button" className={styles.lead} onClick={() => handleInsertCallout('WARNING')}>
            <span className={`${styles.dot} ${styles.dotWarn}`} aria-hidden="true" />
            <span>Cảnh báo</span>
          </button>
        </div>
      )}
    </div>
  );
}
