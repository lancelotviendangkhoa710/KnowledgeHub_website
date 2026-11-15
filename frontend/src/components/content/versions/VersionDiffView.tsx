'use client';

import { useMemo, useState } from 'react';
import { diffLines, DiffLine, type ArticleVersionEntry } from '@/lib/versionClient';
import styles from './versions.module.css';

/** Unchanged lines kept visible around each change. */
const CONTEXT_LINES = 3;
/** Rows rendered per "show more" step, so very long diffs do not block the main thread. */
const ROW_PAGE = 1500;

type Row =
  | { type: 'line'; line: DiffLine }
  | { type: 'gap'; id: number; lines: DiffLine[] };

/** Collapse long runs of unchanged lines into expandable gaps, keeping CONTEXT_LINES around changes. */
function buildRows(lines: DiffLine[], expanded: Set<number>): Row[] {
  const rows: Row[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].kind !== 'equal') {
      rows.push({ type: 'line', line: lines[i] });
      i++;
      continue;
    }
    let j = i;
    while (j < lines.length && lines[j].kind === 'equal') j++;
    const run = lines.slice(i, j);
    const keepHead = i === 0 ? 0 : CONTEXT_LINES;
    const keepTail = j === lines.length ? 0 : CONTEXT_LINES;
    const gapId = i;
    if (run.length > keepHead + keepTail + 1 && !expanded.has(gapId)) {
      run.slice(0, keepHead).forEach((line) => rows.push({ type: 'line', line }));
      rows.push({ type: 'gap', id: gapId, lines: run.slice(keepHead, run.length - keepTail) });
      run.slice(run.length - keepTail).forEach((line) => rows.push({ type: 'line', line }));
    } else {
      run.forEach((line) => rows.push({ type: 'line', line }));
    }
    i = j;
  }
  return rows;
}

const MARKER: Record<DiffLine['kind'], { symbol: string; label: string; className: string }> = {
  added: { symbol: '+', label: 'Thêm: ', className: styles.add },
  removed: { symbol: '−', label: 'Xóa: ', className: styles.del },
  equal: { symbol: '', label: '', className: '' },
};

interface VersionDiffViewProps {
  base: ArticleVersionEntry;
  target: ArticleVersionEntry;
}

/**
 * So sánh từng dòng giữa hai phiên bản.
 * Dòng thay đổi có dấu +/− và chữ ẩn cho trình đọc màn hình, không chỉ dựa vào màu.
 * Mount with a `key` built from both version ids so expansion state resets on selection change.
 */
export default function VersionDiffView({ base, target }: VersionDiffViewProps) {
  const result = useMemo(() => diffLines(base.content ?? '', target.content ?? ''), [base.content, target.content]);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [rowLimit, setRowLimit] = useState<number>(ROW_PAGE);

  const rows = useMemo(() => buildRows(result.lines, expanded), [result.lines, expanded]);
  const visibleRows = rows.slice(0, rowLimit);
  const titleChanged = (base.title ?? '') !== (target.title ?? '');
  const identical = result.added === 0 && result.removed === 0 && !titleChanged;

  /** Reveal a collapsed run of unchanged lines. */
  const expandGap = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div className={styles.dsum} role="status" aria-live="polite">
        <span className={styles.sr}>So sánh phiên bản {base.version_no} với phiên bản {target.version_no}: </span>
        {identical ? (
          <span>Hai phiên bản có cùng tiêu đề và nội dung.</span>
        ) : (
          <>
            <span><span className={styles.a}>+{result.added} dòng</span> thêm</span>
            <span><span className={styles.r}>−{result.removed} dòng</span> xóa</span>
          </>
        )}
      </div>

      {result.approximate && (
        <p className={styles.approx}>Hai phiên bản khác nhau quá nhiều để so từng dòng, nên khối thay đổi được hiện như một lần thay thế toàn bộ (kết quả chỉ là gần đúng).</p>
      )}

      {titleChanged && (
        <div className={styles.tchg}>
          Tiêu đề đổi: <s>{base.title || 'Chưa có tiêu đề'}</s> thành <ins>{target.title || 'Chưa có tiêu đề'}</ins>
        </div>
      )}

      {!identical && result.lines.length > 0 && (
        <>
          <div className={styles.diff} role="region" aria-label="So sánh nội dung" tabIndex={0}>
            {visibleRows.map((row, idx) => {
              if (row.type === 'gap') {
                return (
                  <button key={`gap-${row.id}`} type="button" className={styles.fold} onClick={() => expandGap(row.id)}>
                    Hiện {row.lines.length} dòng không đổi
                  </button>
                );
              }
              const { line } = row;
              const marker = MARKER[line.kind];
              return (
                <div key={`l-${idx}-${line.oldNo ?? ''}-${line.newNo ?? ''}`} className={`${styles.dl} ${marker.className}`}>
                  <span className={styles.n}>{line.oldNo ?? ''}</span>
                  <span className={styles.n}>{line.newNo ?? ''}</span>
                  <span className={styles.mk} aria-hidden="true">{marker.symbol}</span>
                  <span className={styles.tx}>
                    {marker.label && <span className={styles.sr}>{marker.label}</span>}
                    {line.text === '' ? ' ' : line.text}
                  </span>
                </div>
              );
            })}
          </div>
          {rows.length > rowLimit && (
            <div className={styles.more}>
              <button type="button" className={`${styles.btn} ${styles.ghost} ${styles.sm}`} onClick={() => setRowLimit((n) => n + ROW_PAGE)}>
                Hiện thêm (còn {rows.length - rowLimit} dòng)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
