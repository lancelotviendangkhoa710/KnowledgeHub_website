import Link from 'next/link';
import { SERVER_WAKING_MESSAGE } from '@/lib/contentClient';
import { DRAFT_STORAGE_KEY } from './editorConstants';
import styles from './editorLayout.module.css';

export function EditorNotices({
  lastSavedNotice,
  parentId,
  parentLoadError,
  parentLoading,
  loadParentCourse,
  resetToNewCourse,
  errorMessage,
  title,
  slug,
  categoryId,
  selectedTags,
  content,
  taxonomyWaking,
  parentWaking,
  taxonomyError,
  taxonomyLoading,
  loadTaxonomy,
  successMessage,
}: {
  lastSavedNotice: string | null;
  parentId: string | null;
  parentLoadError: { message: string; retryable: boolean } | null;
  parentLoading: boolean;
  loadParentCourse: (pid: string) => void;
  resetToNewCourse: () => void;
  errorMessage: string | null;
  title: string;
  slug: string;
  categoryId: string;
  selectedTags: string[];
  content: string;
  taxonomyWaking: boolean;
  parentWaking: boolean;
  taxonomyError: string | null;
  taxonomyLoading: boolean;
  loadTaxonomy: () => void;
  successMessage: string | null;
}) {
  const btn = `${styles.btn} ${styles.sm}`;
  return (
    <>
      {lastSavedNotice && (
        <div className={`${styles.notice} ${styles.good} ${styles.saved}`}>
          <span>{lastSavedNotice}</span>
        </div>
      )}

      {parentId && (
        <div className={styles.notice}>
          <span>
            <b>Chế độ chỉnh sửa phiên bản:</b> đang tạo phiên bản mới cho khóa học có ID <code>{parentId}</code>
          </span>
        </div>
      )}

      {parentId && parentLoadError && (
        <div role="alert" className={`${styles.notice} ${styles.err}`}>
          <span>
            <strong>{parentLoadError.message}</strong>
            <small>
              {parentLoadError.retryable
                ? 'Hãy kiểm tra kết nối hoặc thử lại. Chưa thể lưu cho đến khi khóa học tải xong.'
                : 'Không thể lưu phiên bản này. Hãy tạo khóa học mới.'}
            </small>
          </span>
          {parentLoadError.retryable ? (
            <button
              type="button"
              onClick={() => loadParentCourse(parentId)}
              disabled={parentLoading}
              aria-busy={parentLoading}
              className={btn}
            >
              {parentLoading ? 'Đang thử lại...' : 'Thử lại'}
            </button>
          ) : (
            <button type="button" onClick={resetToNewCourse} className={`${btn} ${styles.ghost}`}>
              Tạo khóa học mới
            </button>
          )}
        </div>
      )}

      {errorMessage && (
        <div role="alert" className={`${styles.notice} ${styles.err}`}>
          <span>{errorMessage}</span>
          {/đăng nhập/i.test(errorMessage) && (
            <Link
              href={`/login?redirect=${encodeURIComponent(parentId ? `/courses/create?parent_id=${parentId}` : '/courses/create')}`}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem(
                    DRAFT_STORAGE_KEY,
                    JSON.stringify({ title, slug, categoryId, tags: selectedTags, content })
                  );
                }
              }}
              className={btn}
            >
              Đăng nhập
            </Link>
          )}
        </div>
      )}

      {/* Always-mounted live region: only its content toggles so the wake-up notice is announced reliably. */}
      <div role="status" aria-live="polite" className={styles.wake}>
        {taxonomyWaking || parentWaking ? SERVER_WAKING_MESSAGE : null}
      </div>

      {taxonomyError && (
        <div role="alert" className={`${styles.notice} ${styles.err}`}>
          <span>
            <strong>Không tải được danh mục.</strong> {taxonomyError}
            <small>Hãy kiểm tra kết nối hoặc thử lại. Bạn cần chọn danh mục trước khi xuất bản.</small>
          </span>
          <button type="button" onClick={() => loadTaxonomy()} disabled={taxonomyLoading} aria-busy={taxonomyLoading} className={btn}>
            {taxonomyLoading ? 'Đang thử lại...' : 'Thử lại'}
          </button>
        </div>
      )}

      {successMessage && (
        <div className={`${styles.notice} ${styles.good}`}>{successMessage}</div>
      )}
    </>
  );
}
