export type RoadmapStatus = 'active' | 'completed' | 'archived' | 'paused';
export type RoadmapItemStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface RoadmapItem {
  id: string;
  roadmap_id: string;
  article_id: string | null;
  title: string;
  description: string | null;
  position: number;
  status: RoadmapItemStatus;
  created_at: string;
  updated_at: string;
}

export interface LearningRoadmap {
  id: string;
  user_id: string;
  title: string;
  goal: string;
  status: RoadmapStatus;
  created_at: string;
  updated_at: string;
  items: RoadmapItem[];
}

export interface LearningResponse<T> {
  status: 'success';
  data: T;
}