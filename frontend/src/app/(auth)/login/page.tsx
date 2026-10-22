'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { login } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);

    try {
      await login({ email, password });
      window.location.href = '/courses';
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
        <p className="auth-switch">New to KnowledgeHub? <Link href="/register">Create an account</Link></p>
      </div>
    </section>
  );
}
