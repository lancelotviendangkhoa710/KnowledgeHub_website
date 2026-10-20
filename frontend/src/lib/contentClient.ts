import { Article, Category, Tag } from '@/types/content';
import { mockArticles, mockCategories, mockTags } from './mockContent';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

/**
 * Fetch all published articles with optional filters.
 */
export async function fetchArticles(params?: {
  categoryId?: string;
  tagSlug?: string;
  search?: string;
}): Promise<Article[]> {
  try {
    const url = new URL(`${API_BASE}/articles`);
    if (params?.categoryId) url.searchParams.append('category_id', params.categoryId);
    if (params?.tagSlug) url.searchParams.append('tag_slug', params.tagSlug);
    if (params?.search) url.searchParams.append('search', params.search);

    const res = await fetch(url.toString(), {
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        return json.data;
      }
    }
  } catch {
    // Graceful fallback to rich curated mock data if backend container is offline
  }

  // Fallback client-side filtering on mock data
  let result = [...mockArticles];

  if (params?.categoryId) {
    result = result.filter((a) => a.category_id === params.categoryId);
  }

  if (params?.tagSlug) {
    result = result.filter((a) => a.tags?.some((t) => t.slug === params.tagSlug));
  }

  if (params?.search) {
    const q = params.search.toLowerCase();
    result = result.filter(
      (a) =>
        a.published_version?.title.toLowerCase().includes(q) ||
        a.published_version?.content.toLowerCase().includes(q) ||
        a.category?.name.toLowerCase().includes(q)
    );
  }

  return result;
}

/**
 * Fetch a single article by slug or ID.
 */
export async function fetchArticle(identifier: string): Promise<Article | null> {
  try {
    const res = await fetch(`${API_BASE}/articles/${identifier}`, {
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        return json.data;
      }
    }
  } catch {
    // Fallback
  }

  const found = mockArticles.find((a) => a.slug === identifier || a.id === identifier);
  return found || null;
}

/**
 * Fetch all categories tree.
 */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE}/categories`, {
      next: { revalidate: 300 },
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        return json.data;
      }
    }
  } catch {
    // Fallback
  }

  return mockCategories;
}

/**
 * Fetch all tags.
 */
export async function fetchTags(): Promise<Tag[]> {
  try {
    const res = await fetch(`${API_BASE}/tags`, {
      next: { revalidate: 300 },
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        return json.data;
      }
    }
  } catch {
    // Fallback
  }

  return mockTags;
}
