/**
 * categoryAdminClient.ts -- typed client for CONTENT-01 admin category management.
 *
 * Contract taken from the implemented backend (routes/api/content.php,
 * CategoryController, Create/UpdateCategoryRequest, CategoryService):
 * - GET    /v1/categories           public; roots with ONE level of `children`, each with `articles_count`.
 * - GET    /v1/categories/{slug}    public; one category with `parent` and direct `children` (no counts).
 * - POST   /v1/categories           admin only; { name, slug?, parent_id? } -> 201.
 * - PUT    /v1/categories/{id}      admin only; { name?, slug?, parent_id? } -> 200.
 * - DELETE /v1/categories/{id}      admin only; 422 while the category has children or articles.
 *
 * Every call goes through the shared `api` helper so the bearer token is attached.
 */

import { api } from '@/lib/api';

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  articles_count?: number;
  children?: AdminCategory[];
};

/** Normalized API failure. `status` is undefined when the API could not be reached. */
export type CategoryApiError = {
  status?: number;
  message: string;
  fieldErrors: Record<string, string[]>;
};

export type CategoryInput = {
  name: string;
  /** Empty or null lets the backend derive the slug from the name. */
  slug?: string | null;
  parent_id: string | null;
};

type Envelope<T> = { status: 'success' | 'error'; message?: string; data: T };

const BASE = '/v1/categories';

/** Converts whatever the shared helper threw into a predictable shape; API messages are kept verbatim. */
export function toCategoryApiError(error: unknown, fallback: string): CategoryApiError {
  const e = (error ?? {}) as { status?: unknown; message?: unknown; errors?: unknown };
  const status = typeof e.status === 'number' ? e.status : undefined;
  const fieldErrors: Record<string, string[]> = {};
  if (e.errors && typeof e.errors === 'object') {
    for (const [field, messages] of Object.entries(e.errors as Record<string, unknown>)) {
      if (Array.isArray(messages)) fieldErrors[field] = messages.map(String);
    }
  }
  const message = typeof e.message === 'string' && e.message.trim() ? e.message : fallback;
  return { status, message, fieldErrors };
}

/** True when the request never reached the API (the shared helper throws without an HTTP status). */
export function isNetworkError(error: CategoryApiError): boolean {
  return error.status === undefined;
}

/** Copies only the known fields from an API category, recursively, with `parent_id` defaulting to null. */
function normalize(raw: AdminCategory): AdminCategory {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    parent_id: raw.parent_id ?? null,
    articles_count: typeof raw.articles_count === 'number' ? raw.articles_count : undefined,
    children: Array.isArray(raw.children) ? raw.children.map(normalize) : undefined,
  };
}

/** Max levels fetched below the list endpoint's two levels; guards against bad data looping forever. */
const MAX_EXTRA_DEPTH = 8;

/** At most this many GET /categories/{slug} lookups are in flight at once. */
const MAX_CONCURRENT_LOOKUPS = 5;

type Limiter = <T>(task: () => Promise<T>) => Promise<T>;

/**
 * Small promise pool shared by one tree load. Only the request itself holds a slot (not the
 * recursion into children), so nested lookups can never deadlock waiting for their parents.
 */
function createLimiter(max: number): Limiter {
  let active = 0;
  const queue: Array<() => void> = [];
  /** Starts the next queued task when a slot is free. */
  const next = () => {
    if (active >= max) return;
    const start = queue.shift();
    if (start) start();
  };
  return <T>(task: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      queue.push(() => {
        active += 1;
        task()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            next();
          });
      });
      next();
    });
}

/**
 * The list endpoint only returns roots and their direct children. To show the real tree (and to
 * know every descendant when preventing cycles), each second-level node is expanded through
 * GET /categories/{slug}, level by level. Returns `complete: false` if any expansion failed.
 */
async function hydrate(nodes: AdminCategory[], depth: number, seen: Set<string>, limit: Limiter): Promise<boolean> {
  if (depth > MAX_EXTRA_DEPTH) return nodes.length === 0;
  let complete = true;
  await Promise.all(
    nodes.map(async (node) => {
      if (seen.has(node.id)) {
        node.children = [];
        return;
      }
      seen.add(node.id);
      if (!node.slug) {
        // Without a slug the node cannot be looked up; its deeper levels stay unknown.
        complete = false;
        node.children = node.children ?? [];
        return;
      }
      try {
        const response = await limit(() => api.get<Envelope<AdminCategory>>(`${BASE}/${encodeURIComponent(node.slug)}`));
        node.children = (response.data.children ?? []).map(normalize);
        // Keep the count the list endpoint gave us; the slug endpoint does not count children's articles.
        if (node.articles_count === undefined && typeof response.data.articles_count === 'number') {
          node.articles_count = response.data.articles_count;
        }
      } catch {
        complete = false;
        node.children = node.children ?? [];
        return;
      }
      if (node.children.length > 0) {
        const childComplete = await hydrate(node.children, depth + 1, seen, limit);
        if (!childComplete) complete = false;
      }
    }),
  );
  return complete;
}

export const categoryAdminClient = {
  /** Full tree. `complete` is false when some deeper levels could not be loaded. */
  async tree(): Promise<{ roots: AdminCategory[]; complete: boolean }> {
    const response = await api.get<Envelope<AdminCategory[]>>(BASE);
    const roots = (Array.isArray(response.data) ? response.data : []).map(normalize);
    const seen = new Set<string>(roots.map((root) => root.id));
    const secondLevel = roots.flatMap((root) => root.children ?? []);
    const complete = await hydrate(secondLevel, 1, seen, createLimiter(MAX_CONCURRENT_LOOKUPS));
    return { roots, complete };
  },

  /** POST /categories (admin only). An empty slug lets the backend generate one from the name. */
  create: (input: CategoryInput) =>
    api.post<Envelope<AdminCategory>>(BASE, {
      name: input.name,
      slug: input.slug ? input.slug : null,
      parent_id: input.parent_id,
    }),

  /**
   * Note: when `slug` is empty the backend regenerates it from the name, so callers that only
   * rename should send the current slug to keep it.
   */
  update: (id: string, input: CategoryInput) =>
    api.put<Envelope<AdminCategory>>(`${BASE}/${encodeURIComponent(id)}`, {
      name: input.name,
      slug: input.slug ? input.slug : null,
      parent_id: input.parent_id,
    }),

  /** DELETE /categories/{id} (admin only). The API answers 422 while the category has children or articles. */
  remove: (id: string) => api.delete<{ status: string; message?: string }>(`${BASE}/${encodeURIComponent(id)}`),
};

/** Flattens the tree depth-first, keeping each node's depth for indented option lists. */
export function flattenTree(roots: AdminCategory[]): Array<{ node: AdminCategory; depth: number }> {
  const out: Array<{ node: AdminCategory; depth: number }> = [];
  /** Depth-first visit of one level, recording each node before its children. */
  const walk = (nodes: AdminCategory[], depth: number) => {
    for (const node of nodes) {
      out.push({ node, depth });
      if (node.children?.length) walk(node.children, depth + 1);
    }
  };
  walk(roots, 0);
  return out;
}

/** Ids of the node itself plus all known descendants: none of them may become its parent. */
export function selfAndDescendantIds(node: AdminCategory): Set<string> {
  const ids = new Set<string>();
  /** Adds a node and its children; the visited check stops on malformed (cyclic) data. */
  const walk = (current: AdminCategory) => {
    if (ids.has(current.id)) return;
    ids.add(current.id);
    current.children?.forEach(walk);
  };
  walk(node);
  return ids;
}
