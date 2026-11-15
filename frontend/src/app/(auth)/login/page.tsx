'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
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

// The Google round trip lands on a bare /login, so the page the visitor wanted is parked here (already
// validated) for a few minutes. It is not the OAuth `state`, which still protects the exchange itself.
const REDIRECT_KEY = 'kh_login_redirect';
const REDIRECT_TTL_MS = 10 * 60 * 1000;

function parkRedirect(): void {
  const wanted = new URLSearchParams(window.location.search).get('redirect');
  if (!wanted) return;
  try {
    window.sessionStorage.setItem(REDIRECT_KEY, `${Date.now()}|${getSafeRedirectUrl(wanted)}`);
  } catch {
    // storage blocked: the visitor simply lands on the default page
  }
}

/** The parked destination if it is fresh; always clears it so it cannot leak into a later visit. */
function takeParkedRedirect(): string | null {
  try {
    const raw = window.sessionStorage.getItem(REDIRECT_KEY);
    window.sessionStorage.removeItem(REDIRECT_KEY);
    const [at, path] = (raw ?? '').split('|');
    return path && Date.now() - Number(at) < REDIRECT_TTL_MS ? path : null;
  } catch {
    return null;
  }
}

// Error codes the backend puts in /login?error=... after a Google sign-in attempt (AUTH-07).
const GOOGLE_ERRORS: Record<string, string> = {
  google_failed: 'Google sign-in was cancelled or failed. Please try again.',
  google_unverified: 'Your Google email address is not verified, so it cannot be used to sign in.',
  google_unavailable: 'This account cannot sign in with Google. It may be pending approval or suspended; contact an administrator.',
  google_domain_not_allowed: 'This email domain is not approved for new accounts. Use an approved address (such as a school email) or ask an administrator to allow your domain.',
  google_too_many_signups: 'Too many new accounts were created recently. Please try again later.',
  google_email_unconfirmed: 'Google cannot confirm that you own this email address. Sign in with a Gmail account or your school or work Google account.',
  google_not_configured: 'Google sign-in is not set up on this server.',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const parkedRef = useRef<string | null | undefined>(undefined);

  // Already signed in (cookie session still valid): the API refuses a second login, so skip this page.
  useEffect(() => {
    // A ref: development mode runs this effect twice and the second run must still see the parked value.
    if (parkedRef.current === undefined) parkedRef.current = takeParkedRedirect();
    // Decided now, not inside the callback below: by then the page may already have moved on and lost the query.
    const wanted = getSafeRedirectUrl(new URLSearchParams(window.location.search).get('redirect') ?? parkedRef.current);
    const googleError = new URLSearchParams(window.location.search).get('error');
    // Own keys only: ?error=__proto__ must not resolve to an inherited object.
    if (googleError && Object.prototype.hasOwnProperty.call(GOOGLE_ERRORS, googleError)) setMessage(GOOGLE_ERRORS[googleError]);

    void probeSession().then((user) => {
      if (user) router.replace(wanted);
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
        <a className="button button--secondary" href="/api/auth/google/redirect" onClick={parkRedirect} style={{ width: '100%', minHeight: '2.9rem', marginTop: '0.75rem', textAlign: 'center' }}>Continue with Google</a>
        <p className="auth-switch">New to KnowledgeHub? <Link href="/register">Create an account</Link></p>
      </div>
    </section>
  );
}
