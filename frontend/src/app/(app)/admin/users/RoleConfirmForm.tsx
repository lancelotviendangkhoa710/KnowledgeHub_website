import { useEffect, useRef } from 'react';
import type { AccountUser, AssignableRole } from '@/lib/accountClient';
import styles from '@/components/content/admin/admin.module.css';
import { ROLE_LABEL } from './usersText';

type Props = {
  change: { user: AccountUser; role: AssignableRole };
  password: string;
  busy: boolean;
  onPassword: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Hỏi mật khẩu của quản trị viên đang thao tác khi đổi vai trò từ hoặc sang quản trị viên. */
export default function RoleConfirmForm({ change, password, busy, onPassword, onConfirm, onCancel }: Props) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  return (
    <form className={styles.recover} onSubmit={(event) => { event.preventDefault(); onConfirm(); }}>
      <p>Đổi <strong>{change.user.name}</strong> thành <strong>{ROLE_LABEL[change.role]}</strong>? Nhập mật khẩu của bạn để xác nhận.</p>
      <input ref={input} className={styles.sel} type="password" placeholder="Mật khẩu của bạn" aria-label="Mật khẩu của bạn" autoComplete="current-password" value={password} onChange={(event) => onPassword(event.target.value)} required />
      <button className={`${styles.btn} ${styles.sm}`} type="submit" disabled={busy}>Xác nhận</button>
      <button className={`${styles.btn} ${styles.ghost} ${styles.sm}`} type="button" disabled={busy} onClick={onCancel}>Hủy</button>
    </form>
  );
}
