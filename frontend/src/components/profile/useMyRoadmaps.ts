'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { roadmapClient } from '@/lib/roadmapClient';
import type { LearningRoadmap } from '@/types/learning';

type Loaded = { userId: string | null; roadmaps: LearningRoadmap[]; error: string | null; loading: boolean };

/**
 * Danh sách lộ trình của chính người dùng (`?mine=1`), tải lại khi đổi tài khoản.
 * Kết quả gắn với `userId` đã tải: khi tài khoản đổi, hook trả danh sách rỗng và đang tải
 * thay vì để lộ dữ liệu (hoặc lỗi) của tài khoản trước.
 */
export function useMyRoadmaps(userId: string | null) {
  const [state, setState] = useState<Loaded>({ userId: null, roadmaps: [], error: null, loading: true });
  const request = useRef(0);

  const load = useCallback(async () => {
    const ticket = ++request.current; // a late answer for an older request (or another user) is dropped
    if (!userId) {
      setState({ userId: null, roadmaps: [], error: null, loading: false });
      return;
    }
    setState((current) => ({ userId, roadmaps: current.userId === userId ? current.roadmaps : [], error: null, loading: true }));
    try {
      const result = await roadmapClient.list(true);
      if (ticket === request.current) setState({ userId, roadmaps: result.data, error: null, loading: false });
    } catch (caught) {
      if (ticket !== request.current) return;
      setState({
        userId,
        roadmaps: [],
        loading: false,
        error: (caught as { status?: number }).status === 401
          ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : 'Không tải được lộ trình của bạn. Hãy kiểm tra kết nối rồi thử lại.',
      });
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const current = state.userId === userId;
  return {
    roadmaps: current ? state.roadmaps : [],
    loading: current ? state.loading : true,
    error: current ? state.error : null,
    reload: load,
  };
}
