import { api } from '@/lib/api';

export interface RoadmapDraftItem {
  position: number;
  title: string;
  description: string;
  skills: string[];
  article_id: null;
}

export interface RoadmapDraft {
  title: string;
  summary: string;
  items: RoadmapDraftItem[];
}

export interface RoadmapDraftRequest {
  goal: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  weeks: number;
  hours_per_week: number;
}

export const aiRoadmapClient = {
  preview: (data: RoadmapDraftRequest) =>
    api.post<{ status: 'success'; message: string; data: RoadmapDraft }>(
      '/ai/roadmaps/preview',
      data,
    ),
};
