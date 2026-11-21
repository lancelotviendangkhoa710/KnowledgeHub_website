import styles from '@/components/content/admin/admin.module.css';

type Props = { page: number; lastPage: number; onPage: (page: number) => void };

/** Trước, Trang n trên m, Sau. Chỉ hiện khi có từ 2 trang. */
export default function UsersPager({ page, lastPage, onPage }: Props) {
  if (lastPage < 2) return null;
  return (
    <nav className={styles.pager} aria-label="Phân trang">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Trước</button>
      <span className={styles.pageText}>Trang {page} trên {lastPage}</span>
      <button type="button" disabled={page >= lastPage} onClick={() => onPage(page + 1)}>Sau</button>
    </nav>
  );
}
