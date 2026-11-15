import Link from 'next/link';
import type { Article } from '@/types/content';
import styles from './studio.module.css';
import { courseTitle, formatDate } from './studioUtils';

type RowProps = {
  article: Article;
  publishing: boolean;
  archiving: boolean;
  onPublish: (id: string) => void;
  onArchive: (article: Article) => void;
};

const STATUS: Record<Article['status'], { label: string; className: string }> = {
  published: { label: 'Đã xuất bản', className: styles.ok },
  draft: { label: 'Bản nháp', className: styles.draft },
  archived: { label: 'Đã lưu trữ', className: styles.bad },
};

function CourseRow({ article, publishing, archiving, onPublish, onArchive }: RowProps) {
  const title = courseTitle(article);
  const isDraft = article.status === 'draft';
  const isPublished = article.status === 'published';
  const status = STATUS[article.status];
  const tags = article.tags ?? [];
  const newVersionHref = `/courses/create?parent_id=${article.id}`;

  return (
    <tr>
      <td className={styles.title}>
        <Link href={isPublished ? `/courses/${article.slug}` : newVersionHref}>{title}</Link>
        <small>/{article.slug}</small>
      </td>
      <td>
        {article.category ? article.category.name : <span className={styles.muted}>Chưa có danh mục</span>}
        {tags.length > 0 && (
          <div className={styles.tags}>
            {tags.slice(0, 2).map((tag) => <span key={tag.id} className={styles.pill}>{tag.name}</span>)}
            {tags.length > 2 && <span className={styles.pill}>+{tags.length - 2}</span>}
          </div>
        )}
      </td>
      <td><span className={`${styles.st} ${status.className}`}>{status.label}</span></td>
      <td className={styles.date}>
        {formatDate(article.updated_at || article.created_at)}
        {article.published_at && <small>Xuất bản {formatDate(article.published_at)}</small>}
      </td>
      <td>
        <div className={styles.acts}>
          <Link className={`${styles.btn} ${styles.ghost} ${styles.sm}`} href={`/courses/${article.slug}`} aria-label={`Xem khóa học ${title}`}>Xem</Link>
          <Link className={`${styles.btn} ${styles.ghost} ${styles.sm}`} href={newVersionHref} aria-label={`Tạo phiên bản mới của khóa học ${title}`}>Phiên bản mới</Link>
          <Link className={`${styles.btn} ${styles.ghost} ${styles.sm}`} href={`/courses/${article.id}/versions`} aria-label={`Lịch sử phiên bản của khóa học ${title}`}>Lịch sử</Link>
          {isDraft && (
            <button type="button" className={`${styles.btn} ${styles.sm}`} onClick={() => onPublish(article.id)} disabled={publishing} aria-label={`Xuất bản khóa học ${title}`}>
              {publishing ? 'Đang xuất bản...' : 'Xuất bản'}
            </button>
          )}
          {isPublished && (
            <button type="button" className={`${styles.btn} ${styles.ghost} ${styles.sm}`} onClick={() => onArchive(article)} disabled={archiving} aria-label={`Lưu trữ khóa học ${title}`}>
              {archiving ? 'Đang lưu trữ...' : 'Lưu trữ'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

type TableProps = {
  articles: Article[];
  publishingId: string | null;
  archivingId: string | null;
  onPublish: (id: string) => void;
  onArchive: (article: Article) => void;
};

/** Bảng khóa học của người đóng góp: cuộn ngang trong khung khi màn hẹp. */
export default function StudioTable({ articles, publishingId, archivingId, onPublish, onArchive }: TableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>Khóa học của bạn</caption>
        <thead>
          <tr>
            <th scope="col">Khóa học</th>
            <th scope="col">Danh mục và thẻ</th>
            <th scope="col">Trạng thái</th>
            <th scope="col">Cập nhật</th>
            <th scope="col"><span className={styles.srOnly}>Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => (
            <CourseRow
              key={article.id}
              article={article}
              publishing={publishingId === article.id}
              archiving={archivingId === article.id}
              onPublish={onPublish}
              onArchive={onArchive}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
