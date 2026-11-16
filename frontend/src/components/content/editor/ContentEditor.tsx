import { ReactNode, RefObject } from 'react';
import layout from './editorLayout.module.css';
import styles from './editorToolbar.module.css';

export function ContentEditor({ content, setContent, textareaRef, wordCount, children }: {
  content: string;
  wordCount: number;
  setContent: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
  children: ReactNode;
}) {
  return (
    <section className={layout.pn}>
      <div className={layout.pnH}>
        <label htmlFor="editor-body">Nội dung</label>
        <span className={layout.sp}>{wordCount} từ</span>
      </div>
      <div className={styles.slot}>{children}</div>
      <textarea
        id="editor-body"
        ref={textareaRef}
        className={styles.md}
        rows={18}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Viết nội dung bằng markdown..."
      />
    </section>
  );
}
