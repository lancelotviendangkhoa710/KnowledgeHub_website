'use client';

import { useMemo, useState } from 'react';
import { diffLines, DiffLine, type ArticleVersionEntry } from '@/lib/versionClient';

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

const markerFor: Record<DiffLine['kind'], { symbol: string; label: string }> = {
  added: { symbol: '+', label: 'Added line' },
  removed: { symbol: '−', label: 'Removed line' },
  equal: { symbol: ' ', label: 'Unchanged line' },
};

const rowStyle: Record<DiffLine['kind'], React.CSSProperties> = {
  // Added: warm-paper surface, solid charcoal bar, bold text. Removed: pale burgundy surface, dashed burgundy bar.
  added: {
    backgroundColor: 'var(--color-off-white)',
    boxShadow: 'inset 6px 0 0 var(--color-charcoal)',
    fontWeight: 600,
  },
  removed: {
    backgroundColor: 'var(--color-primary-pale)',
    borderLeft: '6px dashed var(--color-primary)',
  },
  equal: { backgroundColor: 'var(--color-white)' },
};

const cellBase: React.CSSProperties = {
  padding: '0.1rem 0.5rem',
  verticalAlign: 'top',
  fontFamily: 'var(--font-mono, monospace)',
  fontSize: '0.85rem',
  lineHeight: 1.55,
};

const numCell: React.CSSProperties = {
  ...cellBase,
  width: '3.5rem',
  textAlign: 'right',
  color: 'var(--color-gray)',
  userSelect: 'none',
  whiteSpace: 'nowrap',
};

interface VersionDiffViewProps {
  base: ArticleVersionEntry;
  target: ArticleVersionEntry;
}

/**
 * Unified line diff between two version snapshots.
 * Changes carry +/− markers and screen-reader labels, not only colour.
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
      <p
        role="status"
        aria-live="polite"
        style={{ margin: '0 0 1rem 0', color: 'var(--color-charcoal)', fontSize: 'var(--text-sm)' }}
      >
        Comparing <strong>v{base.version_no}</strong> → <strong>v{target.version_no}</strong>:{' '}
        {identical ? (
          'no differences.'
        ) : (
          <>
            <span>+{result.added} added</span>, <span>{'−'}{result.removed} removed</span>
            {titleChanged ? ', title changed' : ''}.
          </>
        )}
      </p>

      {result.approximate && (
        <p
          style={{
            margin: '0 0 1rem 0',
            padding: '0.6rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-primary-faint)',
            color: 'var(--color-charcoal)',
            fontSize: 'var(--text-sm)',
          }}
        >
          These versions differ too much for a line-by-line match; the changed block is shown as a full replacement.
        </p>
      )}

      {titleChanged && (
        <div style={{ marginBottom: '1rem', fontSize: 'var(--text-sm)' }}>
          <h3 style={{ fontSize: 'var(--text-sm)', margin: '0 0 0.35rem 0', color: 'var(--color-gray)' }}>Title</h3>
          <div style={{ ...rowStyle.removed, padding: '0.35rem 0.75rem', color: 'var(--color-charcoal)' }}>
            <span aria-hidden="true">{'−'} </span>
            <span className="visually-hidden">Old title: </span>
            {base.title || 'Untitled'}
          </div>
          <div style={{ ...rowStyle.added, padding: '0.35rem 0.75rem', color: 'var(--color-charcoal)' }}>
            <span aria-hidden="true">+ </span>
            <span className="visually-hidden">New title: </span>
            {target.title || 'Untitled'}
          </div>
        </div>
      )}

      {identical ? (
        <p style={{ color: 'var(--color-gray)', margin: 0 }}>Both versions have the same title and content.</p>
      ) : result.lines.length === 0 ? null : (
        <div
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflowX: 'auto',
            backgroundColor: 'var(--color-white)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--color-charcoal)' }}>
            <caption className="visually-hidden">
              Line changes from version {base.version_no} to version {target.version_no}
            </caption>
            <thead className="visually-hidden">
              <tr>
                <th scope="col">Line in v{base.version_no}</th>
                <th scope="col">Line in v{target.version_no}</th>
                <th scope="col">Change</th>
                <th scope="col">Text</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, idx) => {
                if (row.type === 'gap') {
                  return (
                    <tr key={`gap-${row.id}`} style={{ backgroundColor: 'var(--color-off-white)' }}>
                      <td colSpan={4} style={{ ...cellBase, textAlign: 'center', padding: '0.25rem' }}>
                        <button
                          type="button"
                          onClick={() => expandGap(row.id)}
                          className="btn btn-outline"
                          style={{ fontSize: 'var(--text-xs)', padding: '0.2rem 0.75rem' }}
                        >
                          Show {row.lines.length} unchanged {row.lines.length === 1 ? 'line' : 'lines'}
                        </button>
                      </td>
                    </tr>
                  );
                }
                const { line } = row;
                const marker = markerFor[line.kind];
                return (
                  <tr key={`l-${idx}-${line.oldNo ?? ''}-${line.newNo ?? ''}`} style={rowStyle[line.kind]}>
                    <td style={numCell}>{line.oldNo ?? ''}</td>
                    <td style={numCell}>{line.newNo ?? ''}</td>
                    <td style={{ ...cellBase, width: '1.5rem', textAlign: 'center', fontWeight: 700 }}>
                      <span aria-hidden="true">{marker.symbol}</span>
                      {line.kind !== 'equal' && <span className="visually-hidden">{marker.label}</span>}
                    </td>
                    <td style={{ ...cellBase, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                      {line.text === '' ? ' ' : line.text}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length > rowLimit && (
            <div style={{ padding: '0.75rem', textAlign: 'center', borderTop: '1px solid var(--color-border)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRowLimit((n) => n + ROW_PAGE)}
              >
                Show more ({rows.length - rowLimit} rows remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
