'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import authStyles from '@/components/auth/authForm.module.css';
import RoadmapEditor from '@/components/learning/RoadmapEditor';
import { getAccessToken } from '@/lib/authToken';

function NewRoadmap() {
  const template = useSearchParams()?.get('template') ?? null;
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => setSignedIn(Boolean(getAccessToken())), []);

  if (signedIn === null) return <p role="status" style={{ padding: 24 }}>Đang tải…</p>;
  if (!signedIn) {
    const back = `/learning/my-roadmaps/new${template ? `?template=${encodeURIComponent(template)}` : ''}`;
    return (
      <div className={authStyles.acct}>
        <h1>Cần đăng nhập</h1>
        <section className={authStyles.panel}>
          <p>Đăng nhập để tạo và lưu lộ trình của bạn.</p>
          <Link className={authStyles.btn} href={`/login?redirect=${encodeURIComponent(back)}`}>Đăng nhập</Link>
        </section>
      </div>
    );
  }
  return <RoadmapEditor templateId={template} />;
}

/** LRN-FE-02: tạo lộ trình mới, có thể bắt đầu từ mẫu qua ?template=<id>. */
export default function NewRoadmapPage() {
  return <Suspense fallback={<p role="status" style={{ padding: 24 }}>Đang tải…</p>}><NewRoadmap /></Suspense>;
}
