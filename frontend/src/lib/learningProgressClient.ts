import { api } from './api';

export type RoadmapProgressStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface LearningProgress {
  id: string;
  roadmap_item_id: string;
  status: RoadmapProgressStatus;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface LearningProgressResponse {
  status: 'success';
  message?: string;
  data: LearningProgress | null;
}

export const learningProgressClient = {
  get: (itemId: string) =>
    api.get<LearningProgressResponse>(`/learning/roadmap-items/${itemId}/progress`),
  update: (itemId: string, status: RoadmapProgressStatus) =>
    api.patch<LearningProgressResponse>(`/learning/roadmap-items/${itemId}/progress`, { status }),
};