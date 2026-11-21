'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/components/auth/authForm.module.css';
import { accountClient, errorMessage } from '@/lib/accountClient';
import { setCurrentUser } from '@/lib/auth';
import { setAccessToken } from '@/lib/authToken';
import NoticeLine, { type Notice } from './NoticeLine';

/** Vùng xóa tài khoản (chuyển nguyên từ trang /account cũ): hỏi mật khẩu rồi mới xóa. */
export default function DeleteAccountSection({ className }: { className?: string }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount(event: FormEvent) {
    event.preventDefault();
    setDeleting(true);
    setNotice(null);
    try {
      await accountClient.deleteAccount(password);
      // The server already revoked every token, so clear local state directly.
      setAccessToken(null);
      setCurrentUser(null);
      router.push('/');
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error, 'Không xóa được tài khoản.') });
      setDeleting(false);
    }
  }

  return (
    <section className={`${styles.panel} ${className ?? ''}`} aria-labelledby="ac-del">
      <h2 id="ac-del">Xóa tài khoản</h2>
      <p>Tài khoản sẽ bị xóa và bạn bị đăng xuất khỏi mọi thiết bị. Không thể hoàn tác. Hồ sơ học tập và thanh toán vẫn được giữ lại theo quy định.</p>
      <NoticeLine notice={notice} />
      {!confirmDelete ? (
        <button type="button" className={`${styles.btn} ${styles.ghost} ${styles.danger}`} onClick={() => setConfirmDelete(true)}>Xóa tài khoản của tôi</button>
      ) : (
        <form onSubmit={deleteAccount} noValidate>
          <div className={styles.field}>
            <label htmlFor="ac-delpw">Nhập mật khẩu để xác nhận</label>
            <input id="ac-delpw" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          </div>
          <div className={styles.row}>
            <button className={`${styles.btn} ${styles.danger}`} type="submit" disabled={deleting || !password}>
              {deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </button>
            <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={() => { setConfirmDelete(false); setPassword(''); setNotice(null); }} disabled={deleting}>Hủy</button>
          </div>
        </form>
      )}
    </section>
  );
}
