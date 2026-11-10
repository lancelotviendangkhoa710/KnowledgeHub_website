'use client';

import type { ArticleVersionEntry } from '@/lib/versionClient';

const dateFormatter =
  typeof Intl !== 'undefined'
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : null;

/** Format an ISO timestamp for display; falls back to the raw value when it cannot be parsed. */
export function formatVersionDate(value: string | null | undefined): string {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || !dateFormatter) return value;
  return dateFormatter.format(date);
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
  onSelect: (versionId: string) => void;
}

/** Newest-first list of version snapshots; each entry is a keyboard-focusable button. */
export default function VersionTimeline({
  versions,
  selectedId,
  publishedVersionId,
  publishedLabel,
  onSelect,
}: VersionTimelineProps) {
  return (
    <section aria-label="Course versions">
      <h2
        style={{
          fontSize: 'var(--text-sm)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-gray)',
          margin: '0 0 0.75rem 0',
          fontWeight: 600,
        }}
      >
        {versions.length} {versions.length === 1 ? 'version' : 'versions'}
      </h2>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.5rem' }}>
        {versions.map((version, index) => {
          const isSelected = version.id === selectedId;
          const isPublished = version.id === publishedVersionId;
          const isLatest = index === 0;
          const author = versionAuthorName(version);
          return (
            <li key={version.id}>
              <button
                type="button"
                onClick={() => onSelect(version.id)}
                aria-pressed={isSelected}
                aria-describedby={`version-meta-${version.id}`}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderLeft: `4px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  backgroundColor: isSelected ? 'var(--color-primary-pale)' : 'var(--color-white)',
                  color: 'var(--color-charcoal)',
                  font: 'inherit',
                  display: 'grid',
                  gap: '0.3rem',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>
                    v{version.version_no}
                  </strong>
                  {isPublished && <span className="badge badge-status-published">{publishedLabel}</span>}
                  {isLatest && !isPublished && (
                    <span
                      className="badge"
                      style={{
                        backgroundColor: 'var(--color-off-white)',
                        color: 'var(--color-gray)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      Latest
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 'var(--text-base)',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {version.title || 'Untitled'}
                </span>
                <span id={`version-meta-${version.id}`} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray)' }}>
                  {author ? `${author} · ` : ''}
                  <time dateTime={version.created_at}>{formatVersionDate(version.created_at)}</time>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
