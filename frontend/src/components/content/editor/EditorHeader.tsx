import Link from 'next/link';
import { ViewMode } from './editorConstants';
import styles from './editorLayout.module.css';

export function EditorHeader({ viewMode, setViewMode }: { viewMode: ViewMode; setViewMode: (mode: ViewMode) => void }) {
  return (
    <>
      <nav className={styles.crumb} aria-label="Đường dẫn">
        <Link href="/courses/manage">Studio</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Soạn khóa học</span>
      </nav>
      <header className={styles.head}>
        <div className={styles.row}>
          <div>
            <h1>Soạn khóa học</h1>
            <p>Viết nội dung bằng markdown, xem trước theo giao diện người học và kiểm tra các điều kiện trước khi xuất bản.</p>
          </div>

          {/* Chế độ xem: chia đôi | chỉ soạn | chỉ xem */}
          <div className={styles.btns}>
            <div className={styles.seg} role="tablist" aria-label="Chế độ xem">
              <button type="button" role="tab" aria-selected={viewMode === 'split'} onClick={() => setViewMode('split')}>
                <span>Chia đôi</span>
              </button>
              <button type="button" role="tab" aria-selected={viewMode === 'editor'} onClick={() => setViewMode('editor')}>
                <span>Chỉ soạn</span>
              </button>
              <button type="button" role="tab" aria-selected={viewMode === 'preview'} onClick={() => setViewMode('preview')}>
                <span>Chỉ xem</span>
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
