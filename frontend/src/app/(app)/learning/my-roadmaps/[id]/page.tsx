'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import authStyles from '@/components/auth/authForm.module.css';
import RoadmapDetailView from '@/components/profile/RoadmapDetailView';
import p from '@/components/profile/profile.module.css';
import s from '@/components/profile/roadmapDetail.module.css';
import { getAccessToken } from '@/lib/authToken';
import { roadmapClient } from '@/lib/roadmapClient';
import type { LearningRoadmap } from '@/types/learning';

type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | { kind: 'ready'; roadmap: LearningRoadmap };

/** RMR-06: chi tiết một lộ trình, dùng GET /api/learning/roadmaps/{id} sẵn có. */
export default function RoadmapDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    if (!getAccessToken()) {
      setState({ kind: 'signed-out' });
      return;
    }
    setState({ kind: 'loading' });
    roadmapClient.get(id).then((result) => {
      if (active) setState({ kind: 'ready', roadmap: result.data });
    }).catch((error: { status?: number }) => {
      if (!active) return;
      if (error?.status === 401) setState({ kind: 'signed-out' });
      else if (error?.status === 404 || error?.status === 403) setState({ kind: 'not-found' });
      else setState({ kind: 'error' });
    });
    return () => { active = false; };
  }, [id, attempt]);

  if (state.kind === 'ready') return <RoadmapDetailView roadmap={state.roadmap} />;

  if (state.kind === 'signed-out') {
    return (
      <div className={authStyles.acct}>
        <h1>Cần đăng nhập</h1>
        <section className={authStyles.panel}>
          <p>Đăng nhập để xem lộ trình của bạn.</p>
          <Link className={authStyles.btn} href={`/login?redirect=${encodeURIComponent(`/learning/my-roadmaps/${id}`)}`}>Đăng nhập</Link>
        </section>
      </div>
    );
  }

  return (
    <div className={s.wrap}>
      <nav className={s.crumbs} aria-label="Đường dẫn">
        <Link href="/account?tab=roadmaps">Hồ sơ</Link>
        <span aria-hidden="true">/</span>
        <Link href="/learning/my-roadmaps">Lộ trình của tôi</Link>
      </nav>
      {state.kind === 'loading' && (
        <>
          <h1 className={s.sr}>Lộ trình</h1>
          <p className={s.state} role="status">Đang tải lộ trình…</p>
        </>
      )}
      {state.kind === 'not-found' && (
        <div className={p.emptyBox}>
          <h1 className={s.stateTitle}>Không tìm thấy lộ trình</h1>
          <p>Lộ trình này không tồn tại hoặc không thuộc tài khoản của bạn.</p>
          <Link className={p.btn} href="/learning/my-roadmaps">Về Lộ trình của tôi</Link>
        </div>
      )}
      {state.kind === 'error' && (
        <>
          <h1 className={s.sr}>Lộ trình</h1>
          <div className={p.errorBox} role="alert">
            <span>Không tải được lộ trình. Hãy kiểm tra kết nối rồi thử lại.</span>
            <button type="button" onClick={() => setAttempt((value) => value + 1)}>Thử lại</button>
          </div>
        </>
      )}
    </div>
  );
}
