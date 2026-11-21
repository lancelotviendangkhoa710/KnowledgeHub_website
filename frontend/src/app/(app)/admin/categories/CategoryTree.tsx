import type { AdminCategory } from '@/lib/categoryAdminClient';
import styles from '@/components/content/admin/admin.module.css';

type Props = {
  nodes: AdminCategory[];
  disabled: boolean;
  onEdit: (category: AdminCategory, opener: HTMLElement) => void;
  onDelete: (category: AdminCategory) => void;
  /** Cấp lồng nhau: cấp con được thụt lề bằng CSS. */
  nested?: boolean;
};

/** Một cấp của cây danh mục (danh sách lồng nhau), mỗi dòng có Sửa và Xóa. */
export default function CategoryTree({ nodes, disabled, onEdit, onDelete, nested }: Props) {
  return (
    <ul className={`${styles.treeList} ${nested ? styles.nest : ''}`}>
      {nodes.map((node) => {
        const childCount = node.children?.length ?? 0;
        return (
          <li key={node.id}>
            <div className={styles.cat}>
              <div className={styles.ci}>
                <b>{node.name}</b>
                <small>
                  <code>{node.slug}</code>
                  {typeof node.articles_count === 'number' && ` · ${node.articles_count} khóa học`}
                  {childCount > 0 && ` · ${childCount} danh mục con`}
                </small>
              </div>
              <span className={styles.catActs}>
                <button type="button" className={`${styles.btn} ${styles.ghost} ${styles.sm}`} disabled={disabled} aria-label={`Sửa ${node.name}`} onClick={(event) => onEdit(node, event.currentTarget)}>Sửa</button>
                <button type="button" className={`${styles.btn} ${styles.ghost} ${styles.sm}`} disabled={disabled} aria-label={`Xóa ${node.name}`} onClick={() => onDelete(node)}>Xóa</button>
              </span>
            </div>
            {childCount > 0 && <CategoryTree nodes={node.children ?? []} disabled={disabled} onEdit={onEdit} onDelete={onDelete} nested />}
          </li>
        );
      })}
    </ul>
  );
}
