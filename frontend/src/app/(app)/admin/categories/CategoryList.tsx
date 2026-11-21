import type { AdminCategory } from '@/lib/categoryAdminClient';
import styles from '@/components/content/admin/admin.module.css';
import CategoryTree from './CategoryTree';

type Props = {
  roots: AdminCategory[];
  loading: boolean;
  loadError: string | null;
  disabled: boolean;
  onRetry: () => void;
  onEdit: (category: AdminCategory, opener: HTMLElement) => void;
  onDelete: (category: AdminCategory) => void;
};

/** Vùng danh sách: lỗi tải, đang tải, trống hoặc cây danh mục. */
export default function CategoryList({ roots, loading, loadError, disabled, onRetry, onEdit, onDelete }: Props) {
  if (loadError) {
    return (
      <div className={styles.state} role="alert">
        <h3>Không tải được danh mục</h3>
        <p>{loadError}</p>
        <button type="button" className={styles.btn} onClick={onRetry} disabled={loading}>Thử lại</button>
      </div>
    );
  }
  if (loading && roots.length === 0) return <p className={styles.loading} role="status">Đang tải danh mục...</p>;
  if (roots.length === 0) {
    return (
      <div className={styles.state}>
        <h3>Chưa có danh mục nào</h3>
        <p>Tạo danh mục đầu tiên để sắp xếp khóa học.</p>
      </div>
    );
  }
  return (
    <div className={styles.tree} role="region" aria-label="Cây danh mục" aria-busy={loading}>
      <CategoryTree nodes={roots} disabled={disabled} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}
