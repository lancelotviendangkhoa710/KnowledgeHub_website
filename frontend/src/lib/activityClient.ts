import { api } from './api';
import type { LearningResponse } from '@/types/learning';

/** PRF-06: số bước hoàn thành trong một ngày (giờ Việt Nam); ngày không có hoạt động bị bỏ qua. */
export type ActivityDay = { date: string; count: number };

/** PRF-07: một bước đã hoàn thành. */
export type ActivityEntry = {
  item_id: string;
  item_title: string;
  article_id: string | null;
  article_title: string | null;
  roadmap_id: string;
  roadmap_title: string;
  completed_at: string;
};

export type ActivityPage = LearningResponse<ActivityEntry[]> & {
  meta: { current_page: number; per_page: number; total: number; last_page: number };
};

export const activityClient = {
  daily: (from: string, to: string) =>
    api.get<LearningResponse<ActivityDay[]>>(`/learning/activity?from=${from}&to=${to}`),
  recent: (page = 1, date?: string) =>
    api.get<ActivityPage>(`/learning/activity/recent?page=${page}${date ? `&date=${date}` : ''}`),
};
