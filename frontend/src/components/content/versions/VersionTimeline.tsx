'use client';

import type { ArticleVersionEntry } from '@/lib/versionClient';
import styles from './versions.module.css';

/** dd/mm/yyyy theo giờ máy; trả lại chuỗi gốc nếu không đọc được ngày. */
export function formatVersionDate(value: string | null | undefined): string {
  if (!value) return 'Chưa rõ ngày';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Display name of the version author; never shows contact details returned by the API. */
export function versionAuthorName(version: ArticleVersionEntry): string | null {
  const name = version.creator?.name?.trim();
  return name ? name : null;
}

interface VersionTimelineProps {
  versions: ArticleVersionEntry[];
  selectedId: string | null;
  publishedVersionId: string | null;
  publishedLabel: string;
  /** Id of the newest version, or null when the viewer cannot see it (readers only see the published one). */
  latestId: string | null;
  onSelect: (versionId: string) => void;
}

/** Danh sách phiên bản, mới nhất lên đầu; mỗi mục là một nút bấm được bằng bàn phím. */
export default function VersionTimeline({ versions, selectedId, publishedVersionId, publishedLabel, latestId, onSelect }: VersionTimelineProps) {
  return (
    <ul className={styles.vlist} aria-label="Các phiên bản của khóa học">
      {versions.map((version) => {
        const isPublished = version.id === publishedVersionId;
        const isLatest = version.id === latestId;
        const author = versionAuthorName(version);
        return (
          <li key={version.id}>
            <button type="button" className={styles.vitem} onClick={() => onSelect(version.id)} aria-pressed={version.id === selectedId}>
              <b>Phiên bản {version.version_no}</b>
              <span className={styles.m}>{version.title || 'Chưa có tiêu đề'}</span>
              <span className={styles.m}>
                {author ? `${author}, ` : ''}
                <time dateTime={version.created_at}>{formatVersionDate(version.created_at)}</time>
              </span>
              {(isPublished || isLatest) && (
                <span className={styles.bd}>
                  {isPublished && <span className={`${styles.st} ${styles.ok}`}>{publishedLabel}</span>}
                  {isLatest && <span className={`${styles.st} ${styles.draft}`}>Mới nhất</span>}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
