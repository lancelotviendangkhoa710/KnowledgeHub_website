import { Article, Category, Tag } from '@/types/content';
import { mockArticles, mockCategories, mockTags } from './mockContent';
import { getAccessToken } from '@/lib/authToken';

const rawBase = process.env.NEXT_PUBLIC_API_URL || '/api';
const BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
const API_BASE = `${BASE_URL}/v1`;

function buildApiUrl(path: string): string {
  const fullPath = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  if (fullPath.startsWith('http://') || fullPath.startsWith('https://')) {
    return fullPath;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${fullPath}`;
  }
  return fullPath;
}

/**
 * Fetch all published articles with optional filters.
 */
export async function fetchArticles(params?: {
  categoryId?: string;
  tagSlug?: string;
  search?: string;
}): Promise<Article[]> {
  try {
    const baseTarget = buildApiUrl('/articles');
    const fallbackBase = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1';
    const url = new URL(
      baseTarget,
      baseTarget.startsWith('http') ? undefined : fallbackBase
    );
    if (params?.categoryId) url.searchParams.append('category_id', params.categoryId);
    if (params?.tagSlug) url.searchParams.append('tag_slug', params.tagSlug);
    if (params?.search) url.searchParams.append('search', params.search);

    const headers: Record<string, string> = { Accept: 'application/json' };
    const bearerSession = getAccessToken();
    if (bearerSession) {
      headers['Authorization'] = `Bearer ${bearerSession}`;
    }

    const res = await fetch(url.toString(), {
      ...(bearerSession ? { cache: 'no-store' } : { next: { revalidate: 60 } }),
      headers,
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
    const headers: Record<string, string> = { Accept: 'application/json' };
    const bearerSession = getAccessToken();
    if (bearerSession) {
      headers['Authorization'] = `Bearer ${bearerSession}`;
    }

    const res = await fetch(buildApiUrl(`/articles/${identifier}`), {
      ...(bearerSession ? { cache: 'no-store' } : { next: { revalidate: 60 } }),
      headers,
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
    const res = await fetch(buildApiUrl('/categories'), {
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
    const res = await fetch(buildApiUrl('/tags'), {
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

/**
 * Fetch articles authored by the authenticated user (including drafts and archived).
 */
export async function fetchMyArticles(status?: string): Promise<Article[]> {
  try {
    const baseTarget = buildApiUrl('/articles');
    const fallbackBase = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1';
    const url = new URL(
      baseTarget,
      baseTarget.startsWith('http') ? undefined : fallbackBase
    );
    url.searchParams.append('my_articles', 'true');
    url.searchParams.append('per_page', '100');
    if (status && status !== 'all') {
      url.searchParams.append('status', status);
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    const bearerSession = getAccessToken();
    if (bearerSession) {
      headers['Authorization'] = `Bearer ${bearerSession}`;
    }

    const res = await fetch(url.toString(), {
      cache: 'no-store',
      headers,
    });

    if (!res.ok) {
      const errorJson: { message?: string } = await res.json().catch(() => ({}));
      throw new Error(errorJson.message || `Failed to load courses (HTTP ${res.status}).`);
    }

    const json: { data?: Article[]; status?: string } | Article[] = await res.json();
    if ('data' in json && Array.isArray(json.data)) {
      return json.data;
    }
    if (Array.isArray(json)) {
      return json;
    }
    throw new Error('Unexpected response format received from server.');
  } catch (err) {
    if (process.env.NEXT_PUBLIC_USE_MOCK === 'true') {
      let result = [...mockArticles];
      if (status && status !== 'all') {
        result = result.filter((a) => a.status === status);
      }
      return result;
    }
    throw err;
  }
}

/**
 * Publish an article with an optional specific version ID.
 */
export async function publishArticle(articleId: string, versionId?: string): Promise<Article> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const bearerSession = getAccessToken();
  if (bearerSession) {
    headers['Authorization'] = `Bearer ${bearerSession}`;
  }

  const body = versionId ? JSON.stringify({ version_id: versionId }) : JSON.stringify({});
  const res = await fetch(buildApiUrl(`/articles/${articleId}/publish`), {
    method: 'POST',
    headers,
    body,
  });

  if (!res.ok) {
    const err: { message?: string } = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to publish course.');
  }

  const json: { data?: Article; message?: string } = await res.json();
  if (!json?.data) {
    throw new Error(json?.message || 'Publish operation completed but course data was missing from server response.');
  }
  return json.data;
}

/**
 * Archive an article.
 */
export async function archiveArticle(articleId: string): Promise<Article> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const bearerSession = getAccessToken();
  if (bearerSession) {
    headers['Authorization'] = `Bearer ${bearerSession}`;
  }

  const res = await fetch(buildApiUrl(`/articles/${articleId}/archive`), {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const err: { message?: string } = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to archive course.');
  }

  const json: { data?: Article; message?: string } = await res.json();
  if (!json?.data) {
    throw new Error(json?.message || 'Archive operation completed but course data was missing from server response.');
  }
  return json.data;
}

/**
 * Soft delete an article.
 */
export async function deleteArticle(articleId: string): Promise<void> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const bearerSession = getAccessToken();
  if (bearerSession) {
    headers['Authorization'] = `Bearer ${bearerSession}`;
  }

  const res = await fetch(buildApiUrl(`/articles/${articleId}`), {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const err: { message?: string } = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete course.');
  }
}
