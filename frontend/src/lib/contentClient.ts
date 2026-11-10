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

/** User-facing message used when the API cannot be reached at all (network/CORS/DNS failure). */
export const API_UNREACHABLE_MESSAGE = 'Cannot reach the KnowledgeHub API.';

/**
 * Wraps `fetch` so low-level network failures (e.g. TypeError "Failed to fetch")
 * surface as a readable error instead of a browser-specific message.
 */
async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err: unknown) {
    if (err instanceof TypeError) {
      throw new Error(API_UNREACHABLE_MESSAGE);
    }
    throw err;
  }
}

/**
 * Extracts an array payload from either a `{ data: T[] }` envelope or a bare `T[]` response.
 * Null-safe: returns null when the body is not a recognised list shape.
 */
function extractList<T>(json: unknown): T[] | null {
  if (Array.isArray(json)) {
    return json as T[];
  }
  if (json && typeof json === 'object' && 'data' in json) {
    const data = (json as { data?: unknown }).data;
    if (Array.isArray(data)) {
      return data as T[];
    }
  }
  return null;
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
 * Interacts exclusively with the live backend.
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

  const res = await apiFetch(url.toString(), {
    ...(bearerSession ? { cache: 'no-store' } : { next: { revalidate: 60 } }),
    headers,
  });

  if (!res.ok) {
    const errorJson: { message?: string } = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Failed to fetch articles from API (HTTP ${res.status}).`);
  }

  const list = extractList<Article>(await res.json());
  if (list === null) {
    throw new Error('Unexpected response format received from server.');
  }
  return list;
}

/**
 * Fetch a single article by its slug or UUID identifier directly from the live REST API.
 *
 * @param identifier The article slug or UUID.
 * @returns Promise resolving to the Article entity, or null only when the API responds 404.
 * @throws Error on network failure, any non-404 error status, or a 200 response without `data`.
 */
export async function fetchArticle(identifier: string): Promise<Article | null> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const bearerSession = getAccessToken();
  if (bearerSession) {
    headers['Authorization'] = `Bearer ${bearerSession}`;
  }

  const res = await apiFetch(buildApiUrl(`/articles/${encodeURIComponent(identifier)}`), {
    ...(bearerSession ? { cache: 'no-store' } : { next: { revalidate: 60 } }),
    headers,
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const errorJson: { message?: string } = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Failed to load course (HTTP ${res.status}).`);
  }

  const json: { data?: Article } | null = await res.json();
  if (!json?.data) {
    throw new Error('Unexpected course response format received from server.');
  }
  return json.data;
}

/**
 * Fetch all categories tree from the live REST API.
 *
 * @returns Promise resolving to an array of Category objects.
 * @throws Error on network failure, non-OK status, or an unexpected response shape.
 */
export async function fetchCategories(): Promise<Category[]> {
  const res = await apiFetch(buildApiUrl('/categories'), {
    next: { revalidate: 300 },
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorJson: { message?: string } = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Failed to load categories (HTTP ${res.status}).`);
  }

  const list = extractList<Category>(await res.json());
  if (list === null) {
    throw new Error('Unexpected categories response format received from server.');
  }
  return list;
}

/**
 * Fetch all content tags from the live REST API.
 *
 * @returns Promise resolving to an array of Tag objects.
 * @throws Error on network failure, non-OK status, or an unexpected response shape.
 */
export async function fetchTags(): Promise<Tag[]> {
  const res = await apiFetch(buildApiUrl('/tags'), {
    next: { revalidate: 300 },
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorJson: { message?: string } = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Failed to load tags (HTTP ${res.status}).`);
  }

  const list = extractList<Tag>(await res.json());
  if (list === null) {
    throw new Error('Unexpected tags response format received from server.');
  }
  return list;
}

/**
 * Fetch articles authored by the authenticated contributor/admin (including drafts and archived).
 * Interacts exclusively with the live REST API.
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

  const res = await apiFetch(url.toString(), {
    cache: 'no-store',
    headers,
  });

  if (!res.ok) {
    const errorJson: { message?: string } = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Failed to load courses (HTTP ${res.status}).`);
  }

  const list = extractList<Article>(await res.json());
  if (list === null) {
    throw new Error('Unexpected response format received from server.');
  }
  return list;
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
  const res = await apiFetch(buildApiUrl(`/articles/${articleId}/publish`), {
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

  const res = await apiFetch(buildApiUrl(`/articles/${articleId}/archive`), {
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

  const res = await apiFetch(buildApiUrl(`/articles/${articleId}`), {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const err: { message?: string } = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete course.');
  }
}
