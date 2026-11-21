'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import styles from '@/components/auth/authForm.module.css';
import { accountClient, errorMessage } from '@/lib/accountClient';
import NoticeLine, { type Notice } from './NoticeLine';

const EMPTY = { current_password: '', password: '', password_confirmation: '' };

/** Biểu mẫu đổi mật khẩu (chuyển nguyên từ trang /account cũ). */
export default function PasswordForm() {
  const [pw, setPw] = useState(EMPTY);
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);

  const pwField = (key: keyof typeof pw) => (event: ChangeEvent<HTMLInputElement>) =>
    setPw((current) => ({ ...current, [key]: event.target.value }));

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await accountClient.changePassword(pw);
      setPw(EMPTY);
      setNotice({ kind: 'ok', text: 'Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.' });
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error, 'Không đổi được mật khẩu.') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.panel} onSubmit={changePassword} noValidate aria-labelledby="ac-pw">
      <h2 id="ac-pw">Đổi mật khẩu</h2>
      <p>Bạn sẽ cần đăng nhập lại trên các thiết bị khác.</p>
      <NoticeLine notice={notice} />
      <div className={styles.field}>
        <label htmlFor="ac-p1">Mật khẩu hiện tại</label>
        <input id="ac-p1" type="password" value={pw.current_password} onChange={pwField('current_password')} autoComplete="current-password" required />
      </div>
      <div className={styles.field}>
        <label htmlFor="ac-p2">Mật khẩu mới</label>
        <input id="ac-p2" type="password" value={pw.password} onChange={pwField('password')} autoComplete="new-password" minLength={8} aria-describedby="ac-p2-hint" required />
        <small id="ac-p2-hint">Ít nhất 8 ký tự.</small>
      </div>
      <div className={styles.field}>
        <label htmlFor="ac-p3">Nhập lại mật khẩu mới</label>
        <input id="ac-p3" type="password" value={pw.password_confirmation} onChange={pwField('password_confirmation')} autoComplete="new-password" required />
      </div>
      <button className={styles.btn} type="submit" disabled={saving}>{saving ? 'Đang cập nhật...' : 'Đổi mật khẩu'}</button>
    </form>
  );
}
