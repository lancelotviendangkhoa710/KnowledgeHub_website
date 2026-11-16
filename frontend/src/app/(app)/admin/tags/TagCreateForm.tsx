import Link from 'next/link';
import type { FormEvent } from 'react';
import type { TagRecord } from '@/lib/tagAdminClient';
import styles from '@/components/content/admin/admin.module.css';

/** Kết quả của lần tạo gần nhất, hiện dưới biểu mẫu. */
export type CreateResult =
  | { kind: 'created'; tag: TagRecord }
  | { kind: 'exists'; tag: TagRecord; name: string }
  | { kind: 'error'; message: string };

type Props = {
  name: string;
  onName: (value: string) => void;
  /** Lời nhắc dưới ô nhập: đường dẫn sẽ tạo, hoặc lý do chưa tạo được. */
  hint: string;
  /** Tên đang không hợp lệ (trùng, quá dài, không có chữ Latin hoặc số). */
  problem: boolean;
  /** Chỉ báo đỏ sau khi rời ô hoặc sau khi bấm tạo. */
  touched: boolean;
  onTouch: () => void;
  maxLength: number;
  submitting: boolean;
  canSubmit: boolean;
  onSubmit: (event: FormEvent) => void;
  result: CreateResult | null;
  needsRecheck: boolean;
  loading: boolean;
  onRecheck: () => void;
  sessionExpired: boolean;
  loginUrl: string;
};

/** Biểu mẫu tạo thẻ: xem trước đường dẫn, gợi ý trùng khi gõ, kết quả và lỗi. */
export default function TagCreateForm(props: Props) {
  const { name, onName, hint, problem, touched, onTouch, maxLength, submitting, canSubmit, onSubmit, result, needsRecheck, loading, onRecheck, sessionExpired, loginUrl } = props;
  const showProblem = problem && touched;
  return (
    <form className={`${styles.panel} ${styles.formGap}`} onSubmit={onSubmit} noValidate>
      <div className={styles.panelH}>Tạo thẻ</div>
      <div className={styles.panelB}>
        <div className={styles.field}>
          <label htmlFor="tag-name">Tên thẻ</label>
          <input
            id="tag-name"
            value={name}
            onChange={(event) => onName(event.target.value)}
            onBlur={onTouch}
            maxLength={maxLength + 20}
            autoComplete="off"
            disabled={submitting}
            aria-describedby="tag-name-hint"
            aria-invalid={showProblem}
          />
          <small id="tag-name-hint" className={showProblem ? styles.fieldErr : undefined}>{hint}</small>
        </div>
        <button className={styles.btn} type="submit" disabled={!canSubmit}>
          {submitting ? 'Đang tạo...' : 'Tạo thẻ'}
        </button>

        <div role="status">
          {result?.kind === 'created' && <p className={styles.info}>Đã tạo thẻ “{result.tag.name}” ({result.tag.slug}).</p>}
          {result?.kind === 'exists' && (
            <p className={styles.info}>“{result.name}” đã có dưới tên “{result.tag.name}” ({result.tag.slug}). Không tạo thẻ mới.</p>
          )}
        </div>
        {needsRecheck && (
          <div className={styles.notice} role="alert">
            <p>
              Không kết nối được máy chủ, nên thẻ có thể đã được tạo hoặc chưa. Nút Thử lại sẽ tải lại danh sách trước;
              nút Tạo thẻ bị khóa đến khi tải lại thành công.
            </p>
            <button className={`${styles.btn} ${styles.ghost} ${styles.sm} ${styles.formGap}`} type="button" disabled={loading} onClick={onRecheck}>
              {loading ? 'Đang tải lại...' : 'Thử lại'}
            </button>
          </div>
        )}
        {result?.kind === 'error' && (
          <div className={styles.notice} role="alert">
            <p>{result.message}</p>
            {sessionExpired && <Link href={loginUrl}>Đăng nhập lại</Link>}
          </div>
        )}
      </div>
    </form>
  );
}
