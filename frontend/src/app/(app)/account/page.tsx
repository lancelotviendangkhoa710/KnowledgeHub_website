'use client';

import Link from 'next/link';
import authStyles from '@/components/auth/authForm.module.css';
import styles from '@/components/account/account.module.css';
import ProfileCard from '@/components/account/ProfileCard';
import { useAccountUser } from '@/components/account/useAccountUser';

/** PRF-02: trang hồ sơ hai cột. Đổi tên, mật khẩu, xóa tài khoản nằm ở /account/settings. */
export default function AccountPage() {
  const { user, loadError } = useAccountUser();

  if (!user) {
    return (
      <div className={authStyles.acct}>
        <h1>Cần đăng nhập</h1>
        <section className={authStyles.panel}>
          <p>Đăng nhập để xem và quản lý tài khoản của bạn.</p>
          <Link className={authStyles.btn} href="/login?redirect=%2Faccount">Đăng nhập</Link>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.profile}>
        <ProfileCard user={user} />
        <div className={styles.main}>
          {loadError && <p className={styles.notice} role="alert">{loadError}</p>}
          {/* Giai đoạn 2–3: lộ trình nổi bật, bảng hoạt động học tập và lịch sử hoạt động. */}
          <section className={styles.placeholder} aria-label="Hoạt động học tập">
            Lộ trình nổi bật và hoạt động học tập của bạn sẽ hiển thị ở đây.
          </section>
        </div>
      </div>
    </div>
  );
}
