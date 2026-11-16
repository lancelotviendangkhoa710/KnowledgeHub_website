import styles from '../editorPreview.module.css';

export function CalloutPreview({
  kind,
  title,
  children,
}: {
  kind: 'note' | 'tip' | 'warning' | 'default';
  title?: string;
  children: React.ReactNode;
}) {
  const variants = {
    note: {
      className: '',
      title: title || 'Lưu ý',
    },
    tip: {
      className: '',
      title: title || 'Mẹo',
    },
    warning: {
      className: styles.warning,
      title: title || 'Cảnh báo',
    },
    default: {
      className: '',
      title: undefined,
    },
  }[kind];

  return (
    <div className={`${styles.callout} ${variants.className}`}>
      {variants.title && (
        <div className={styles.calloutTitle}>
          {variants.title}
        </div>
      )}
      <div className={styles.calloutBody}>{children}</div>
    </div>
  );
}
