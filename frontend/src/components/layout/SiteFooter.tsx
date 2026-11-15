'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/layout/Logo';
import { getCurrentUser, subscribeCurrentUser } from '@/lib/auth';
import { getAccessToken } from '@/lib/authToken';

export default function SiteFooter() {
  // Cùng nguồn trạng thái với SiteHeader/AuthActions: người dùng trong kho `auth` (SiteHeader đã gọi restoreSession)
  // hoặc dấu "đã đăng nhập". Chưa mount thì chưa biết, nên giữ chỗ vô hình để chân trang không nhấp nháy.
  const [mounted, setMounted] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const read = () => setSignedIn(Boolean(getCurrentUser() || getAccessToken()));
    read();
    setMounted(true);
    return subscribeCurrentUser(read);
  }, []);

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
          {!mounted ? (
            <>
              {/* Giữ đủ chiều cao ba dòng, chưa hiện chữ cho tới khi biết trạng thái đăng nhập */}
              <Link href="/login" aria-hidden="true" tabIndex={-1} style={{ visibility: 'hidden' }}>Đăng nhập</Link>
              <Link href="/bookmarks" aria-hidden="true" tabIndex={-1} style={{ visibility: 'hidden' }}>Đã lưu</Link>
              <Link href="/account" aria-hidden="true" tabIndex={-1} style={{ visibility: 'hidden' }}>Tài khoản</Link>
            </>
          ) : signedIn ? (
            <>
              <Link href="/account">Tài khoản</Link>
              <Link href="/bookmarks">Đã lưu</Link>
            </>
          ) : (
            <>
              <Link href="/login">Đăng nhập</Link>
              <Link href="/bookmarks">Đã lưu</Link>
              <Link href="/account">Tài khoản</Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
