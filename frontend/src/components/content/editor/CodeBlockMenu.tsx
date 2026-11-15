import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import { CODE_LANGUAGES } from './editorConstants';
import styles from './editorToolbar.module.css';

export function CodeBlockMenu({
  showCodeDropdown,
  setShowCodeDropdown,
  handleInsertCodeBlock,
}: {
  showCodeDropdown: boolean;
  setShowCodeDropdown: Dispatch<SetStateAction<boolean>>;
  handleInsertCodeBlock: (lang: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Esc đóng menu và trả focus về nút; bấm ra ngoài thì đóng.
  useEffect(() => {
    if (!showCodeDropdown) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setShowCodeDropdown(false);
      buttonRef.current?.focus();
    };
    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setShowCodeDropdown(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [showCodeDropdown, setShowCodeDropdown]);

  return (
    <div ref={rootRef} className={styles.dd}>
      <button
        ref={buttonRef}
        type="button"
        title="Chèn khối code"
        aria-label="Chèn khối code"
        aria-haspopup="true"
        aria-expanded={showCodeDropdown}
        onClick={() => setShowCodeDropdown((prev) => !prev)}
      >
        <span>Khối code</span>
      </button>

      {showCodeDropdown && (
        <div className={styles.menu}>
          {CODE_LANGUAGES.map((item) => (
            <button key={item.lang} type="button" onClick={() => handleInsertCodeBlock(item.lang)}>
              <span>{item.label}</span>
              <span className={styles.ext}>
                .{item.lang === 'typescript' ? 'ts' : item.lang === 'python' ? 'py' : item.lang}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
