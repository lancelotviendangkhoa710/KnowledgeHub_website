import { Dispatch, SetStateAction, useEffect } from 'react';
import { CodeBlockMenu } from './CodeBlockMenu';
import { CalloutMenu } from './CalloutMenu';
import styles from './editorToolbar.module.css';

export function EditorToolbar({
  insertMarkdown,
  showCodeDropdown,
  setShowCodeDropdown,
  handleInsertCodeBlock,
  showCalloutDropdown,
  setShowCalloutDropdown,
  handleInsertCallout,
  showVideoModal,
  setShowVideoModal,
}: {
  insertMarkdown: (prefix: string, suffix?: string, defaultText?: string) => void;
  showCodeDropdown: boolean;
  setShowCodeDropdown: Dispatch<SetStateAction<boolean>>;
  handleInsertCodeBlock: (lang: string) => void;
  showCalloutDropdown: boolean;
  setShowCalloutDropdown: Dispatch<SetStateAction<boolean>>;
  handleInsertCallout: (kind: 'NOTE' | 'TIP' | 'WARNING') => void;
  showVideoModal: boolean;
  setShowVideoModal: Dispatch<SetStateAction<boolean>>;
}) {
  // Mở menu này thì đóng menu kia.
  useEffect(() => {
    if (showCodeDropdown) setShowCalloutDropdown(false);
  }, [showCodeDropdown, setShowCalloutDropdown]);
  useEffect(() => {
    if (showCalloutDropdown) setShowCodeDropdown(false);
  }, [showCalloutDropdown, setShowCodeDropdown]);

  return (
    <div className={styles.tb} role="toolbar" aria-label="Định dạng nội dung">
      <button type="button" title="Tiêu đề lớn (H2)" aria-label="Tiêu đề lớn (H2)" onClick={() => insertMarkdown('\n\n## ', '\n', 'Tiêu đề mục lớn')}>
        H2
      </button>
      <button type="button" title="Tiêu đề nhỏ (H3)" aria-label="Tiêu đề nhỏ (H3)" onClick={() => insertMarkdown('\n\n### ', '\n', 'Tiêu đề mục nhỏ')}>
        H3
      </button>

      <span className={styles.vsep} aria-hidden="true" />

      <button type="button" title="In đậm" aria-label="In đậm" className={styles.bold} onClick={() => insertMarkdown('**', '**', 'chữ đậm')}>
        B
      </button>
      <button type="button" title="In nghiêng" aria-label="In nghiêng" className={styles.italic} onClick={() => insertMarkdown('*', '*', 'chữ nghiêng')}>
        I
      </button>
      <button type="button" title="Gạch ngang" aria-label="Gạch ngang" className={styles.strike} onClick={() => insertMarkdown('~~', '~~', 'chữ gạch ngang')}>
        S
      </button>

      <span className={styles.vsep} aria-hidden="true" />

      <button type="button" title="Danh sách" aria-label="Danh sách" onClick={() => insertMarkdown('\n- ', '\n- Mục 2\n', 'Mục 1')}>
        <span>Danh sách</span>
      </button>
      <button type="button" title="Trích dẫn" aria-label="Trích dẫn" onClick={() => insertMarkdown('\n> ', '\n', 'Nội dung trích dẫn')}>
        <span>Trích dẫn</span>
      </button>
      <button type="button" title="Đường kẻ" aria-label="Đường kẻ" onClick={() => insertMarkdown('\n\n---\n\n', '', '')}>
        Đường kẻ
      </button>

      <span className={styles.vsep} aria-hidden="true" />

      {/* Code Block Inserter with Multi-Language Dropdown */}
      <CodeBlockMenu
        showCodeDropdown={showCodeDropdown}
        setShowCodeDropdown={setShowCodeDropdown}
        handleInsertCodeBlock={handleInsertCodeBlock}
      />

      {/* Callout Box Inserter with Alert Dropdown */}
      <CalloutMenu
        showCalloutDropdown={showCalloutDropdown}
        setShowCalloutDropdown={setShowCalloutDropdown}
        handleInsertCallout={handleInsertCallout}
      />

      <span className={styles.vsep} aria-hidden="true" />

      {/* YouTube Video Inserter Button */}
      <button
        type="button"
        title="Video YouTube"
        aria-label="Video YouTube"
        data-video-trigger
        aria-haspopup="dialog"
        onClick={() => setShowVideoModal((prev) => !prev)}
      >
        <svg className={styles.fill} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <span>Video YouTube</span>
      </button>
    </div>
  );
}
