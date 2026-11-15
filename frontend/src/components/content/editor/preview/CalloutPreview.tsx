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
      className: styles.note,
      title: title || 'Lưu ý',
      icon: null,
    },
    tip: {
      className: styles.tip,
      title: title || 'Mẹo',
      icon: null,
    },
    warning: {
      className: styles.warning,
      title: title || 'Cảnh báo',
      icon: null,
    },
    default: {
      className: '',
      title: undefined,
      icon: null,
    },
  }[kind];

  return (
    <div className={`${styles.callout} ${variants.className}`}>
      {variants.title && (
        <div className={styles.calloutTitle}>
          {variants.icon}
          <span>{variants.title}</span>
        </div>
      )}
      <div className={styles.calloutBody}>{children}</div>
    </div>
  );
}
