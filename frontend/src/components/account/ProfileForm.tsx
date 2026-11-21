'use client';

import { FormEvent, useState } from 'react';
import styles from '@/components/auth/authForm.module.css';
import { accountClient, errorMessage } from '@/lib/accountClient';
import type { AuthUser } from '@/lib/auth';
import { getCurrentUser, setCurrentUser } from '@/lib/auth';
import NoticeLine, { type Notice } from './NoticeLine';
import { initialOf, roleName } from './useAccountUser';

type Props = {
  user: AuthUser;
  name: string;
  onNameChange: (value: string) => void;
  onSaved: (user: AuthUser) => void;
  refreshing: boolean;
  loadError: string | null;
};

/** Biểu mẫu đổi tên hiển thị (chuyển nguyên từ trang /account cũ). */
export default function ProfileForm({ user, name, onNameChange, onSaved, refreshing, loadError }: Props) {
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const updated = (await accountClient.updateName(name.trim())).data.user;
      // Skip if the user signed out while the request was in flight.
      if (getCurrentUser()?.id === updated.id) {
        onSaved(updated);
        setCurrentUser(updated);
      }
      setNotice({ kind: 'ok', text: 'Đã cập nhật hồ sơ.' });
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error, 'Không cập nhật được hồ sơ.') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.panel} onSubmit={saveProfile} noValidate aria-labelledby="ac-profile">
      <div className={styles.who}>
        <span className={styles.avatar} aria-hidden="true">{initialOf(user.name)}</span>
        <div><b>{user.name}</b><span className={styles.mu}>{roleName(user.roles)}</span></div>
      </div>
      <h2 id="ac-profile">Hồ sơ</h2>
      <p>Tên hiển thị xuất hiện trên các khóa học bạn viết.</p>
      <NoticeLine notice={notice ?? (loadError ? { kind: 'error', text: loadError } : null)} />
      <div className={styles.field}>
        <label htmlFor="ac-name">Họ và tên</label>
        <input id="ac-name" value={name} onChange={(event) => onNameChange(event.target.value)} autoComplete="name" maxLength={255} required />
      </div>
      <div className={styles.field}>
        <label htmlFor="ac-mail">Email</label>
        <input id="ac-mail" value={user.email} readOnly aria-describedby="ac-mail-hint" />
        <small id="ac-mail-hint">Chưa thể đổi email.</small>
      </div>
      <button className={styles.btn} type="submit" disabled={saving || refreshing || !name.trim() || name.trim() === user.name}>
        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
    </form>
  );
}
