'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { roadmapClient } from '@/lib/roadmapClient';
import type { LearningRoadmap } from '@/types/learning';

/** Danh sách lộ trình của chính người dùng (`?mine=1`), tải lại khi đổi tài khoản. */
export function useMyRoadmaps(userId: string | null) {
  const [roadmaps, setRoadmaps] = useState<LearningRoadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const load = useCallback(async () => {
    const ticket = ++request.current; // a late answer for an older request (or another user) is dropped
    if (!userId) {
      setRoadmaps([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await roadmapClient.list(true);
      if (ticket === request.current) setRoadmaps(result.data);
    } catch (caught) {
      if (ticket !== request.current) return;
      setRoadmaps([]);
      setError((caught as { status?: number }).status === 401
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        : 'Không tải được lộ trình của bạn. Hãy kiểm tra kết nối rồi thử lại.');
    } finally {
      if (ticket === request.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  return { roadmaps, loading, error, reload: load };
}
