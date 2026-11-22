export type RoadmapStatus = 'active' | 'completed' | 'archived' | 'paused';
/** LRN-DB-01: trình độ lưu ở learning_roadmaps.level (không bắt buộc). */
export type RoadmapLevel = 'beginner' | 'intermediate' | 'advanced';
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
  encouragement?: string | null;
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
  /** RMR-01: thời điểm hoàn thành (chỉ có ở GET danh sách/chi tiết). */
  completed_at?: string | null;
  /** RMR-01: tên khóa học đã xuất bản được liên kết, nếu có. */
  article_title?: string | null;
  /** LRN-DB-01: số giờ học dự kiến (0,5–999), mức độ quan trọng 0–100, chú thích riêng. */
  study_hours?: number | null;
  importance?: number | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

/** RMR-01: chủ đề (danh mục gốc) của các bước trong một lộ trình. */
export interface RoadmapTopic {
  category_slug: string;
  name: string;
  count: number;
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
  /** LRN-DB-01 */
  level?: RoadmapLevel | null;
  duration_weeks?: number | null;
  visibility?: 'private' | 'public';
  source_template?: string | null;
  created_at: string;
  updated_at: string;
  items: RoadmapItem[];
  /** RMR-01: chỉ có ở GET danh sách/chi tiết; các phản hồi ghi không trả về. */
  items_count?: number;
  completed_count?: number;
  topics?: RoadmapTopic[];
  last_activity_at?: string | null;
}

export interface LearningResponse<T> {
  status: 'success';
  message?: string;
  data: T;
}
