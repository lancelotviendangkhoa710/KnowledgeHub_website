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
  if (!dateString) return 'KnowledgeHub Member';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'KnowledgeHub Member';
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `Member since ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return 'KnowledgeHub Member';
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
          background: 'var(--color-white, #FFFFFF)',
          border: '1px solid var(--color-border, #E8DEDC)',
          borderRadius: 'var(--radius-lg, 12px)',
          boxShadow: 'var(--shadow-sm)',
          padding: '2rem 2.25rem',
          margin: '2rem 0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap', minWidth: 0, maxWidth: '100%' }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary-pale, #F3E5E5) 0%, #E8D5D5 100%)',
              border: '2px solid var(--color-border, #E8DEDC)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.25rem',
              fontWeight: 800,
              color: 'var(--color-primary, #8B0000)',
              boxShadow: '0 2px 8px rgba(139, 0, 0, 0.08)',
              flexShrink: 0,
            }}
          >
            {user.name ? user.name[0].toUpperCase() : 'U'}
          </div>

          <div style={{ minWidth: 0, flex: '1 1 240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <h2
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  margin: 0,
                  color: 'var(--color-charcoal, #242124)',
                  letterSpacing: '-0.02em',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                }}
              >
                {user.name}
              </h2>
              {user.roles?.includes('admin') ? (
                <span
                  style={{
                    backgroundColor: '#DC2626',
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
                    backgroundColor: '#C2410C',
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
                    backgroundColor: 'var(--color-off-white, #FAF7F5)',
                    border: '1px solid var(--color-border, #E8DEDC)',
                    color: 'var(--color-charcoal, #242124)',
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

            <p style={{ margin: '0 0 0.65rem 0', color: 'var(--color-gray, #706B6B)', fontSize: '0.95rem', overflowWrap: 'break-word' }}>
              {user.email}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--color-gray, #706B6B)', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#15803D', fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }} />
                Active
              </span>
              <span style={{ color: '#CBD5E1' }}>•</span>
              <span style={{ color: 'var(--color-gray, #706B6B)' }}>
                {formatTenure(user.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Role Privileges Dashboard */}
      <div
        className="role-privileges-dashboard"
        style={{
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem 2rem',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary-pale, #E0F2FE)',
              color: 'var(--color-primary, #0284C7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-charcoal)' }}>
              Account Roles &amp; Privileges
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-gray)' }}>
              Role-based access controls enforced by KnowledgeHub RBAC
            </p>
          </div>
        </div>

        {user.roles?.includes('admin') ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.25rem',
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              padding: '1.25rem 1.5rem',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: '#166534', fontSize: '1rem', marginBottom: '0.25rem' }}>
                Platform Administrator Privileges
              </div>
              <div style={{ fontSize: '0.88rem', color: '#15803D', lineHeight: 1.5 }}>
                You have full administrative privileges to manage user accounts, assign roles (User, Contributor, Admin), and govern platform-wide curricula.
              </div>
            </div>
            <Link
              href="/admin/users"
              className="button button--primary"
              style={{ padding: '0.65rem 1.35rem', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', textDecoration: 'none' }}
            >
              User &amp; Access Management &rarr;
            </Link>
          </div>
        ) : user.roles?.includes('contributor') ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.25rem',
              background: '#FFF7ED',
              border: '1px solid #FFEDD5',
              padding: '1.25rem 1.5rem',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: '#9A3412', fontSize: '1rem', marginBottom: '0.25rem' }}>
                Contributor Authoring Privileges
              </div>
              <div style={{ fontSize: '0.88rem', color: '#C2410C', lineHeight: 1.5 }}>
                You can author technical course materials, publish immutable version snapshots, and manage your course workbench.
              </div>
            </div>
            <Link
              href="/courses/create"
              className="button button--primary"
              style={{ padding: '0.65rem 1.35rem', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', textDecoration: 'none' }}
            >
              Open Contributor Studio &rarr;
            </Link>
          </div>
        ) : (
          <div
            style={{
              background: 'var(--color-primary-faint, #F0F9FF)',
              border: '1px solid var(--color-primary-pale, #BAE6FD)',
              padding: '1.25rem 1.5rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: '#0369A1', fontSize: '1rem', marginBottom: '0.35rem' }}>
                Contributor Status
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#075985', lineHeight: 1.6 }}>
                Current Role: User. Do you have deep technical expertise and wish to contribute course material? Submit a request to the Administrators to upgrade your role.
              </p>
            </div>
            <a
              href="mailto:admin@knowledgehub.internal?subject=Request%20for%20Contributor%20Access&body=Hello%20KnowledgeHub%20Admin,%0A%0AI%20would%20like%20to%20apply%20for%20Contributor%20privileges%20to%20author%20technical%20curricula%20on%20KnowledgeHub.%0A%0AMy%20technical%20background%20and%20domain%20expertise:%20[Brief%20summary]"
              className="button button--secondary"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', textDecoration: 'none' }}
            >
              Request Contributor Access &rarr;
            </a>
          </div>
        )}
      </div>

      {/* Quick Learning Stats Widget */}
      <div
        className="quick-learning-stats"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* Saved Library Card */}
        <Link
          href="/bookmarks"
          style={{
            textDecoration: 'none',
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-xs)',
            transition: 'border-color var(--transition-fast), transform var(--transition-fast)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary-pale, #E0F2FE)',
                color: 'var(--color-primary, #0284C7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-charcoal)', marginBottom: '0.2rem' }}>
                Saved Library
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-gray)' }}>
                Access your saved courses and references
              </div>
            </div>
          </div>
          <span style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '1.25rem' }}>&rarr;</span>
        </Link>

        {/* AI Roadmaps Card */}
        <Link
          href="/learning/roadmaps"
          style={{
            textDecoration: 'none',
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-xs)',
            transition: 'border-color var(--transition-fast), transform var(--transition-fast)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-charcoal)', marginBottom: '0.2rem' }}>
                Learning Roadmaps
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-gray)' }}>
                Explore AI-guided curricula
              </div>
            </div>
          </div>
          <span style={{ color: '#059669', fontWeight: 700, fontSize: '1.25rem' }}>&rarr;</span>
        </Link>
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
