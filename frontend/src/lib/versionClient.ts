/**
 * versionClient.ts -- read-only client for article version history (CONTENT-02 follow-up).
 *
 * Backend contract (backend/routes/api/content.php, ArticleController::versions):
 *   GET /api/v1/articles/{article}/versions   ({article} = article UUID, route-model bound)
 *   -> 200 { status: 'success', data: ArticleVersion[] (version_no DESC, each with `creator`) }
 *   -> 403 when ArticlePolicy::view denies (non-published article, actor is not author/admin)
 *   -> 404 { status: 'error', code: 'not_found' } for unknown / soft-deleted articles
 *
 * Also contains a dependency-free line diff (Myers O(ND)) used by the compare view.
 */

import { Article, ArticleVersion } from '@/types/content';
import { sessionFetch } from '@/lib/api';

const rawBase = process.env.NEXT_PUBLIC_API_URL || '/api';
const BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
const API_BASE = `${BASE_URL}/v1`;

/** Error carrying the HTTP status so pages can branch on 401 / 403 / 404. `status` is null for network failures. */
export class VersionApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'VersionApiError';
    this.status = status;
  }
}

/** Minimal public view of the version author; the API returns the full user row, only `name` is displayed. */
export interface VersionCreator {
  id: string;
  name?: string | null;
}

/** A version snapshot as returned by the versions endpoint. */
export interface ArticleVersionEntry extends ArticleVersion {
  creator?: VersionCreator | null;
}

/** JSON Accept header; the session cookie is added by sessionFetch. */
function authHeaders(): Record<string, string> {
  return { Accept: 'application/json' };
}

/**
 * GET a JSON endpoint under `/api/v1` without caching.
 *
 * @param path Path relative to `/api/v1`.
 * @param fallbackMessage Message prefix used when the error body has no `message`.
 * @throws VersionApiError carrying the HTTP status (null for network failures).
 */
async function getJson(path: string, fallbackMessage: string): Promise<unknown> {
  let res: Response;
  try {
    res = await sessionFetch(`${API_BASE}${path}`, { cache: 'no-store', headers: authHeaders() });
  } catch {
    throw new VersionApiError('Cannot reach the KnowledgeHub API.', null);
  }

  if (!res.ok) {
    const body: { message?: string } = await res.json().catch(() => ({}));
    throw new VersionApiError(body.message || `${fallbackMessage} (HTTP ${res.status}).`, res.status);
  }

  return res.json().catch(() => {
    throw new VersionApiError('Unexpected response format received from server.', res.status);
  });
}

/**
 * Resolve an article by slug or UUID, keeping the HTTP status on failure
 * (contentClient.fetchArticle collapses 401/403 into a plain Error).
 */
export async function fetchArticleForHistory(idOrSlug: string): Promise<Article> {
  const json = (await getJson(`/articles/${encodeURIComponent(idOrSlug)}`, 'Failed to load course')) as {
    data?: Article;
  } | null;
  if (!json?.data) {
    throw new VersionApiError('Unexpected course response format received from server.', 200);
  }
  return json.data;
}

/**
 * Load every version snapshot of an article, newest first.
 *
 * @param articleId Article UUID (the versions route does not accept slugs).
 */
export async function fetchArticleVersions(articleId: string): Promise<ArticleVersionEntry[]> {
  const json = (await getJson(`/articles/${encodeURIComponent(articleId)}/versions`, 'Failed to load version history')) as {
    data?: unknown;
  } | null;
  const data = json?.data;
  if (!Array.isArray(data)) {
    throw new VersionApiError('Unexpected version history response format received from server.', 200);
  }
  return (data as ArticleVersionEntry[]).slice().sort((a, b) => b.version_no - a.version_no);
}

// ── Line diff ───────────────────────────────────────────────────────────────

export type DiffLineKind = 'equal' | 'added' | 'removed';

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
  /** 1-based line number in the base text (absent for added lines). */
  oldNo?: number;
  /** 1-based line number in the compared text (absent for removed lines). */
  newNo?: number;
}

export interface LineDiffResult {
  lines: DiffLine[];
  added: number;
  removed: number;
  /** True when the edit distance exceeded the budget and the middle block was reported as a whole replacement. */
  approximate: boolean;
}

/** Maximum edit distance explored by Myers before falling back (bounds time and the O(D^2) trace memory). */
const MAX_EDIT_DISTANCE = 2000;

/** Split text into lines, normalising CRLF/CR to LF; empty text has no lines. */
function splitLines(text: string): string[] {
  if (text === '') return [];
  return text.replace(/\r\n?/g, '\n').split('\n');
}

/**
 * Myers shortest edit script over interned line ids.
 * Returns ops ('=', '-', '+') in forward order, or null when D exceeds `maxD`.
 */
function myers(a: Int32Array, b: Int32Array, maxD: number): string[] | null {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];
  let found = -1;

  for (let d = 0; d <= Math.min(max, maxD); d++) {
    // Snapshot of V before step d, covering k in [-(d+1), d+1].
    trace.push(v.slice(offset - d - 1, offset + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) {
        x = v[offset + k + 1];
      } else {
        x = v[offset + k - 1] + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        found = d;
        break;
      }
    }
    if (found >= 0) break;
  }

  if (found < 0) return null;

  const ops: string[] = [];
  let x = n;
  let y = m;
  for (let d = found; d > 0; d--) {
    const snap = trace[d];
    const get = (k: number) => snap[k + d + 1];
    const k = x - y;
    const prevK = k === -d || (k !== d && get(k - 1) < get(k + 1)) ? k + 1 : k - 1;
    const prevX = get(prevK);
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      ops.push('=');
      x--;
      y--;
    }
    if (x === prevX) {
      ops.push('+');
    } else {
      ops.push('-');
    }
    x = prevX;
    y = prevY;
  }
  while (x > 0 && y > 0) {
    ops.push('=');
    x--;
    y--;
  }
  return ops.reverse();
}

/**
 * Compute a line-level diff between two texts.
 * Common prefix/suffix are trimmed first, so typical small edits on long documents stay cheap.
 */
export function diffLines(oldText: string, newText: string, maxEditDistance = MAX_EDIT_DISTANCE): LineDiffResult {
  const a = splitLines(oldText);
  const b = splitLines(newText);

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const lines: DiffLine[] = [];
  let oldNo = 0;
  let newNo = 0;
  let added = 0;
  let removed = 0;
  const pushEqual = (text: string) => lines.push({ kind: 'equal', text, oldNo: ++oldNo, newNo: ++newNo });
  const pushRemoved = (text: string) => {
    removed++;
    lines.push({ kind: 'removed', text, oldNo: ++oldNo });
  };
  const pushAdded = (text: string) => {
    added++;
    lines.push({ kind: 'added', text, newNo: ++newNo });
  };

  for (let i = 0; i < start; i++) pushEqual(a[i]);

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  let approximate = false;

  if (midA.length === 0 || midB.length === 0) {
    midA.forEach(pushRemoved);
    midB.forEach(pushAdded);
  } else {
    const ids = new Map<string, number>();
    const intern = (s: string) => {
      let id = ids.get(s);
      if (id === undefined) {
        id = ids.size;
        ids.set(s, id);
      }
      return id;
    };
    const ia = Int32Array.from(midA, intern);
    const ib = Int32Array.from(midB, intern);
    const ops = myers(ia, ib, maxEditDistance);
    if (ops === null) {
      approximate = true;
      midA.forEach(pushRemoved);
      midB.forEach(pushAdded);
    } else {
      let i = 0;
      let j = 0;
      // Emit removals before additions inside each changed run for a stable, readable order.
      let pendingAdds: string[] = [];
      const flushAdds = () => {
        pendingAdds.forEach(pushAdded);
        pendingAdds = [];
      };
      for (const op of ops) {
        if (op === '=') {
          flushAdds();
          pushEqual(midA[i++]);
          j++;
        } else if (op === '-') {
          pushRemoved(midA[i++]);
        } else {
          pendingAdds.push(midB[j++]);
        }
      }
      flushAdds();
    }
  }

  for (let i = endA; i < a.length; i++) pushEqual(a[i]);

  return { lines, added, removed, approximate };
}
