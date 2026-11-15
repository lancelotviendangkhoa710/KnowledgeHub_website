import { StoredDraft } from './editorConstants';
import { formatClock } from './editorUtils';
import styles from './editorLayout.module.css';

export function DraftRecoveryBanner({
  pendingDraft,
  handleRestoreDraft,
  handleDiscardDraft,
}: {
  pendingDraft: StoredDraft;
  handleRestoreDraft: () => void;
  handleDiscardDraft: () => void;
}) {
  return (
    <div className={styles.recover} role="region" aria-label="Khôi phục bản nháp">
      <p>
        <b>Tìm thấy bản nháp chưa lưu:</b> {pendingDraft.title || 'Chưa đặt tên'}, tự lưu lúc {formatClock(pendingDraft.savedAt)}.
      </p>
      <button type="button" onClick={handleRestoreDraft} className={`${styles.btn} ${styles.sm}`}>
        Khôi phục
      </button>
      <button type="button" onClick={handleDiscardDraft} className={`${styles.btn} ${styles.ghost} ${styles.sm}`}>
        Bỏ bản nháp
      </button>
    </div>
  );
}
