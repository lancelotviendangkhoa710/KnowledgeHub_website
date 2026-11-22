'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import authStyles from '@/components/auth/authForm.module.css';
import RoadmapEditor from '@/components/learning/RoadmapEditor';
import { getAccessToken } from '@/lib/authToken';
import { roadmapClient } from '@/lib/roadmapClient';
import type { LearningRoadmap } from '@/types/learning';

type State = { kind: 'loading' } | { kind: 'signed-out' } | { kind: 'not-found' } | { kind: 'error' } | { kind: 'ready'; roadmap: LearningRoadmap };

/** LRN-FE-02: sửa lộ trình của chính mình. */
export default function EditRoadmapPage() {
  const id = useParams<{ id: string }>()?.id ?? '';
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    const session = getAccessToken();
    if (!session) { setState({ kind: 'signed-out' }); return; }
    roadmapClient.get(id).then((result) => {
      if (active && getAccessToken() === session) setState({ kind: 'ready', roadmap: result.data });
    }).catch((error: { status?: number }) => {
      if (!active) return;
      if (error?.status === 401) setState({ kind: 'signed-out' });
      else if (error?.status === 404 || error?.status === 403) setState({ kind: 'not-found' });
      else setState({ kind: 'error' });
    });
    return () => { active = false; };
  }, [id]);

  if (state.kind === 'ready') return <RoadmapEditor roadmap={state.roadmap} />;
  if (state.kind === 'loading') return <p role="status" style={{ padding: 24 }}>Đang tải lộ trình…</p>;
  const message = {
    'signed-out': 'Đăng nhập để sửa lộ trình của bạn.',
    'not-found': 'Không tìm thấy lộ trình này, hoặc bạn không có quyền sửa.',
    error: 'Không tải được lộ trình. Kiểm tra kết nối rồi thử lại.',
  }[state.kind];
  return (
    <div className={authStyles.acct}>
      <h1>{state.kind === 'signed-out' ? 'Cần đăng nhập' : 'Không mở được lộ trình'}</h1>
      <section className={authStyles.panel}>
        <p>{message}</p>
        {state.kind === 'signed-out'
          ? <Link className={authStyles.btn} href={`/login?redirect=${encodeURIComponent(`/learning/my-roadmaps/${id}/edit`)}`}>Đăng nhập</Link>
          : <Link className={authStyles.btn} href="/learning/my-roadmaps">Về Lộ trình của tôi</Link>}
      </section>
    </div>
  );
}
