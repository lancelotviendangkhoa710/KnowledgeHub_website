'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import styles from '@/components/auth/authForm.module.css';
import { accountClient, errorMessage } from '@/lib/accountClient';
import type { AuthUser } from '@/lib/auth';
import { getCurrentUser, setCurrentUser, subscribeCurrentUser } from '@/lib/auth';
import { getAccessToken, setAccessToken } from '@/lib/authToken';

type Notice = { kind: 'ok' | 'error'; text: string } | null;

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return notice.kind === 'ok'
    ? <p className={styles.notice} role="status">{notice.text}</p>
    : <p className={styles.error} role="alert">{notice.text}</p>;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<(AuthUser & { created_at?: string | null }) | null>(getCurrentUser);

  const [name, setName] = useState(user?.name ?? '');
  const nameTouched = useRef(false); // true once the visitor has typed in the name field
  const userId = user?.id ?? null;
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

  // Runs again when the user first appears (session restored after load), not only on mount.
  useEffect(() => {
    const cachedUser = getCurrentUser();
    if (!cachedUser) return;
    if (!nameTouched.current) setName(cachedUser.name);
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
      setProfileNotice({ kind: 'error', text: errorMessage(error, 'Không tải lại được hồ sơ của bạn.') });
    }).finally(() => setRefreshing(false));
  }, [userId]);

  if (!user) {
    return (
      <div className={styles.acct}>
        <h1>Cần đăng nhập</h1>
        <section className={styles.panel}>
          <p>Đăng nhập để xem và quản lý tài khoản của bạn.</p>
          <Link className={styles.btn} href="/login">Đăng nhập</Link>
        </section>
      </div>
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
      setProfileNotice({ kind: 'ok', text: 'Đã cập nhật hồ sơ.' });
    } catch (error) {
      setProfileNotice({ kind: 'error', text: errorMessage(error, 'Không cập nhật được hồ sơ.') });
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
      setPwNotice({ kind: 'ok', text: 'Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.' });
    } catch (error) {
      setPwNotice({ kind: 'error', text: errorMessage(error, 'Không đổi được mật khẩu.') });
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
      setDeleteNotice({ kind: 'error', text: errorMessage(error, 'Không xóa được tài khoản.') });
      setDeleting(false);
    }
  }

  const roleName = user.roles?.includes('admin') ? 'Quản trị viên' : user.roles?.includes('contributor') ? 'Người đóng góp' : 'Người học';
  const initial = user.name ? user.name.trim().slice(0, 1).toUpperCase() : 'U';
  const requestMail = `mailto:admin@knowledgehub.internal?subject=${encodeURIComponent('Yêu cầu quyền người đóng góp')}&body=${encodeURIComponent('Xin chào quản trị viên KnowledgeHub,\n\nTôi muốn đăng ký quyền người đóng góp để soạn khóa học trên KnowledgeHub.\n\nKinh nghiệm và chuyên môn của tôi: [Tóm tắt]')}`;

  return (
    <div className={styles.acct}>
      <h1>Tài khoản</h1>
      {/* Chỗ dành cho bảng Hoạt động học tập (mục 7A tài liệu bàn giao): thêm vào đây khi backend sẵn sàng. */}

      <form className={styles.panel} onSubmit={saveProfile} noValidate aria-labelledby="ac-profile">
        <div className={styles.who}>
          <span className={styles.avatar} aria-hidden="true">{initial}</span>
          <div><b>{user.name}</b><span className={styles.mu}>{roleName}</span></div>
        </div>
        <h2 id="ac-profile">Hồ sơ</h2>
        <p>Tên hiển thị xuất hiện trên các khóa học bạn viết.</p>
        <NoticeLine notice={profileNotice} />
        <div className={styles.field}>
          <label htmlFor="ac-name">Họ và tên</label>
          <input id="ac-name" value={name} onChange={(event) => { nameTouched.current = true; setName(event.target.value); }} autoComplete="name" maxLength={255} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="ac-mail">Email</label>
          <input id="ac-mail" value={user.email} readOnly aria-describedby="ac-mail-hint" />
          <small id="ac-mail-hint">Chưa thể đổi email.</small>
        </div>
        <button className={styles.btn} type="submit" disabled={savingProfile || refreshing || !name.trim() || name.trim() === user.name}>
          {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </form>

      <section className={styles.panel} aria-labelledby="ac-role">
        <h2 id="ac-role">Quyền và lối tắt</h2>
        <p>
          {user.roles?.includes('admin')
            ? 'Bạn có toàn quyền quản lý người dùng, phân quyền và các khóa học trên nền tảng.'
            : user.roles?.includes('contributor')
              ? 'Bạn có thể soạn khóa học, xuất bản phiên bản và quản lý khóa học của mình.'
              : 'Bạn là người học. Nếu muốn đóng góp khóa học, hãy gửi yêu cầu cho quản trị viên.'}
        </p>
        <div className={styles.links}>
          {user.roles?.includes('admin') ? (
            <Link className={styles.btn} href="/admin/users">Quản lý người dùng và quyền</Link>
          ) : user.roles?.includes('contributor') ? (
            <Link className={styles.btn} href="/courses/create">Mở Studio</Link>
          ) : (
            <a className={`${styles.btn} ${styles.ghost}`} href={requestMail}>Xin quyền người đóng góp</a>
          )}
          <Link className={`${styles.btn} ${styles.ghost}`} href="/bookmarks">Khóa học đã lưu</Link>
          <Link className={`${styles.btn} ${styles.ghost}`} href="/learning/my-roadmaps">Lộ trình của tôi</Link>
        </div>
      </section>

      <form className={styles.panel} onSubmit={changePassword} noValidate aria-labelledby="ac-pw">
        <h2 id="ac-pw">Đổi mật khẩu</h2>
        <p>Bạn sẽ cần đăng nhập lại trên các thiết bị khác.</p>
        <NoticeLine notice={pwNotice} />
        <div className={styles.field}>
          <label htmlFor="ac-p1">Mật khẩu hiện tại</label>
          <input id="ac-p1" type="password" value={pw.current_password} onChange={pwField('current_password')} autoComplete="current-password" required />
        </div>
        <div className={styles.field}>
          <label htmlFor="ac-p2">Mật khẩu mới</label>
          <input id="ac-p2" type="password" value={pw.password} onChange={pwField('password')} autoComplete="new-password" minLength={8} aria-describedby="ac-p2-hint" required />
          <small id="ac-p2-hint">Ít nhất 8 ký tự.</small>
        </div>
        <div className={styles.field}>
          <label htmlFor="ac-p3">Nhập lại mật khẩu mới</label>
          <input id="ac-p3" type="password" value={pw.password_confirmation} onChange={pwField('password_confirmation')} autoComplete="new-password" required />
        </div>
        <button className={styles.btn} type="submit" disabled={savingPw}>{savingPw ? 'Đang cập nhật...' : 'Đổi mật khẩu'}</button>
      </form>

      <section className={styles.panel} aria-labelledby="ac-del">
        <h2 id="ac-del">Xóa tài khoản</h2>
        <p>Tài khoản sẽ bị xóa và bạn bị đăng xuất khỏi mọi thiết bị. Không thể hoàn tác. Hồ sơ học tập và thanh toán vẫn được giữ lại theo quy định.</p>
        <NoticeLine notice={deleteNotice} />
        {!confirmDelete ? (
          <button type="button" className={`${styles.btn} ${styles.ghost} ${styles.danger}`} onClick={() => setConfirmDelete(true)}>Xóa tài khoản của tôi</button>
        ) : (
          <form onSubmit={deleteAccount} noValidate>
            <div className={styles.field}>
              <label htmlFor="ac-delpw">Nhập mật khẩu để xác nhận</label>
              <input id="ac-delpw" type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} autoComplete="current-password" required />
            </div>
            <div className={styles.row}>
              <button className={`${styles.btn} ${styles.danger}`} type="submit" disabled={deleting || !deletePassword}>
                {deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
              <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={() => { setConfirmDelete(false); setDeletePassword(''); setDeleteNotice(null); }} disabled={deleting}>Hủy</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
