import { api } from './api';
import { LearningResponse, LearningRoadmap, RoadmapItem, RoadmapLevel } from '@/types/learning';

/** LRN-BE-01: các trường người dùng tự điền khi tạo/sửa lộ trình. */
export type RoadmapWrite = Pick<LearningRoadmap, 'title' | 'goal'> & {
  level?: RoadmapLevel | null;
  duration_weeks?: number | null;
  source_template?: string | null;
};
/** LRN-BE-02: các trường của một bước. */
export type RoadmapItemWrite = Pick<RoadmapItem, 'title' | 'position'> &
  Partial<Pick<RoadmapItem, 'description' | 'article_id' | 'study_hours' | 'importance' | 'note'>>;
export type RoadmapListFilters = { q?: string; level?: RoadmapLevel; sort?: 'created' | 'updated' | 'title' };

function listQuery(mine: boolean, filters: RoadmapListFilters): string {
  const params = new URLSearchParams();
  if (mine) params.set('mine', '1');
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.level) params.set('level', filters.level);
  if (filters.sort) params.set('sort', filters.sort);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const roadmapClient = {
  list: (mine = false, filters: RoadmapListFilters = {}) =>
    api.get<LearningResponse<LearningRoadmap[]>>(`/learning/roadmaps${listQuery(mine, filters)}`),
  get: (id: string) => api.get<LearningResponse<LearningRoadmap>>(`/learning/roadmaps/${encodeURIComponent(id)}`),
  create: (data: RoadmapWrite) =>
    api.post<LearningResponse<LearningRoadmap>>('/learning/roadmaps', data),
  update: (id: string, data: Partial<RoadmapWrite & Pick<LearningRoadmap, 'status'>>) =>
    api.put<LearningResponse<LearningRoadmap>>(`/learning/roadmaps/${id}`, data),
  remove: (id: string) => api.delete<LearningResponse<null>>(`/learning/roadmaps/${id}`),
  // `status` is intentionally excluded: the item endpoints treat it as
  // prohibited (422) because it mirrors learning_progress.status. Clients must
  // update status through learningProgressClient instead.
  createItem: (roadmapId: string, data: RoadmapItemWrite) =>
    api.post<LearningResponse<RoadmapItem>>(`/learning/roadmaps/${roadmapId}/items`, data),
  updateItem: (roadmapId: string, itemId: string, data: Partial<Omit<RoadmapItem, 'id' | 'roadmap_id' | 'status' | 'created_at' | 'updated_at'>>) =>
    api.put<LearningResponse<RoadmapItem>>(`/learning/roadmaps/${roadmapId}/items/${itemId}`, data),
  removeItem: (roadmapId: string, itemId: string) =>
    api.delete<LearningResponse<null>>(`/learning/roadmaps/${roadmapId}/items/${itemId}`),
};
