import ConfirmDialog from '@/components/content/admin/ConfirmDialog';
import type { AdminCategory } from '@/lib/categoryAdminClient';
import styles from '@/components/content/admin/admin.module.css';

type Props = { category: AdminCategory; busy: boolean; error: string | null; onConfirm: () => void; onCancel: () => void };

/** Hộp xác nhận xóa; khi còn khóa học hoặc danh mục con thì cảnh báo máy chủ sẽ từ chối. */
export default function CategoryDeleteDialog({ category, busy, error, onConfirm, onCancel }: Props) {
  const courses = category.articles_count ?? 0;
  const children = category.children?.length ?? 0;
  return (
    <ConfirmDialog title={`Xóa “${category.name}”?`} confirmLabel="Xóa danh mục" cancelLabel="Hủy" tone="danger" busy={busy} error={error} onConfirm={onConfirm} onCancel={onCancel}>
      <p className={styles.dlgP}>Thao tác này xóa vĩnh viễn danh mục <code>{category.slug}</code> và không hoàn tác được.</p>
      {(courses > 0 || children > 0) && (
        <p className={styles.dlgWarn}>
          Danh mục còn
          {children > 0 && ` ${children} danh mục con`}
          {children > 0 && courses > 0 && ' và'}
          {courses > 0 && ` ${courses} khóa học`}
          , nên máy chủ sẽ từ chối. Hãy chuyển hoặc xóa chúng trước.
        </p>
      )}
    </ConfirmDialog>
  );
}
