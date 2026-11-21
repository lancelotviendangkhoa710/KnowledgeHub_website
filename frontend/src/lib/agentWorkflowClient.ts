import { api } from '@/lib/api';

type Envelope<T> = { status: 'success'; data: T; message?: string };

export type GeneratedLesson = {
  video_id: string;
  title: string;
  description: string;
  learning_objective: string;
};

export type GeneratedCourse = {
  id: string;
  slug: string;
  status: 'published';
  title: string;
  source_playlist_id?: string;
  source_playlist_title?: string;
  lessons: GeneratedLesson[];
};

export type AdminAgentProposal = {
  approval_id: string;
  action: string;
  value: string;
  summary: string;
  target_user_id: string;
  target_name: string;
  expires_at: string;
};

export type CvAssessment = {
  summary: string;
  strengths: { skill: string; evidence: string }[];
  gaps: string[];
  recommendations: string[];
};

export type CvAssessmentPreview = {
  assessment: CvAssessment;
  preview_token: string;
  expires_at: string;
};

export type StoredCvAssessment = {
  cv: { id: string; filename: string; size_bytes: number; created_at: string };
  assessment: CvAssessment;
};

export const agentWorkflowClient = {
  createCourse: (topic: string, maxVideos: number) =>
    api.post<Envelope<GeneratedCourse>>('/ai/agents/courses', { topic, max_videos: maxVideos }),

  planAdminAction: (instruction: string, targetUserId: string) =>
    api.post<Envelope<AdminAgentProposal>>('/ai/agents/admin/plan', {
      instruction,
      target_user_id: targetUserId,
    }),

  confirmAdminAction: (approvalId: string, currentPassword?: string) =>
    api.post<Envelope<{ id: string; status: string; roles: string[] }>>('/ai/agents/admin/confirm', {
      approval_id: approvalId,
      accepted: true,
      ...(currentPassword ? { ['current_password']: currentPassword } : {}),
    }),

  previewCv: (file: File, targetRole?: string) => {
    const form = new FormData();
    form.append('cv_file', file);
    if (targetRole?.trim()) form.append('target_role', targetRole.trim());
    return api.post<Envelope<CvAssessmentPreview>>('/ai/cv/assessment/preview', form);
  },

  confirmCv: (file: File, previewToken: string) => {
    const form = new FormData();
    form.append('cv_file', file);
    form.append('preview_token', previewToken);
    return api.post<Envelope<StoredCvAssessment>>('/ai/cv/assessment/confirm', form);
  },

  getCvAssessment: () => api.get<Envelope<CvAssessment | null>>('/ai/cv/assessment'),
  deleteCv: () => api.delete<{ status: 'success'; message?: string }>('/ai/cv'),
};
