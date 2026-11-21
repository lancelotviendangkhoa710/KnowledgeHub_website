import styles from '@/components/auth/authForm.module.css';

export type Notice = { kind: 'ok' | 'error'; text: string } | null;

export default function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return notice.kind === 'ok'
    ? <p className={styles.notice} role="status">{notice.text}</p>
    : <p className={styles.error} role="alert">{notice.text}</p>;
}
