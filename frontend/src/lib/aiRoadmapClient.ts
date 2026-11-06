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
  meta?: {
    provider: string;
    configured_model: string;
    model_version: string | null;
  };
}

export interface RoadmapDraftRequest {
  goal: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  weeks: number;
  hours_per_week: number;
  job_postings: string[];
}

export const aiRoadmapClient = {
  preview: (data: RoadmapDraftRequest) =>
    api.post<{ status: 'success'; message: string; data: RoadmapDraft }>(
      '/ai/roadmaps/preview',
      data,
    ),
  confirm: (data: RoadmapDraft & { goal: string }) =>
    api.post('/ai/roadmaps/confirm', {
      goal: data.goal,
      title: data.title,
      summary: data.summary,
      items: data.items.map(({ position, title, description, skills }) => ({
        position, title, description, skills,
      })),
    }),
};
