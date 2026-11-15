'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useState } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import styles from '@/components/auth/authForm.module.css';
import { register } from '@/lib/auth';

type FieldErrors = Record<string, string[]>;

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

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
      setMessage(response.message ?? 'Không tạo được tài khoản. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} noValidate>
        <h1>Tạo tài khoản</h1>
        <p className={styles.lead}>Chỉ mất một phút. Bạn có thể đăng ký bằng email trường.</p>
        {message && <p className={styles.notice} role="status">{message}</p>}
        <div className={styles.field}>
          <label htmlFor="au-name">Họ và tên</label>
          <input id="au-name" name="name" value={form.name} onChange={setField('name')} autoComplete="name" aria-invalid={errors.name?.[0] ? true : undefined} aria-describedby={errors.name?.[0] ? 'au-name-err' : undefined} required />
          {errors.name?.[0] && <small id="au-name-err" className={styles.err}>{errors.name[0]}</small>}
        </div>
        <div className={styles.field}>
          <label htmlFor="au-mail">Email</label>
          <input id="au-mail" name="email" type="email" value={form.email} onChange={setField('email')} autoComplete="email" aria-invalid={errors.email?.[0] ? true : undefined} aria-describedby={errors.email?.[0] ? 'au-mail-err' : undefined} required />
          {errors.email?.[0] && <small id="au-mail-err" className={styles.err}>{errors.email[0]}</small>}
        </div>
        <div className={styles.field}>
          <label htmlFor="au-pass">Mật khẩu</label>
          <input id="au-pass" name="password" type="password" value={form.password} onChange={setField('password')} autoComplete="new-password" aria-invalid={errors.password?.[0] ? true : undefined} aria-describedby={errors.password?.[0] ? 'au-pass-err' : undefined} required />
          {errors.password?.[0] && <small id="au-pass-err" className={styles.err}>{errors.password[0]}</small>}
        </div>
        <div className={styles.field}>
          <label htmlFor="au-pass2">Nhập lại mật khẩu</label>
          <input id="au-pass2" name="password_confirmation" type="password" value={form.password_confirmation} onChange={setField('password_confirmation')} autoComplete="new-password" required />
        </div>
        <button className={`${styles.btn} ${styles.full}`} type="submit" disabled={submitting}>{submitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</button>
        <p className={styles.sw}>Đã có tài khoản? <Link href="/login">Đăng nhập</Link></p>
      </form>
    </AuthShell>
  );
}
