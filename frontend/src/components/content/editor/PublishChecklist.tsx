import { buildQualityChecks } from './editorUtils';
import layout from './editorLayout.module.css';
import styles from './editorChecklist.module.css';

export function PublishChecklist({ qualityChecks }: { qualityChecks: ReturnType<typeof buildQualityChecks> }) {
  return (
    <section
      className={`${layout.pn} ${styles.pre} ${qualityChecks.isAllPassed ? styles.ready : ''}`}
      aria-label="Kiểm tra trước khi xuất bản"
    >
      <div className={styles.preH}>
        Kiểm tra trước khi xuất bản
        <span>
          {qualityChecks.passedCount}/{qualityChecks.totalCount} điều kiện đạt{qualityChecks.isAllPassed ? ' · Sẵn sàng xuất bản' : ''}
        </span>
      </div>

      {/* Quality Progress Meter */}
      <div className={styles.meter} aria-hidden="true">
        <b style={{ width: `${(qualityChecks.passedCount / qualityChecks.totalCount) * 100}%` }} />
      </div>

      <ul className={styles.chk}>
        {qualityChecks.items.map((item) => (
          <li key={item.id} className={item.valid ? styles.ok : undefined}>
            <span className={styles.dot} aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <div>
              <span className={styles.sr}>{item.valid ? 'Đạt: ' : 'Chưa đạt: '}</span>
              {item.label}
              <small>{item.detail}</small>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
