'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import authStyles from '@/components/auth/authForm.module.css';
import styles from '@/components/account/account.module.css';
import DeleteAccountSection from '@/components/account/DeleteAccountSection';
import PasswordForm from '@/components/account/PasswordForm';
import ProfileForm from '@/components/account/ProfileForm';
import { useAccountUser } from '@/components/account/useAccountUser';

const SECTIONS = [
  { id: 'ho-so', label: 'Hồ sơ' },
  { id: 'mat-khau', label: 'Mật khẩu' },
  { id: 'xoa-tai-khoan', label: 'Xóa tài khoản', danger: true },
] as const;
type SectionId = (typeof SECTIONS)[number]['id'];

function sectionFromHash(): SectionId {
  if (typeof window === 'undefined') return 'ho-so';
  const hash = window.location.hash.replace('#', '');
  return SECTIONS.some((section) => section.id === hash) ? (hash as SectionId) : 'ho-so';
}

/** PRF-01: Cài đặt tài khoản. Sidebar chọn một mục (đồng bộ với #hash), trên điện thoại thành tab ngang. */
export default function AccountSettingsPage() {
  const nameTouched = useRef(false); // true once the visitor has typed in the name field
  const [name, setName] = useState('');
  const { user, setUser, refreshing, loadError } = useAccountUser((fresh, { switchedAccount, cachedName }) => {
    if (switchedAccount) {
      // A draft typed for another account must never reach this one.
      nameTouched.current = false;
      setName(fresh.name);
    } else {
      // Keep what the user already typed while /me was loading.
      setName((current) => (current === cachedName ? fresh.name : current));
    }
  });
  const [section, setSection] = useState<SectionId>('ho-so');
  const userId = user?.id ?? null;

  // A draft belongs to one account: when the account changes, drop it and start from that account's name.
  useEffect(() => {
    nameTouched.current = false;
    setName(user?.name ?? '');
    // Only when the signed-in account changes, not on every profile edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const sync = () => setSection(sectionFromHash());
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  if (!user) {
    return (
      <div className={authStyles.acct}>
        <h1>Cần đăng nhập</h1>
        <section className={authStyles.panel}>
          <p>Đăng nhập để xem và quản lý tài khoản của bạn.</p>
          <Link className={authStyles.btn} href="/login?redirect=%2Faccount%2Fsettings">Đăng nhập</Link>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Link className={styles.back} href="/account">← Về trang hồ sơ</Link>
        <h1>Cài đặt tài khoản</h1>
      </header>
      <div className={styles.settings}>
        <nav className={styles.side} aria-label="Mục cài đặt">
          <ul className={styles.sideList}>
            {SECTIONS.map((entry) => (
              <li key={entry.id}>
                {'danger' in entry && <div className={styles.sideSep} aria-hidden="true" />}
                <a
                  href={`#${entry.id}`}
                  className={'danger' in entry ? styles.dangerLink : undefined}
                  aria-current={section === entry.id ? 'true' : undefined}
                  onClick={(event) => {
                    // Đổi mục mà không nhảy trang; vẫn ghi hash để tải lại hoặc chia sẻ link mở đúng mục.
                    event.preventDefault();
                    window.history.replaceState(null, '', `#${entry.id}`);
                    setSection(entry.id);
                  }}
                >
                  {entry.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.content} id={section}>
          {section === 'ho-so' && (
            <ProfileForm
              user={user}
              name={name}
              onNameChange={(value) => { nameTouched.current = true; setName(value); }}
              onSaved={setUser}
              refreshing={refreshing}
              loadError={loadError}
            />
          )}
          {section === 'mat-khau' && <PasswordForm />}
          {section === 'xoa-tai-khoan' && <DeleteAccountSection className={styles.dangerZone} />}
        </div>
      </div>
    </div>
  );
}
