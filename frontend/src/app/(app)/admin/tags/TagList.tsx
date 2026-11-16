import type { TagRecord } from '@/lib/tagAdminClient';
import styles from '@/components/content/admin/admin.module.css';

type Props = {
  tags: TagRecord[];
  visible: TagRecord[];
  loading: boolean;
  loadError: string | null;
  truncated: boolean;
  filter: string;
  onFilter: (value: string) => void;
  filterMax: number;
  onRetry: () => void;
};

/** Ô lọc, dòng đếm và bảng thẻ (chỉ xem, không có xóa). */
export default function TagList({ tags, visible, loading, loadError, truncated, filter, onFilter, filterMax, onRetry }: Props) {
  const hasCounts = tags.some((tag) => typeof tag.articles_count === 'number');
  return (
    <>
      <div className={styles.tools} role="search">
        <label className={styles.search}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input type="search" aria-label="Lọc thẻ" placeholder="Lọc thẻ theo tên hoặc đường dẫn" value={filter} onChange={(event) => onFilter(event.target.value)} maxLength={filterMax} />
        </label>
      </div>

      {truncated && !loadError && (
        <p className={styles.notice} role="alert">
          Chỉ tải được {tags.length} thẻ đầu tiên. Danh sách và việc kiểm tra trùng có thể chưa đầy đủ.
        </p>
      )}

      {loadError ? (
        <div className={styles.state} role="alert">
          <h3>Không tải được danh sách thẻ</h3>
          <p>{loadError}</p>
          <button className={styles.btn} type="button" onClick={onRetry}>Thử lại</button>
        </div>
      ) : loading && tags.length === 0 ? (
        <p className={styles.loading} role="status">Đang tải thẻ...</p>
      ) : tags.length === 0 ? (
        <div className={styles.state}><h3>Chưa có thẻ nào</h3><p>Tạo thẻ đầu tiên ở biểu mẫu phía trên.</p></div>
      ) : visible.length === 0 ? (
        <div className={styles.state}><h3>Không có thẻ nào khớp</h3><p>Thử bộ lọc khác.</p></div>
      ) : (
        <>
          <p className={styles.count} aria-live="polite">Hiển thị {visible.length} trên {tags.length} thẻ{loading ? ' (đang làm mới...)' : ''}.</p>
          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${styles.tableNarrow}`}>
              <caption className={styles.srOnly}>Thẻ, xếp theo thứ tự chữ cái</caption>
              <thead>
                <tr>
                  <th scope="col">Tên</th>
                  <th scope="col">Đường dẫn</th>
                  {hasCounts && <th scope="col">Khóa học</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((tag) => (
                  <tr key={tag.id}>
                    <td>{tag.name}</td>
                    <td><code>{tag.slug}</code></td>
                    {hasCounts && <td>{tag.articles_count ?? 0}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
