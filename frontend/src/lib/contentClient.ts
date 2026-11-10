import { Article, Category, Tag } from '@/types/content';
import { getAccessToken } from '@/lib/authToken';

const rawBase = process.env.NEXT_PUBLIC_API_URL || '/api';
const BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
const API_BASE = `${BASE_URL}/v1`;

/**
 * Builds a fully qualified API endpoint URL.
 *
 * @param path Relative path (e.g., '/articles' or 'categories').
 * @returns Fully qualified URL string.
 */
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
 * Parameters for querying published articles.
 */
export interface FetchArticlesParams {
  /** Optional category UUID filter. */
  categoryId?: string;
  /** Optional tag slug filter. */
  tagSlug?: string;
  /** Optional text search query across title, content, or category name. */
  search?: string;
}

/**
 * Fetch all published articles from the live REST API with optional domain/tag/search filters.
 * Interacts exclusively with the live backend; does not fall back to mock data.
 *
 * @param params Optional query filters (categoryId, tagSlug, search).
 * @returns Promise resolving to an array of published Article entities.
 * @throws Error if network fails or API responds with an error status.
 */
export async function fetchArticles(params?: FetchArticlesParams): Promise<Article[]> {
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

  if (!res.ok) {
    const errorJson: { message?: string } = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Failed to fetch articles from API (HTTP ${res.status}).`);
  }

  const json: { data?: Article[]; status?: string } | Article[] = await res.json();
  if ('data' in json && Array.isArray(json.data)) {
    return json.data;
  }
  if (Array.isArray(json)) {
    return json;
  }
  return [];
}

/**
 * Fetch a single article by its slug or UUID identifier directly from the live REST API.
 * Returns null if the article does not exist or if the request fails (never falls back to mock entities).
 *
 * @param identifier The article slug or UUID.
 * @returns Promise resolving to the Article entity, or null if not found or unreachable.
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

    if (!res.ok) {
      return null;
    }

    const json: { data?: Article } = await res.json();
    if (json?.data) {
      return json.data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch all categories tree from the live REST API.
 *
 * @returns Promise resolving to an array of Category objects, or an empty array on error.
 */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(buildApiUrl('/categories'), {
      next: { revalidate: 300 },
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const json: { data?: Category[] } | Category[] = await res.json();
      if ('data' in json && Array.isArray(json.data)) {
        return json.data;
      }
      if (Array.isArray(json)) {
        return json;
      }
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Fetch all content tags from the live REST API.
 *
 * @returns Promise resolving to an array of Tag objects, or an empty array on error.
 */
export async function fetchTags(): Promise<Tag[]> {
  try {
    const res = await fetch(buildApiUrl('/tags'), {
      next: { revalidate: 300 },
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const json: { data?: Tag[] } | Tag[] = await res.json();
      if ('data' in json && Array.isArray(json.data)) {
        return json.data;
      }
      if (Array.isArray(json)) {
        return json;
      }
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Fetch articles authored by the authenticated contributor/admin (including drafts and archived).
 * Interacts exclusively with the live REST API; never falls back to mock data.
 *
 * @param status Optional filter for article lifecycle status ('draft', 'published', 'archived', 'all').
 * @returns Promise resolving to an array of author's Article entities.
 * @throws Error if unauthenticated or if the API returns an error.
 */
export async function fetchMyArticles(status?: string): Promise<Article[]> {
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
}

/**
 * Publish an article with an optional specific version ID.
 *
 * @param articleId The UUID of the article to publish.
 * @param versionId Optional version UUID to promote as the published version.
 * @returns Promise resolving to the updated published Article entity.
 * @throws Error if publication fails or returns non-200 status.
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
 *
 * @param articleId The UUID of the article to archive.
 * @returns Promise resolving to the updated archived Article entity.
 * @throws Error if archiving fails or returns non-200 status.
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
 *
 * @param articleId The UUID of the article to delete.
 * @returns Promise resolving when deletion completes.
 * @throws Error if deletion fails or returns non-200 status.
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
