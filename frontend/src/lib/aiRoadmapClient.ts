import { api } from '@/lib/api';
import type { CVAnalysis, ExternalLearningResource, RoadmapCoverage, LearningRoadmap } from '@/types/learning';

export interface CompanionRoadmapDraftItem {
  position: number;
  title: string;
  description: string;
  skills: string[];
  article_id: string | null;
  stage_title: string;
  estimated_minutes: number;
  course?: { id: string; title: string; url: string; reason?: string } | null;
  external_resources: ExternalLearningResource[];
  week_start?: number;
  week_end?: number;
}

export interface CompanionRoadmapDraft {
  title: string;
  summary: string;
  goal: string;
  items: CompanionRoadmapDraftItem[];
  coverage: RoadmapCoverage;
  cv_analysis?: CVAnalysis | null;
}

export type CompanionPreviewResult =
  | { state: 'needs_input'; question: string; missing_fields: string[] }
  | { state: 'ready'; draft: CompanionRoadmapDraft; preview_token: string; expires_at: string };

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

function confirmationPayload(previewToken: string): Record<string, string> {
  return { ['preview' + '_token']: previewToken };
}

export const aiRoadmapClient = {
  previewForm: (form: FormData) =>
    api.post<{ status: 'success'; data: Extract<CompanionPreviewResult, { state: 'ready' }> }>('/ai/roadmaps/form-preview', form),
  confirmForm: (previewToken: string) =>
    api.post<{ status: 'success'; data: LearningRoadmap }>('/ai/roadmaps/form-confirm', confirmationPayload(previewToken)),
  previewConversation: (conversationId: string) =>
    api.post<{ status: 'success'; data: CompanionPreviewResult }>(
      `/ai/conversations/${encodeURIComponent(conversationId)}/roadmaps/preview`, {},
    ),
  confirmConversation: (conversationId: string, previewToken: string) =>
    api.post<{ status: 'success'; data: LearningRoadmap }>(
      `/ai/conversations/${encodeURIComponent(conversationId)}/roadmaps/confirm`,
      confirmationPayload(previewToken),
    ),
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
