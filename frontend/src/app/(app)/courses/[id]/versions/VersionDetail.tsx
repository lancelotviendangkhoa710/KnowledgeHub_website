'use client';

import Select from '@/components/ui/Select';
import VersionDiffView from '@/components/content/versions/VersionDiffView';
import { formatVersionDate, versionAuthorName } from '@/components/content/versions/VersionTimeline';
import type { ArticleVersionEntry } from '@/lib/versionClient';
import styles from '@/components/content/versions/versions.module.css';

export type Mode = 'view' | 'compare';

type Props = {
  versions: ArticleVersionEntry[];
  mode: Mode;
  onMode: (mode: Mode) => void;
  /** Tác giả và quản trị viên mới có thanh Xem / So sánh. */
  canCompare: boolean;
  selected: ArticleVersionEntry | null;
  base: ArticleVersionEntry | null;
  target: ArticleVersionEntry | null;
  onBase: (id: string) => void;
  onTarget: (id: string) => void;
  onSwap: () => void;
  onComparePrevious: () => void;
  canComparePrevious: boolean;
};

/** Cột phải: thanh Xem / So sánh, nội dung phiên bản hoặc kết quả so sánh. */
export default function VersionDetail({ versions, mode, onMode, canCompare, selected, base, target, onBase, onTarget, onSwap, onComparePrevious, canComparePrevious }: Props) {
  const options = versions.map((v) => ({ value: v.id, label: `Phiên bản ${v.version_no}` }));
  const showCompare = canCompare && mode === 'compare';

  return (
    <section className={styles.pn} aria-label="Chi tiết phiên bản">
      {canCompare && (
        <div className={styles.cmpbar}>
          <div className={styles.seg} role="group" aria-label="Chế độ hiển thị">
            <button type="button" aria-pressed={mode === 'view'} onClick={() => onMode('view')}>Xem</button>
            <button type="button" aria-pressed={mode === 'compare'} onClick={() => onMode('compare')}>So sánh</button>
          </div>
          {showCompare && (
            <>
              <span className={styles.lbl}>Gốc</span>
              <Select className={styles.pick} compact ariaLabel="Phiên bản gốc" value={base?.id ?? ''} onChange={onBase} options={options} />
              <button type="button" className={`${styles.btn} ${styles.ghost} ${styles.sm}`} onClick={onSwap}>Đổi chỗ</button>
              <span className={styles.lbl}>So với</span>
              <Select className={styles.pick} compact ariaLabel="Phiên bản so sánh" value={target?.id ?? ''} onChange={onTarget} options={options} />
              <button type="button" className={`${styles.btn} ${styles.ghost} ${styles.sm}`} onClick={onComparePrevious} disabled={!canComparePrevious}>So với bản trước</button>
            </>
          )}
        </div>
      )}

      {!showCompare && selected && (
        <article aria-labelledby="version-title">
          <div className={styles.vhead}>
            <h2 id="version-title">{selected.title || 'Chưa có tiêu đề'}</h2>
            <p>
              Phiên bản {selected.version_no}, {versionAuthorName(selected) ? `${versionAuthorName(selected)}, ` : ''}
              <time dateTime={selected.created_at}>{formatVersionDate(selected.created_at)}</time>
            </p>
          </div>
          <pre className={styles.vpre} tabIndex={0} aria-label={`Nội dung phiên bản ${selected.version_no}`}>
            {selected.content || 'Phiên bản này chưa có nội dung.'}
          </pre>
        </article>
      )}

      {showCompare && (
        versions.length < 2 ? (
          <p className={styles.empty}>Khóa học mới có một phiên bản nên chưa có gì để so sánh.</p>
        ) : base && target ? (
          base.id === target.id ? (
            <p className={styles.empty}>Hai phiên bản giống nhau. Chọn hai phiên bản khác nhau để so sánh.</p>
          ) : (
            <VersionDiffView key={`${base.id}:${target.id}`} base={base} target={target} />
          )
        ) : (
          <p className={styles.empty}>Chọn hai phiên bản để so sánh.</p>
        )
      )}
    </section>
  );
}
