'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { login, probeSession } from '@/lib/auth';

function getSafeRedirectUrl(param: string | null): string {
  if (!param) return '/courses';
  const trimmed = param.trim();
  // Must start with single slash and not be protocol-relative (//) or backslash (/\)
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.startsWith('/\\') &&
    !trimmed.includes('\\') &&
    !/[\r\n\t]/.test(trimmed)
  ) {
    return trimmed;
  }
  return '/courses';
}

// Error codes the backend puts in /login?error=... after a Google sign-in attempt (AUTH-07).
const GOOGLE_ERRORS: Record<string, string> = {
  google_failed: 'Google sign-in was cancelled or failed. Please try again.',
  google_unverified: 'Your Google email address is not verified, so it cannot be used to sign in.',
  google_unavailable: 'This account cannot sign in with Google. It may be pending approval or suspended; contact an administrator.',
  google_domain_not_allowed: 'New accounts can only be created with approved email domains (for example Gmail or a school address). Use one of those or ask an administrator.',
  google_too_many_signups: 'Too many new accounts were created recently. Please try again later.',
  google_not_configured: 'Google sign-in is not set up on this server.',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (cookie session still valid): the API refuses a second login, so skip this page.
  useEffect(() => {
    const googleError = new URLSearchParams(window.location.search).get('error');
    if (googleError && GOOGLE_ERRORS[googleError]) setMessage(GOOGLE_ERRORS[googleError]);

    void probeSession().then((user) => {
      if (user) router.replace(getSafeRedirectUrl(new URLSearchParams(window.location.search).get('redirect')));
    });
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);

    try {
      await login({ email, password });
      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const targetUrl = getSafeRedirectUrl(searchParams?.get('redirect') ?? null);
      router.push(targetUrl);
    } catch (error) {
      const response = error as { message?: string; errors?: Record<string, string[]> };
      setMessage(response.errors?.email?.[0] ?? response.message ?? 'Unable to sign in. Check your credentials and account status.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page content-container">
      <div className="auth-card">
        <h1>Sign in</h1>
        <p className="auth-lead">Continue your learning journey.</p>
        {message && <p className="auth-error" role="alert">{message}</p>}
        <form onSubmit={handleSubmit} noValidate>
          <label className="auth-field">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <label className="auth-field">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
          <button className="button button--primary auth-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in'}</button>
        </form>
        {/* Full-page navigation on purpose: Google's consent screen is not an XHR. */}
        <a className="button button--secondary" href="/api/auth/google/redirect" style={{ width: '100%', minHeight: '2.9rem', marginTop: '0.75rem', textAlign: 'center' }}>Continue with Google</a>
        <p className="auth-switch">New to KnowledgeHub? <Link href="/register">Create an account</Link></p>
      </div>
    </section>
  );
}
