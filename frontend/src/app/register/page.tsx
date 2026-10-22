'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { register } from '@/lib/auth';

type FieldErrors = Record<string, string[]>;

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage('');
    setSubmitting(true);

    try {
      const response = await register(form);
      setMessage(response.message);
      setForm({ name: '', email: '', password: '', password_confirmation: '' });
    } catch (error) {
      const response = error as { errors?: FieldErrors; message?: string };
      setErrors(response.errors ?? {});
      setMessage(response.message ?? 'Unable to create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page container">
      <div className="auth-card">
        <span className="badge badge-gold">Start learning</span>
        <h1>Create your account</h1>
        <p className="auth-lead">Join KnowledgeHub and build your learning path.</p>
        {message && <p className="auth-message" role="status">{message}</p>}
        <form onSubmit={handleSubmit} noValidate>
          <label className="auth-field">Name<input name="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" required />{errors.name?.[0] && <small>{errors.name[0]}</small>}</label>
          <label className="auth-field">Email<input name="email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" required />{errors.email?.[0] && <small>{errors.email[0]}</small>}</label>
          <label className="auth-field">Password<input name="password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" required />{errors.password?.[0] && <small>{errors.password[0]}</small>}</label>
          <label className="auth-field">Confirm password<input name="password_confirmation" type="password" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} autoComplete="new-password" required /></label>
          <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'}</button>
        </form>
        <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
      </div>
    </section>
  );
}
