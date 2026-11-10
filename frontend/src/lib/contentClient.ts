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

/** Used for writes (POST/PUT/PATCH/DELETE): the request may or may not have been applied server-side. */
export const API_UNREACHABLE_WRITE_MESSAGE =
  'Could not reach the KnowledgeHub API. The result is unknown — refresh to check.';

/** Shown while GET requests are being retried (Render free tier cold start can take up to ~1 min). */
export const SERVER_WAKING_MESSAGE =
  'Waking up the KnowledgeHub server… this can take up to a minute (free hosting).';

/** HTTP statuses that a sleeping / starting backend returns transiently. */
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);
/** Backoff between attempts for idempotent reads: 2 s, 4 s, 8 s, 16 s, 30 s (≈60 s total). */
const READ_RETRY_DELAYS_MS = [2000, 4000, 8000, 16000, 30000];

/** Details passed to `onRetry` before each wait. */
export interface ApiRetryInfo {
  /** 1-based number of the retry about to happen. */
  attempt: number;
  /** Maximum number of retries that will be attempted. */
  maxRetries: number;
  /** Delay before the next attempt, in milliseconds. */
  delayMs: number;
  /** HTTP status that triggered the retry, or null for a network failure. */
  status: number | null;
}

/** Optional controls for read (GET) requests. */
export interface ApiReadOptions {
  /** Aborts the request and any pending retry wait. */
  signal?: AbortSignal;
  /** Called before each retry wait so the UI can show a truthful "waking up" status. */
  onRetry?: (info: ApiRetryInfo) => void;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Wraps `fetch` with readable network errors and cold-start resilience.
 *
 * - GET/HEAD: retried on network failure and on HTTP 500/502/503/504 with backoff
 *   (2 s, 4 s, 8 s, 16 s, 30 s). When retries are exhausted it throws a readable error that includes the status.
 * - Other methods are never retried (they are not idempotent); a network failure reports an unknown result.
 * - Abort (via `options.signal`) is propagated as an AbortError and stops any pending retry.
 */
async function apiFetch(input: string, init?: RequestInit, options?: ApiReadOptions): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const isRead = method === 'GET' || method === 'HEAD';
  const signal = options?.signal ?? init?.signal ?? undefined;
  const requestInit: RequestInit = signal ? { ...init, signal } : { ...init };

  if (!isRead) {
    try {
      return await fetch(input, requestInit);
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        throw new Error(API_UNREACHABLE_WRITE_MESSAGE);
      }
      throw err;
    }
  }

  const maxRetries = READ_RETRY_DELAYS_MS.length;
  for (let attempt = 0; ; attempt++) {
    let res: Response | null = null;
    try {
      res = await fetch(input, requestInit);
    } catch (err: unknown) {
      if (isAbortError(err) || !(err instanceof TypeError)) {
        throw err;
      }
      // Network failure (DNS, connection reset, CORS during restart): retry below.
    }

    if (res && !RETRYABLE_STATUSES.has(res.status)) {
      return res;
    }

    if (attempt >= maxRetries) {
      if (!res) {
        throw new Error(API_UNREACHABLE_MESSAGE);
      }
      throw new Error(
        `The KnowledgeHub server is not responding (HTTP ${res.status}). Please try again in a minute.`
      );
    }

    const delayMs = READ_RETRY_DELAYS_MS[attempt];
    options?.onRetry?.({ attempt: attempt + 1, maxRetries, delayMs, status: res ? res.status : null });
    await wait(delayMs, signal);
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
 * Builds the `/articles` list URL with the given query filters.
 */
function buildArticlesUrl(params?: FetchArticlesParams, extra?: Record<string, string>): string {
  const baseTarget = buildApiUrl('/articles');
  const fallbackBase = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1';
  const url = new URL(
    baseTarget,
    baseTarget.startsWith('http') ? undefined : fallbackBase
  );
  if (params?.categoryId) url.searchParams.append('category_id', params.categoryId);
  if (params?.tagSlug) url.searchParams.append('tag_slug', params.tagSlug);
  if (params?.search) url.searchParams.append('search', params.search);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      url.searchParams.append(key, value);
    }
  }
  return url.toString();
}

/**
 * Performs the GET request for an `/articles` list URL and returns the parsed JSON body.
 *
 * @throws Error if network fails or API responds with an error status.
 */
async function requestArticlesJson(url: string, options?: ApiReadOptions): Promise<unknown> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const bearerSession = getAccessToken();
  if (bearerSession) {
    headers['Authorization'] = `Bearer ${bearerSession}`;
  }

  const res = await apiFetch(url, {
    ...(bearerSession ? { cache: 'no-store' } : { next: { revalidate: 60 } }),
    headers,
  }, options);

  if (!res.ok) {
    const errorJson: { message?: string } = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Failed to fetch articles from API (HTTP ${res.status}).`);
  }

  return res.json();
}

/**
 * Fetch all published articles from the live REST API with optional domain/tag/search filters.
 * Interacts exclusively with the live backend.
 *
 * @param params Optional query filters (categoryId, tagSlug, search).
 * @param options Optional abort signal and retry-progress callback.
 * @returns Promise resolving to an array of published Article entities.
 * @throws Error if network fails or API responds with an error status.
 */
export async function fetchArticles(params?: FetchArticlesParams, options?: ApiReadOptions): Promise<Article[]> {
  const list = extractList<Article>(await requestArticlesJson(buildArticlesUrl(params), options));
  if (list === null) {
    throw new Error('Unexpected response format received from server.');
  }
  return list;
}

/** Pagination metadata of a list page (mapped from the Laravel length-aware paginator). */
export interface PaginationMeta {
  /** 1-based page number returned by the API. */
  currentPage: number;
  /** Last available page (always >= 1, also when there are no results). */
  lastPage: number;
  /** Page size used by the API. */
  perPage: number;
  /** Total number of matching records across all pages. */
  total: number;
  /** 1-based index of the first record on this page, or null when the page is empty. */
  from: number | null;
  /** 1-based index of the last record on this page, or null when the page is empty. */
  to: number | null;
}

/** One page of published articles plus its pagination metadata. */
export interface ArticlesPage {
  items: Article[];
  meta: PaginationMeta;
}

/** Parameters for querying one page of published articles. */
export interface FetchArticlesPageParams extends FetchArticlesParams {
  /** 1-based page number (defaults to 1). */
  page?: number;
  /** Page size (defaults to the API default of 15). */
  perPage?: number;
}

function toPositiveInt(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

/**
 * Fetch one page of published articles from the live REST API (`GET /api/v1/articles?page=N`).
 * Unlike `fetchArticles`, this keeps the paginator metadata so the UI can render page controls.
 *
 * @param params Optional filters plus `page` / `perPage`.
 * @param options Optional abort signal and retry-progress callback.
 * @returns Promise resolving to `{ items, meta }`.
 * @throws Error if network fails, the API responds with an error status, or the body is not a list.
 */
export async function fetchArticlesPage(
  params?: FetchArticlesPageParams,
  options?: ApiReadOptions
): Promise<ArticlesPage> {
  const extra: Record<string, string> = {};
  const requestedPage = params?.page && params.page > 0 ? Math.floor(params.page) : 1;
  extra.page = String(requestedPage);
  if (params?.perPage && params.perPage > 0) extra.per_page = String(Math.floor(params.perPage));

  const json = await requestArticlesJson(buildArticlesUrl(params, extra), options);
  const items = extractList<Article>(json);
  if (items === null) {
    throw new Error('Unexpected response format received from server.');
  }

  // Tolerate a bare array or missing fields by describing the response as a single page.
  const body = (json && typeof json === 'object' && !Array.isArray(json) ? json : {}) as Record<string, unknown>;
  const perPage = toPositiveInt(body.per_page) || params?.perPage || items.length || 1;
  const total = toPositiveInt(body.total) ?? items.length;
  const currentPage = toPositiveInt(body.current_page) || requestedPage;
  const lastPage = Math.max(1, toPositiveInt(body.last_page) ?? Math.ceil(total / perPage));
  const fromRaw = toPositiveInt(body.from);
  const toRaw = toPositiveInt(body.to);
  const derivedFrom = items.length > 0 ? (currentPage - 1) * perPage + 1 : null;

  return {
    items,
    meta: {
      currentPage,
      lastPage,
      perPage,
      total,
      from: items.length > 0 ? fromRaw || derivedFrom : null,
      to: items.length > 0 ? toRaw || (derivedFrom !== null ? derivedFrom + items.length - 1 : null) : null,
    },
  };
}

/**
 * Fetch a single article by its slug or UUID identifier directly from the live REST API.
 *
 * @param identifier The article slug or UUID.
 * @param options Optional abort signal and retry-progress callback.
 * @returns Promise resolving to the Article entity, or null only when the API responds 404.
 * @throws Error on network failure, any non-404 error status, or a 200 response without `data`.
 */
export async function fetchArticle(identifier: string, options?: ApiReadOptions): Promise<Article | null> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const bearerSession = getAccessToken();
  if (bearerSession) {
    headers['Authorization'] = `Bearer ${bearerSession}`;
  }

  const res = await apiFetch(buildApiUrl(`/articles/${encodeURIComponent(identifier)}`), {
    ...(bearerSession ? { cache: 'no-store' } : { next: { revalidate: 60 } }),
    headers,
  }, options);

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
export async function fetchCategories(options?: ApiReadOptions): Promise<Category[]> {
  const res = await apiFetch(buildApiUrl('/categories'), {
    next: { revalidate: 300 },
    headers: { Accept: 'application/json' },
  }, options);

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
export async function fetchTags(options?: ApiReadOptions): Promise<Tag[]> {
  const res = await apiFetch(buildApiUrl('/tags'), {
    next: { revalidate: 300 },
    headers: { Accept: 'application/json' },
  }, options);

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
export async function fetchMyArticles(status?: string, options?: ApiReadOptions): Promise<Article[]> {
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
  }, options);

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
