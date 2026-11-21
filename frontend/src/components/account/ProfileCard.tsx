import Link from 'next/link';
import authStyles from '@/components/auth/authForm.module.css';
import type { AuthUser } from '@/lib/auth';
import styles from './account.module.css';
import { initialOf, roleName } from './useAccountUser';

type Props = { user: AuthUser & { created_at?: string | null } };

function joinedOn(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
}

/** PRF-02: thẻ thông tin bên trái trang hồ sơ, kèm lối tắt theo quyền (từ khối "Quyền và lối tắt" cũ). */
export default function ProfileCard({ user }: Props) {
  const isAdmin = user.roles?.includes('admin');
  const isContributor = user.roles?.includes('contributor');
  const joined = joinedOn(user.created_at);
  const requestMail = `mailto:admin@knowledgehub.internal?subject=${encodeURIComponent('Yêu cầu quyền người đóng góp')}&body=${encodeURIComponent('Xin chào quản trị viên KnowledgeHub,\n\nTôi muốn đăng ký quyền người đóng góp để soạn khóa học trên KnowledgeHub.\n\nKinh nghiệm và chuyên môn của tôi: [Tóm tắt]')}`;

  return (
    <aside className={styles.card} aria-label="Thông tin tài khoản">
      <span className={styles.avatar} aria-hidden="true">{initialOf(user.name)}</span>
      <div className={styles.ident}>
        <h1>{user.name}</h1>
        <p>{user.email}</p>
      </div>
      <Link className={`${authStyles.btn} ${authStyles.ghost}`} href="/account/settings">Sửa hồ sơ</Link>
      <ul className={styles.meta}>
        <li><span className={styles.k}>Vai trò</span><span className={styles.role}>{roleName(user.roles)}</span></li>
        {joined && <li><span className={styles.k}>Ngày tham gia</span><span>{joined}</span></li>}
      </ul>
      <section className={styles.cardSection} aria-labelledby="ac-role">
        <h2 id="ac-role">Quyền và lối tắt</h2>
        <p>
          {isAdmin
            ? 'Bạn có toàn quyền quản lý người dùng, phân quyền và các khóa học trên nền tảng.'
            : isContributor
              ? 'Bạn có thể soạn khóa học, xuất bản phiên bản và quản lý khóa học của mình.'
              : 'Bạn là người học. Nếu muốn đóng góp khóa học, hãy gửi yêu cầu cho quản trị viên.'}
        </p>
        <div className={styles.shortcuts}>
          {isAdmin ? (
            <Link className={authStyles.btn} href="/admin/users">Quản lý người dùng và quyền</Link>
          ) : isContributor ? (
            <Link className={authStyles.btn} href="/courses/create">Mở Studio</Link>
          ) : (
            <a className={`${authStyles.btn} ${authStyles.ghost}`} href={requestMail}>Xin quyền người đóng góp</a>
          )}
          <Link className={`${authStyles.btn} ${authStyles.ghost}`} href="/bookmarks">Khóa học đã lưu</Link>
          <Link className={`${authStyles.btn} ${authStyles.ghost}`} href="/learning/my-roadmaps">Lộ trình của tôi</Link>
        </div>
      </section>
    </aside>
  );
}
