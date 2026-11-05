'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { accountClient, errorMessage } from '@/lib/accountClient';
import type { AuthUser } from '@/lib/auth';
import { getCurrentUser, setCurrentUser, subscribeCurrentUser } from '@/lib/auth';
import { getAccessToken, setAccessToken } from '@/lib/authToken';

type Notice = { kind: 'ok' | 'error'; text: string } | null;

function formatTenure(dateString?: string | null): string {
  if (!dateString) return 'Thành viên KnowledgeHub';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Thành viên KnowledgeHub';
    return `Thành viên từ tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
  } catch {
    return 'Thành viên KnowledgeHub';
  }
}

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return notice.kind === 'ok'
    ? <p className="auth-message" role="status">{notice.text}</p>
    : <p className="auth-error" role="alert">{notice.text}</p>;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<(AuthUser & { created_at?: string | null }) | null>(getCurrentUser);

  const [name, setName] = useState(user?.name ?? '');
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // /me in flight: cached data may be stale

  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [pwNotice, setPwNotice] = useState<Notice>(null);
  const [savingPw, setSavingPw] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteNotice, setDeleteNotice] = useState<Notice>(null);
  const [deleting, setDeleting] = useState(false);

  // Follow sign-out / sign-in done elsewhere (e.g. the header).
  useEffect(() => subscribeCurrentUser(() => setUser(getCurrentUser())), []);

  useEffect(() => {
    if (!getCurrentUser()) return;
    const tokenAtRequest = getAccessToken();
    setRefreshing(true);
    accountClient.me().then((response) => {
      // Read the cached name before setCurrentUser overwrites it.
      const cachedName = getCurrentUser()?.name ?? '';
      setUser(response.data.user);
      setCurrentUser(response.data.user);
      // Keep what the user already typed while /me was loading.
      setName((current) => (current === cachedName ? response.data.user.name : current));
    }).catch((error: { status?: number }) => {
      // Token revoked: drop the local session so the page shows signed-out state.
      if (error?.status === 401) {
        // Ignore a stale 401 if the user signed in again meanwhile.
        if (getAccessToken() === tokenAtRequest) {
          setAccessToken(null);
          setCurrentUser(null);
        }
        return;
      }
      setProfileNotice({ kind: 'error', text: errorMessage(error, 'Unable to refresh your profile.') });
    }).finally(() => setRefreshing(false));
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
      // Skip if the user signed out while the request was in flight.
      if (getCurrentUser()?.id === updated.id) {
        setUser(updated);
        setCurrentUser(updated);
      }
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
      // The server already revoked every token, so clear local state directly.
      setAccessToken(null);
      setCurrentUser(null);
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

      {/* Profile Overview Hero Card */}
      <div
        className="account-hero-card"
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem',
          color: '#FFFFFF',
          margin: '2rem 0',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
              border: '3px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.25rem',
              fontWeight: 800,
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              flexShrink: 0,
            }}
          >
            {user.name ? user.name[0].toUpperCase() : 'U'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                {user.name}
              </h2>
              {user.roles?.includes('admin') ? (
                <span
                  style={{
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    textTransform: 'uppercase',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  ADMIN
                </span>
              ) : user.roles?.includes('contributor') ? (
                <span
                  style={{
                    backgroundColor: '#EA580C',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    textTransform: 'uppercase',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  CONTRIBUTOR
                </span>
              ) : (
                <span
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#E2E8F0',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    textTransform: 'uppercase',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  USER
                </span>
              )}
            </div>

            <p style={{ margin: '0 0 0.65rem 0', color: '#94A3B8', fontSize: '0.95rem' }}>
              {user.email}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: '#CBD5E1', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#4ADE80', fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4ADE80', display: 'inline-block' }} />
                Hoạt động (Active)
              </span>
              <span style={{ color: '#64748B' }}>•</span>
              <span style={{ color: '#E2E8F0' }}>
                {formatTenure(user.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

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
          <button className="button button--primary account-submit" type="submit" disabled={savingProfile || refreshing || !name.trim() || name.trim() === user.name}>
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
