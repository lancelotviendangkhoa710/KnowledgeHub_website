'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { loginErrorText } from '@/components/auth/authErrors';
import GoogleButton from '@/components/auth/GoogleButton';
import AuthShell from '@/components/auth/AuthShell';
import styles from '@/components/auth/authForm.module.css';
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
  google_failed: 'Đăng nhập bằng Google đã bị hủy hoặc không thành công. Vui lòng thử lại.',
  google_unverified: 'Email Google của bạn chưa được xác minh nên không dùng để đăng nhập được.',
  google_unavailable: 'Tài khoản này không thể đăng nhập bằng Google. Có thể tài khoản đang chờ duyệt hoặc bị tạm khóa; hãy liên hệ quản trị viên.',
  google_domain_not_allowed: 'Tên miền email này chưa được duyệt để tạo tài khoản mới. Hãy dùng địa chỉ đã được duyệt (như email trường) hoặc nhờ quản trị viên cho phép tên miền của bạn.',
  google_too_many_signups: 'Gần đây có quá nhiều tài khoản mới được tạo. Vui lòng thử lại sau.',
  google_email_unconfirmed: 'Google không xác nhận được bạn sở hữu địa chỉ email này. Hãy đăng nhập bằng tài khoản Gmail hoặc tài khoản Google của trường hoặc cơ quan.',
  google_not_configured: 'Máy chủ này chưa cấu hình đăng nhập bằng Google.',
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
      setMessage(loginErrorText(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} noValidate>
        <h1>Đăng nhập</h1>
        <p className={styles.lead}>Dùng email bạn đã đăng ký với KnowledgeHub.</p>
        {message && <p id="login-error" className={styles.error} role="alert">{message}</p>}
        <div className={styles.field}>
          <label htmlFor="au-mail">Email</label>
          <input id="au-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="ten@truong.edu.vn" aria-describedby={message ? 'login-error' : undefined} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="au-pass">Mật khẩu</label>
          <input id="au-pass" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" aria-describedby={message ? 'login-error' : undefined} required />
        </div>
        <button className={`${styles.btn} ${styles.full}`} type="submit" disabled={submitting}>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
        <div className={styles.or}>hoặc</div>
        <GoogleButton onClick={parkRedirect} />
        <p className={styles.sw}>Chưa có tài khoản? <Link href="/register">Đăng ký</Link></p>
      </form>
    </AuthShell>
  );
}
