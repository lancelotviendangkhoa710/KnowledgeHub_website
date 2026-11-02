'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { accountClient, errorMessage } from '@/lib/accountClient';
import { getCurrentUser, logout, setCurrentUser } from '@/lib/auth';

type Notice = { kind: 'ok' | 'error'; text: string } | null;

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return notice.kind === 'ok'
    ? <p className="auth-message" role="status">{notice.text}</p>
    : <p className="auth-error" role="alert">{notice.text}</p>;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState(getCurrentUser);

  const [name, setName] = useState(user?.name ?? '');
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [pwNotice, setPwNotice] = useState<Notice>(null);
  const [savingPw, setSavingPw] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteNotice, setDeleteNotice] = useState<Notice>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!getCurrentUser()) return;
    accountClient.me().then((response) => {
      setUser(response.data.user);
      setName(response.data.user.name);
    }).catch(() => undefined);
  }, []);

  if (!user) {
    return (
      <section className="auth-page content-container">
        <div className="auth-card">
          <p className="eyebrow">Account</p>
          <h1>Sign in required</h1>
          <p className="auth-lead">Sign in to view and manage your account.</p>
          <Link className="button button--primary auth-submit" href="/login">Sign in</Link>
        </div>
      </section>
    );
  }

  const pwField = (key: keyof typeof pw) => (event: ChangeEvent<HTMLInputElement>) =>
    setPw((current) => ({ ...current, [key]: event.target.value }));

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);
    try {
      const updated = (await accountClient.updateName(name.trim())).data.user;
      setUser(updated);
      setCurrentUser(updated);
      setProfileNotice({ kind: 'ok', text: 'Profile updated.' });
    } catch (error) {
      setProfileNotice({ kind: 'error', text: errorMessage(error, 'Unable to update your profile.') });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setSavingPw(true);
    setPwNotice(null);
    try {
      await accountClient.changePassword(pw);
      setPw({ current_password: '', password: '', password_confirmation: '' });
      setPwNotice({ kind: 'ok', text: 'Password changed. Your other devices were signed out.' });
    } catch (error) {
      setPwNotice({ kind: 'error', text: errorMessage(error, 'Unable to change your password.') });
    } finally {
      setSavingPw(false);
    }
  }

  async function deleteAccount(event: FormEvent) {
    event.preventDefault();
    setDeleting(true);
    setDeleteNotice(null);
    try {
      await accountClient.deleteAccount(deletePassword);
      // The server already revoked every token; logout() clears local state
      // (its 401 is expected and handled).
      await logout();
      router.push('/');
    } catch (error) {
      setDeleteNotice({ kind: 'error', text: errorMessage(error, 'Unable to delete your account.') });
      setDeleting(false);
    }
  }

  return (
    <section className="account-page content-container">
      <p className="eyebrow">Account</p>
      <h1>Your account</h1>
      <p className="auth-lead">Signed in as {user.email}</p>

      <div className="account-card">
        <h2>Profile</h2>
        <NoticeLine notice={profileNotice} />
        <form onSubmit={saveProfile} noValidate>
          <label className="auth-field">Name
            <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={255} required />
          </label>
          <label className="auth-field">Email
            <input value={user.email} disabled readOnly />
            <small className="account-hint">Email cannot be changed yet.</small>
          </label>
          <button className="button button--primary account-submit" type="submit" disabled={savingProfile || !name.trim() || name.trim() === user.name}>
            {savingProfile ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>

      <div className="account-card">
        <h2>Change password</h2>
        <NoticeLine notice={pwNotice} />
        <form onSubmit={changePassword} noValidate>
          <label className="auth-field">Current password
            <input type="password" value={pw.current_password} onChange={pwField('current_password')} autoComplete="current-password" required />
          </label>
          <label className="auth-field">New password
            <input type="password" value={pw.password} onChange={pwField('password')} autoComplete="new-password" minLength={8} required />
            <small className="account-hint">At least 8 characters.</small>
          </label>
          <label className="auth-field">Confirm new password
            <input type="password" value={pw.password_confirmation} onChange={pwField('password_confirmation')} autoComplete="new-password" required />
          </label>
          <button className="button button--primary account-submit" type="submit" disabled={savingPw}>
            {savingPw ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>

      <div className="account-card account-card--danger">
        <h2>Delete account</h2>
        <p className="auth-lead">
          Your account will be removed and you will be signed out everywhere. Learning and billing records are retained
          as required.
        </p>
        <NoticeLine notice={deleteNotice} />
        {!confirmDelete ? (
          <button type="button" className="button button--secondary" onClick={() => setConfirmDelete(true)}>Delete my account</button>
        ) : (
          <form onSubmit={deleteAccount} noValidate>
            <label className="auth-field">Confirm with your password
              <input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} autoComplete="current-password" required />
            </label>
            <div className="account-actions">
              <button className="button button--primary" type="submit" disabled={deleting || !deletePassword}>
                {deleting ? 'Deleting...' : 'Permanently delete'}
              </button>
              <button type="button" className="button button--secondary" onClick={() => { setConfirmDelete(false); setDeletePassword(''); setDeleteNotice(null); }} disabled={deleting}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
