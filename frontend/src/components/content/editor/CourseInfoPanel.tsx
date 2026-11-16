import { Dispatch, SetStateAction, useState } from 'react';
import { Category } from '@/types/content';
import Select from '@/components/ui/Select';
import { groupCategories } from './editorUtils';
import styles from './editorLayout.module.css';

export function CourseInfoPanel({
  title,
  handleTitleChange,
  categoryId,
  setCategoryId,
  selectedCategory,
  groupedCategories,
  slug,
  setSlug,
  isSlugLocked,
  setIsSlugLocked,
  selectedTags,
  tagInput,
  setTagInput,
  handleAddTag,
  handleRemoveTag,
  tagNotice,
  showErrors,
}: {
  title: string;
  handleTitleChange: (val: string) => void;
  categoryId: string;
  setCategoryId: (id: string) => void;
  selectedCategory: Category | null;
  groupedCategories: ReturnType<typeof groupCategories>;
  slug: string;
  setSlug: (slug: string) => void;
  isSlugLocked: boolean;
  setIsSlugLocked: Dispatch<SetStateAction<boolean>>;
  selectedTags: string[];
  tagInput: string;
  setTagInput: (val: string) => void;
  handleAddTag: (raw: string | string[]) => void;
  handleRemoveTag: (tag: string) => void;
  tagNotice: string | null;
  /** Đã bấm Xuất bản: hiện lỗi cho mọi ô còn thiếu dù người dùng chưa chạm vào. */
  showErrors: boolean;
}) {
  // Chỉ báo lỗi đỏ sau khi người dùng đã rời khỏi ô (blur) hoặc đã bấm Xuất bản.
  const [titleTouched, setTitleTouched] = useState(false);
  const [tagsTouched, setTagsTouched] = useState(false);
  const titleLength = title.trim().length;
  const titleInvalid = (titleTouched || showErrors) && (titleLength < 5 || titleLength > 120);
  const tagsInvalid = (tagsTouched || showErrors) && selectedTags.length === 0;
  const categoryOptions = groupedCategories.flatMap((group) =>
    group.items.map((cat) => ({
      value: cat.id,
      label: `${cat.parent_id ? '↳ ' : '• '}${cat.name}${cat.articles_count ? ` (${cat.articles_count} khóa học)` : ''}`,
      group: group.domainName,
    }))
  );

  return (
    <section className={styles.pn}>
      <div className={styles.pnH}>Thông tin khóa học</div>
      <div className={styles.pnB}>
        <div className={styles.fgrid}>
          <div className={`${styles.field} ${styles.full}`}>
            <label htmlFor="editor-title">Tên khóa học</label>
            <input
              id="editor-title"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ví dụ: Nền tảng của các hệ thống lưu trữ dữ liệu"
              aria-invalid={titleInvalid}
              onBlur={() => setTitleTouched(true)}
              aria-describedby={titleInvalid ? 'editor-title-help' : undefined}
            />
            {titleInvalid && (
              <small id="editor-title-help" className={styles.bad}>
                Tên khóa học dài 5 đến 120 ký tự.
              </small>
            )}
          </div>

          <div className={styles.field}>
            <div className={styles.labRow}>
              <label htmlFor="editor-slug">Đường dẫn</label>
              <button
                type="button"
                onClick={() => setIsSlugLocked((prev) => !prev)}
                title={isSlugLocked ? 'Đường dẫn đang tự tạo từ tên khóa học. Bấm để sửa tay.' : 'Đang sửa tay. Bấm để khóa lại theo tên khóa học.'}
              >
                {isSlugLocked ? (
                  <>
                    <span>Sửa tay</span>
                  </>
                ) : (
                  <>
                    <span>Khóa</span>
                  </>
                )}
              </button>
            </div>
            <input
              id="editor-slug"
              type="text"
              value={slug}
              readOnly={isSlugLocked}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
              placeholder="tu-dong-tao-tu-ten-khoa-hoc"
            />
          </div>

          <div className={styles.field}>
            <div className={styles.labRow}>
              <span className={styles.lab}>Danh mục</span>
            </div>
            <Select
              ariaLabel="Danh mục"
              required
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Chọn danh mục"
              options={categoryOptions}
            />
          </div>

          <div className={`${styles.field} ${styles.full}`}>
            <div className={styles.labRow}>
              <label htmlFor="editor-tags">Thẻ</label>
            </div>

            {/* Tag Chips Box */}
            <div className={styles.taginput}>
              {selectedTags.map((t) => (
                <span key={t} className={styles.chip}>
                  <span>#{t}</span>
                  <button type="button" aria-label={`Xóa thẻ ${t}`} onClick={() => handleRemoveTag(t)}>
                    &times;
                  </button>
                </span>
              ))}

              <input
                id="editor-tags"
                aria-label="Thêm thẻ"
                type="text"
                value={tagInput}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.includes(',')) {
                    // Gõ hoặc dán "a,b,c": mỗi đoạn trước dấu phẩy thành một thẻ, đoạn cuối ở lại trong ô.
                    const parts = value.split(',');
                    handleAddTag(parts.slice(0, -1));
                    setTagInput(parts[parts.length - 1]);
                  } else {
                    setTagInput(value);
                  }
                }}
                onPaste={(e) => {
                  // Dán "a,b,c": cả ba đoạn thành thẻ ngay (kể cả đoạn cuối).
                  const pasted = e.clipboardData.getData('text');
                  if (!pasted.includes(',')) return;
                  e.preventDefault();
                  // Dán đè lên vùng đang chọn (nếu có), rồi mới tách theo dấu phẩy.
                  const { selectionStart, selectionEnd } = e.currentTarget;
                  const next = tagInput.slice(0, selectionStart ?? tagInput.length) + pasted + tagInput.slice(selectionEnd ?? tagInput.length);
                  handleAddTag(next.split(','));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                onBlur={() => {
                  setTagsTouched(true);
                  if (tagInput.trim()) {
                    handleAddTag(tagInput);
                  }
                }}
                placeholder={selectedTags.length === 0 ? 'Nhập thẻ rồi nhấn Enter hoặc dấu phẩy' : 'Thêm thẻ...'}
              />
            </div>
            <small aria-live="polite" className={tagsInvalid && !tagNotice ? styles.bad : undefined}>
              {tagNotice ?? (selectedTags.length === 0 ? 'Cần ít nhất 1 thẻ.' : '')}
            </small>
          </div>
        </div>
      </div>
    </section>
  );
}
