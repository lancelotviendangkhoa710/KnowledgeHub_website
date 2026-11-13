export type RoadmapStatus = 'active' | 'completed' | 'archived' | 'paused';
export type RoadmapItemStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface ExternalLearningResource {
  title: string;
  url: string;
  topic: string;
  reason: string;
  verified_at: string;
}

export interface SkillCoverage {
  skill: string;
  internal: number;
  external: number;
  evidence?: string[];
}

export interface CVAnalysis {
  strengths: { skill: string; evidence: string }[];
  gaps: string[];
  recommendations: string[];
  cv_match_percent: number | null;
}

export interface RoadmapCoverage {
  internal_percent: number;
  external_percent: number;
  overall_percent: number;
  gaps: string[];
  skills: SkillCoverage[];
  resource_status?: 'ok' | 'unavailable';
  cv_analysis?: CVAnalysis | null;
}

export interface RoadmapItemAiDetails {
  stage_title?: string;
  estimated_minutes?: number;
  week_start?: number;
  week_end?: number;
  skills?: string[];
  course?: { id: string; title: string; url: string; reason?: string | null } | null;
  external_resources?: ExternalLearningResource[];
}

export interface RoadmapItem {
  id: string;
  roadmap_id: string;
  article_id: string | null;
  title: string;
  description: string | null;
  position: number;
  status: RoadmapItemStatus;
  ai_details?: RoadmapItemAiDetails | null;
  created_at: string;
  updated_at: string;
}

export interface LearningRoadmap {
  id: string;
  user_id: string;
  title: string;
  goal: string;
  status: RoadmapStatus;
  origin?: 'legacy' | 'ai';
  ai_summary?: string | null;
  coverage?: RoadmapCoverage | null;
  created_at: string;
  updated_at: string;
  items: RoadmapItem[];
}

export interface LearningResponse<T> {
  status: 'success';
  message?: string;
  data: T;
}
