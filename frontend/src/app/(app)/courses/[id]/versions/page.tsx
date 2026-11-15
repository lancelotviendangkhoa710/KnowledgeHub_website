'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Article } from '@/types/content';
import { getAccessToken } from '@/lib/authToken';
import { getCurrentUser, setCurrentUser, subscribeCurrentUser, type AuthUser } from '@/lib/auth';
import { accountClient } from '@/lib/accountClient';
import { fetchArticleForHistory, fetchArticleVersions, VersionApiError, type ArticleVersionEntry } from '@/lib/versionClient';
import VersionTimeline from '@/components/content/versions/VersionTimeline';
import styles from '@/components/content/versions/versions.module.css';
import VersionDetail, { type Mode } from './VersionDetail';
import VersionsHeader from './VersionsHeader';
import { VersionEmpty, VersionForbidden, VersionLoadError, VersionLoading, VersionNotFound, VersionSignIn } from './VersionStates';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'signin' }
  | { kind: 'forbidden' }
  | { kind: 'notfound' }
  | { kind: 'error' };

/**
 * Resolve the signed-in viewer for the current session.
 *
 * Uses the cached user when present, otherwise asks `/me`. The bearer credential in use when the
 * request starts is captured; if it changed meanwhile (sign-out or another sign-in), the stale
 * result is discarded and neither stored globally nor returned.
 *
 * @returns The viewer, or null for guests, failed lookups and superseded sessions.
 */
async function resolveViewer(): Promise<AuthUser | null> {
  const bearerAtStart = getAccessToken();
  if (!bearerAtStart) return null;
  const cached = getCurrentUser();
  if (cached) return cached;
  try {
    const res = await accountClient.me();
    if (getAccessToken() !== bearerAtStart) return null;
    setCurrentUser(res.data.user);
    return res.data.user;
  } catch {
    return null;
  }
}

/**
 * Client-side mitigation only (defence in depth until p2/BE-article-versions-visibility lands).
 *
 * Authors of the article and Admins see every version. Everyone else (guests, other users and
 * contributors) sees only the version whose id equals `article.published_version_id`, because the
 * API does not yet expose verifiable publication history for older versions.
 *
 * @param article The resolved article.
 * @param list Versions returned by the API, newest first.
 * @param viewer Signed-in viewer, or null for guests.
 * @returns Versions to display, how many were withheld, and whether the viewer may see them all.
 */
function visibleVersionsFor(
  article: Article,
  list: ArticleVersionEntry[],
  viewer: AuthUser | null,
): { visible: ArticleVersionEntry[]; hiddenCount: number; canSeeAll: boolean } {
  const canSeeAll = !!viewer && (viewer.roles?.includes('admin') || viewer.id === article.author_id);
  if (canSeeAll) return { visible: list, hiddenCount: 0, canSeeAll: true };
  const visible = article.published_version_id ? list.filter((v) => v.id === article.published_version_id) : [];
  return { visible, hiddenCount: list.length - visible.length, canSeeAll: false };
}

/**
 * `/courses/{idOrSlug}/versions`: read-only version history with view and line-diff compare modes.
 * Visibility is enforced by the API; readers are additionally limited to the published version client-side.
 */
export default function CourseVersionHistoryPage() {
  const params = useParams();
  const idOrSlug = (params?.id as string) || '';
  const courseHref = `/courses/${encodeURIComponent(idOrSlug)}`;
  const historyHref = `${courseHref}/versions`;
  const loginHref = `/login?redirect=${encodeURIComponent(historyHref)}`;

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [retrying, setRetrying] = useState(false);
  const [article, setArticle] = useState<Article | null>(null);
  const [versions, setVersions] = useState<ArticleVersionEntry[]>([]);
  const [mode, setMode] = useState<Mode>('view');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [baseId, setBaseId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [hiddenCount, setHiddenCount] = useState<number>(0);
  const [canSeeAll, setCanSeeAll] = useState(false);
  const requestSeq = useRef(0);
  /** Bearer credential (or null for guests) the currently displayed data was loaded under. */
  const loadedBearerRef = useRef<string | null>(null);

  /** Drop everything loaded under a previous identity so it is never shown under the new one. */
  const resetLoaded = useCallback(() => {
    setArticle(null);
    setVersions([]);
    setSelectedId(null);
    setBaseId(null);
    setTargetId(null);
    setHiddenCount(0);
    setCanSeeAll(false);
    setMode('view');
  }, []);

  /**
   * Load the article and its versions for the current identity.
   * Responses from superseded requests, or from a session that changed mid-flight, are ignored;
   * in the latter case a fresh load is started under the new identity.
   */
  const load = useCallback(async () => {
    if (!idOrSlug) {
      setState({ kind: 'notfound' });
      return;
    }
    const seq = ++requestSeq.current;
    const bearerAtStart = getAccessToken();
    loadedBearerRef.current = bearerAtStart;
    // An error card stays on screen while retrying so its button can show "Đang thử lại...".
    setState((current) => (current.kind === 'error' ? current : { kind: 'loading' }));
    setRetrying(true);
    const isStale = () => seq !== requestSeq.current || getAccessToken() !== bearerAtStart;
    try {
      const resolved = await fetchArticleForHistory(idOrSlug);
      const [all, viewer] = await Promise.all([fetchArticleVersions(resolved.id), resolveViewer()]);
      if (isStale()) {
        if (seq === requestSeq.current) {
          resetLoaded();
          void load();
        }
        return;
      }

      const { visible: list, hiddenCount: hidden, canSeeAll: seeAll } = visibleVersionsFor(resolved, all, viewer);
      setArticle(resolved);
      setVersions(list);
      setHiddenCount(hidden);
      setCanSeeAll(seeAll);
      const published = list.find((v) => v.id === resolved.published_version_id) ?? null;
      const latest = list[0] ?? null;
      setSelectedId((published ?? latest)?.id ?? null);
      setTargetId(latest?.id ?? null);
      const defaultBase = published && published.id !== latest?.id ? published : list[1] ?? null;
      setBaseId(defaultBase?.id ?? null);
      setState({ kind: 'ready' });
    } catch (err: unknown) {
      if (isStale()) {
        if (seq === requestSeq.current) {
          resetLoaded();
          void load();
        }
        return;
      }
      const status = err instanceof VersionApiError ? err.status : null;
      if (status === 401 || (status === 403 && !getAccessToken())) {
        // Guests receive 403 for non-public content; signing in is the only way forward for them.
        setState({ kind: 'signin' });
      } else if (status === 403) {
        setState({ kind: 'forbidden' });
      } else if (status === 404) {
        setState({ kind: 'notfound' });
      } else {
        setState({ kind: 'error' });
      }
    } finally {
      if (seq === requestSeq.current) setRetrying(false);
    }
  }, [idOrSlug, resetLoaded]);

  useEffect(() => {
    void load();
  }, [load]);

  // Sign-in / sign-out: clear data loaded under the old identity and reload with the new permissions.
  useEffect(
    () =>
      subscribeCurrentUser(() => {
        if (getAccessToken() !== loadedBearerRef.current) {
          resetLoaded();
          void load();
        }
      }),
    [load, resetLoaded],
  );

  const byId = useMemo(() => new Map(versions.map((v) => [v.id, v])), [versions]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const base = baseId ? byId.get(baseId) ?? null : null;
  const target = targetId ? byId.get(targetId) ?? null : null;
  const publishedVersionId = article?.published_version_id ?? null;
  const publishedLabel = article?.status === 'published' ? 'Đang xuất bản' : 'Từng xuất bản';
  const courseTitle = article?.published_version?.title || article?.latest_version?.title || versions[0]?.title || 'Khóa học';

  /** Compare the compared version with the one saved just before it. */
  const targetIndex = targetId ? versions.findIndex((v) => v.id === targetId) : -1;
  const previousOfTarget = targetIndex >= 0 ? versions[targetIndex + 1] : undefined;
  const comparePrevious = () => {
    if (previousOfTarget) setBaseId(previousOfTarget.id);
  };

  /** Swap the base and compared versions. */
  const swapCompare = () => {
    setBaseId(targetId);
    setTargetId(baseId);
  };

  const header = state.kind === 'ready' ? <VersionsHeader courseTitle={courseTitle} courseHref={courseHref} /> : <VersionsHeader />;

  let body: React.ReactNode;
  if (state.kind === 'loading') body = <VersionLoading />;
  else if (state.kind === 'signin') body = <VersionSignIn loginHref={loginHref} />;
  else if (state.kind === 'forbidden') body = <VersionForbidden />;
  else if (state.kind === 'notfound') body = <VersionNotFound />;
  else if (state.kind === 'error') body = <VersionLoadError retrying={retrying} onRetry={() => void load()} />;
  else if (versions.length === 0) body = <VersionEmpty />;
  else {
    body = (
      <div className={styles.vh}>
        <div>
          {hiddenCount > 0 && (
            <p role="note" className={styles.note}>
              Bạn chỉ thấy phiên bản đang xuất bản. Các phiên bản khác chỉ tác giả và quản trị viên xem được.
            </p>
          )}
          <VersionTimeline
            versions={versions}
            selectedId={mode === 'view' ? selectedId : targetId}
            publishedVersionId={publishedVersionId}
            publishedLabel={publishedLabel}
            latestId={canSeeAll ? versions[0]?.id ?? null : null}
            onSelect={(id) => (mode === 'view' ? setSelectedId(id) : setTargetId(id))}
          />
        </div>
        <VersionDetail
          versions={versions}
          mode={mode}
          onMode={setMode}
          canCompare={canSeeAll}
          selected={selected}
          base={base}
          target={target}
          onBase={setBaseId}
          onTarget={setTargetId}
          onSwap={swapCompare}
          onComparePrevious={comparePrevious}
          canComparePrevious={Boolean(previousOfTarget)}
        />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {header}
      {body}
    </div>
  );
}
