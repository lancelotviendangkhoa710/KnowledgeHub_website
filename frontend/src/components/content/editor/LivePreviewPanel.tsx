import { Category } from '@/types/content';
import { buildTocItems } from './editorUtils';
import { renderLivePreview } from './preview/renderLivePreview';
import layout from './editorLayout.module.css';
import styles from './editorPreview.module.css';

/** Mục lục chỉ hiện khi bài có từ ngần này tiêu đề (H2 và H3). */
const MIN_TOC_ITEMS = 3;

export function LivePreviewPanel({
  selectedCategory,
  title,
  tocItems,
  content,
}: {
  selectedCategory: Category | null;
  title: string;
  tocItems: ReturnType<typeof buildTocItems>;
  content: string;
}) {
  const isEmpty = content.trim() === '';

  return (
    <section className={`${layout.pn} ${layout.pv}`}>
      <div className={layout.pnH}>Xem trước theo giao diện người học</div>
      <div className={layout.pnB}>
        {isEmpty ? (
          <p className={styles.empty}>Nội dung xem trước sẽ hiện ở đây khi bạn bắt đầu viết.</p>
        ) : (
          <>
            <nav aria-label="Đường dẫn của bản xem trước" className={styles.crumb}>
              <span>Khóa học</span>
              {selectedCategory && (
                <>
                  <span aria-hidden="true">/</span>
                  <span>{selectedCategory.name}</span>
                </>
              )}
              {title.trim() && (
                <>
                  <span aria-hidden="true">/</span>
                  <span className={styles.cur}>{title}</span>
                </>
              )}
            </nav>

            <h1 className={styles.title}>{title.trim() || 'Khóa học chưa đặt tên'}</h1>

            {tocItems.length >= MIN_TOC_ITEMS && (
              <div className={styles.toc}>
                <div className={styles.tocH}>
                  <span>Mục lục khóa học ({tocItems.length})</span>
                </div>
                <div>
                  {tocItems.map((item) => (
                    <div key={item.id} className={`${styles.tocItem} ${item.level === 3 ? styles.tocSub : ''}`}>
                      <span className={styles.tocMark} aria-hidden="true">{item.level === 2 ? '•' : '↳'}</span>
                      <a href={`#${item.id}`}>{item.text}</a>
                      {item.hasVideo && (
                        <span className={styles.vid}>
                          Video bài giảng
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.prose}>{renderLivePreview(content)}</div>
          </>
        )}
      </div>
    </section>
  );
}
