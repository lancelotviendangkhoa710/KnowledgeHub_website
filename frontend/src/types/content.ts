export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  articles_count?: number;
  children?: Category[];
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  articles_count?: number;
}

export interface ArticleVersion {
  id: string;
  article_id: string;
  version_no: number;
  title: string;
  content: string;
  created_by?: string;
  created_at: string;
}

export interface Article {
  id: string;
  author_id: string;
  author?: {
    id: string;
    name: string;
    email: string;
  };
  category_id?: string | null;
  category?: Category | null;
  published_version_id?: string | null;
  published_version?: ArticleVersion | null;
  latest_version?: ArticleVersion | null;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  published_at?: string | null;
  created_at: string;
  updated_at?: string;
  tags?: Tag[];
  bookmarks_count?: number;
  is_bookmarked?: boolean;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  message?: string;
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}
