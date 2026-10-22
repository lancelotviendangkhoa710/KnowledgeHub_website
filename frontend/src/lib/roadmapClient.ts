import { api } from './api';
import { LearningResponse, LearningRoadmap, RoadmapItem } from '@/types/learning';

export const roadmapClient = {
  list: () => api.get<LearningResponse<LearningRoadmap[]>>('/learning/roadmaps'),
  create: (data: Pick<LearningRoadmap, 'title' | 'goal'>) =>
    api.post<LearningResponse<LearningRoadmap>>('/learning/roadmaps', data),
  update: (id: string, data: Partial<Pick<LearningRoadmap, 'title' | 'goal' | 'status'>>) =>
    api.put<LearningResponse<LearningRoadmap>>(`/learning/roadmaps/${id}`, data),
  remove: (id: string) => api.delete<LearningResponse<null>>(`/learning/roadmaps/${id}`),
  // `status` is intentionally excluded: the item endpoints treat it as
  // prohibited (422) because it mirrors learning_progress.status. Clients must
  // update status through learningProgressClient instead.
  createItem: (roadmapId: string, data: Pick<RoadmapItem, 'title' | 'position'> & Partial<Pick<RoadmapItem, 'description' | 'article_id'>>) =>
    api.post<LearningResponse<RoadmapItem>>(`/learning/roadmaps/${roadmapId}/items`, data),
  updateItem: (roadmapId: string, itemId: string, data: Partial<Omit<RoadmapItem, 'id' | 'roadmap_id' | 'status' | 'created_at' | 'updated_at'>>) =>
    api.put<LearningResponse<RoadmapItem>>(`/learning/roadmaps/${roadmapId}/items/${itemId}`, data),
  removeItem: (roadmapId: string, itemId: string) =>
    api.delete<LearningResponse<null>>(`/learning/roadmaps/${roadmapId}/items/${itemId}`),
};