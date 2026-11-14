import Link from 'next/link';
import Logo from '@/components/layout/Logo';

export default function SiteFooter() {
  return (
    <div className="kh-wrap kh-foot__inner">
      <div>
        <Logo />
        <p>Nền tảng học tập có chọn lọc, kèm trợ lý AI. Do đội ngũ nội dung KnowledgeHub vận hành.</p>
      </div>
      <nav aria-label="Chân trang">
        <div>
          <b>Học tập</b>
          <Link href="/courses">Khóa học</Link>
          <Link href="/learning/roadmaps">Lộ trình</Link>
          <Link href="/ai/companion">Trợ lý AI</Link>
        </div>
        <div>
          <b>Tài khoản</b>
          <Link href="/login">Đăng nhập</Link>
          <Link href="/bookmarks">Đã lưu</Link>
          <Link href="/account">Tài khoản</Link>
        </div>
      </nav>
    </div>
  );
}
