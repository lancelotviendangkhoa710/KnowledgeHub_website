'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Article } from '@/types/content';
import { getAccessToken } from '@/lib/authToken';
import { getCurrentUser, setCurrentUser, type AuthUser } from '@/lib/auth';
import { accountClient } from '@/lib/accountClient';
import {
  fetchArticleForHistory,
  fetchArticleVersions,
  VersionApiError,
  type ArticleVersionEntry,
} from '@/lib/versionClient';
import VersionTimeline, { formatVersionDate, versionAuthorName } from '@/components/content/versions/VersionTimeline';
import VersionDiffView from '@/components/content/versions/VersionDiffView';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'signin' }
  | { kind: 'forbidden' }
  | { kind: 'notfound' }
  | { kind: 'error'; message: string };

type Mode = 'view' | 'compare';

/** Current signed-in user, fetched once from /me when only a token is held in memory. */
async function resolveViewer(): Promise<AuthUser | null> {
  if (!getAccessToken()) return null;
  const cached = getCurrentUser();
  if (cached) return cached;
  try {
    const res = await accountClient.me();
    setCurrentUser(res.data.user);
    return res.data.user;
  } catch {
    return null;
  }
}

/**
 * Client-side mitigation only: readers (guests, or signed-in users who are neither the author nor an Admin)
 * see versions up to the published one. The API currently returns newer unpublished revisions to everyone;
 * the real fix belongs in the backend versions visibility rules.
 */
function visibleVersionsFor(
  article: Article,
  list: ArticleVersionEntry[],
  viewer: AuthUser | null
): { visible: ArticleVersionEntry[]; hiddenCount: number } {
  const canSeeAll = !!viewer && (viewer.roles?.includes('admin') || viewer.id === article.author_id);
  if (canSeeAll) return { visible: list, hiddenCount: 0 };
  const published = list.find((v) => v.id === article.published_version_id);
  const limit = published ? published.version_no : 0;
  const visible = list.filter((v) => v.version_no <= limit);
  return { visible, hiddenCount: list.length - visible.length };
}

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-white)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-xs)',
};

const labelStyle: React.CSSProperties = {
  display: 'grid',
  gap: '0.3rem',
  fontSize: 'var(--text-sm)',
  fontWeight: 600,
  color: 'var(--color-charcoal)',
  flex: '1 1 200px',
};

const selectStyle: React.CSSProperties = {
  padding: '0.5rem 0.65rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-white)',
  color: 'var(--color-charcoal)',
  font: 'inherit',
  fontWeight: 400,
};

function StateCard({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="container" style={{ padding: '4rem 0' }}>
      <div style={{ ...cardStyle, maxWidth: '560px', margin: '0 auto', textAlign: 'center' }} role="alert">
        <h1 style={{ fontSize: '1.25rem', margin: '0 0 0.75rem 0', color: 'var(--color-charcoal)' }}>{title}</h1>
        <div style={{ color: 'var(--color-gray)', lineHeight: 1.6, marginBottom: actions ? '1.5rem' : 0 }}>
          {children}
        </div>
        {actions && (
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>{actions}</div>
        )}
      </div>
    </div>
  );
}

export default function CourseVersionHistoryPage() {
  const params = useParams();
  const idOrSlug = (params?.id as string) || '';
  const courseHref = `/courses/${encodeURIComponent(idOrSlug)}`;
  const historyHref = `${courseHref}/versions`;
  const loginHref = `/login?redirect=${encodeURIComponent(historyHref)}`;

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [article, setArticle] = useState<Article | null>(null);
  const [versions, setVersions] = useState<ArticleVersionEntry[]>([]);
  const [mode, setMode] = useState<Mode>('view');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [baseId, setBaseId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [hiddenCount, setHiddenCount] = useState<number>(0);
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    if (!idOrSlug) {
      setState({ kind: 'notfound' });
      return;
    }
    const seq = ++requestSeq.current;
    setState({ kind: 'loading' });
    try {
      const resolved = await fetchArticleForHistory(idOrSlug);
      const [all, viewer] = await Promise.all([fetchArticleVersions(resolved.id), resolveViewer()]);
      if (seq !== requestSeq.current) return;

      const { visible: list, hiddenCount: hidden } = visibleVersionsFor(resolved, all, viewer);
      setArticle(resolved);
      setVersions(list);
      setHiddenCount(hidden);
      const published = list.find((v) => v.id === resolved.published_version_id) ?? null;
      const latest = list[0] ?? null;
      setSelectedId((published ?? latest)?.id ?? null);
      setTargetId(latest?.id ?? null);
      const defaultBase = published && published.id !== latest?.id ? published : list[1] ?? null;
      setBaseId(defaultBase?.id ?? null);
      setState({ kind: 'ready' });
    } catch (err: unknown) {
      if (seq !== requestSeq.current) return;
      const status = err instanceof VersionApiError ? err.status : null;
      if (status === 401 || (status === 403 && !getAccessToken())) {
        // Guests receive 403 for non-public content; signing in is the only way forward for them.
        setState({ kind: 'signin' });
      } else if (status === 403) {
        setState({ kind: 'forbidden' });
      } else if (status === 404) {
        setState({ kind: 'notfound' });
      } else {
        setState({
          kind: 'error',
          message: err instanceof Error && err.message ? err.message : 'Unable to load version history.',
        });
      }
    }
  }, [idOrSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const byId = useMemo(() => new Map(versions.map((v) => [v.id, v])), [versions]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const base = baseId ? byId.get(baseId) ?? null : null;
  const target = targetId ? byId.get(targetId) ?? null : null;
  const publishedVersionId = article?.published_version_id ?? null;
  const publishedLabel = article?.status === 'published' ? 'Published' : 'Last published';
  const courseTitle =
    article?.published_version?.title || article?.latest_version?.title || versions[0]?.title || 'Course';

  const compareWithPrevious = (versionId: string) => {
    const index = versions.findIndex((v) => v.id === versionId);
    const previous = index >= 0 ? versions[index + 1] : undefined;
    if (!previous) return;
    setBaseId(previous.id);
    setTargetId(versionId);
    setMode('compare');
  };

  const versionOptionLabel = (v: ArticleVersionEntry) =>
    `v${v.version_no} — ${v.title || 'Untitled'}${
      v.id === publishedVersionId ? ` (${publishedLabel.toLowerCase()})` : ''
    }`;

  const swapCompare = () => {
    setBaseId(targetId);
    setTargetId(baseId);
  };

  if (state.kind === 'loading') {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <p role="status" aria-live="polite" style={{ color: 'var(--color-gray)' }}>
          Loading version history…
        </p>
      </div>
    );
  }

  if (state.kind === 'signin') {
    return (
      <StateCard
        title="Sign in to view this history"
        actions={
          <>
            <Link href={loginHref} className="btn btn-primary">
              Sign in
            </Link>
            <Link href="/courses" className="btn btn-secondary">
              Back to Courses
            </Link>
          </>
        }
      >
        This course is not publicly available. Sign in with an account that can access it to see its versions.
      </StateCard>
    );
  }

  if (state.kind === 'forbidden') {
    return (
      <StateCard
        title="Version history is restricted"
        actions={
          <Link href="/courses" className="btn btn-primary">
            Back to Courses
          </Link>
        }
      >
        Your account does not have permission to view the history of this course.
      </StateCard>
    );
  }

  if (state.kind === 'notfound') {
    return (
      <StateCard
        title="Course not found"
        actions={
          <Link href="/courses" className="btn btn-primary">
            Back to Courses
          </Link>
        }
      >
        The requested course does not exist or is no longer available.
      </StateCard>
    );
  }

  if (state.kind === 'error') {
    return (
      <StateCard
        title="Unable to load version history"
        actions={
          <>
            <button type="button" className="btn btn-primary" onClick={() => load()}>
              Retry
            </button>
            <Link href={courseHref} className="btn btn-secondary">
              Back to course
            </Link>
          </>
        }
      >
        {state.message}
      </StateCard>
    );
  }

  const modeButton = (value: Mode, label: string) => (
    <button
      type="button"
      aria-pressed={mode === value}
      onClick={() => setMode(value)}
      className={mode === value ? 'btn btn-primary' : 'btn btn-outline'}
      style={{ fontSize: 'var(--text-sm)' }}
    >
      {label}
    </button>
  );

  return (
    <div className="container" style={{ padding: '2.5rem 0 4rem' }}>
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1rem', fontSize: 'var(--text-sm)' }}>
        <Link href={courseHref} style={{ color: 'var(--color-primary)' }}>
          ← Back to course
        </Link>
      </nav>

      <header style={{ marginBottom: '1.75rem' }}>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-primary)',
            fontWeight: 600,
          }}
        >
          Version history
        </p>
        <h1 style={{ margin: '0.35rem 0 0.5rem 0', color: 'var(--color-charcoal)', overflowWrap: 'anywhere' }}>
          {courseTitle}
        </h1>
        <p style={{ margin: 0, color: 'var(--color-gray)', fontSize: 'var(--text-sm)' }}>
          Every saved version is kept as a read-only snapshot. Readers see the published version.
        </p>
        {hiddenCount > 0 && (
          <p
            role="note"
            style={{
              margin: '0.75rem 0 0 0',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-primary-faint)',
              color: 'var(--color-charcoal)',
              fontSize: 'var(--text-sm)',
            }}
          >
            Newer unpublished drafts are hidden. Only the author and Admins can see them.
          </p>
        )}
      </header>

      {versions.length === 0 ? (
        <div style={cardStyle}>
          <p style={{ margin: 0, color: 'var(--color-gray)' }}>This course has no saved versions yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
          <aside style={{ flex: '1 1 260px', maxWidth: '100%' }}>
            <VersionTimeline
              versions={versions}
              selectedId={mode === 'view' ? selectedId : targetId}
              publishedVersionId={publishedVersionId}
              publishedLabel={publishedLabel}
              onSelect={(id) => (mode === 'view' ? setSelectedId(id) : setTargetId(id))}
            />
          </aside>

          <section aria-label="Version details" style={{ ...cardStyle, flex: '3 1 480px', minWidth: 0 }}>
            <div
              role="group"
              aria-label="Display mode"
              style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}
            >
              {modeButton('view', 'View version')}
              {modeButton('compare', 'Compare versions')}
            </div>

            {mode === 'view' && selected && (
              <article aria-labelledby="version-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>v{selected.version_no}</span>
                  {selected.id === publishedVersionId && (
                    <span className="badge badge-status-published">{publishedLabel}</span>
                  )}
                </div>
                <h2
                  id="version-title"
                  style={{ margin: '0.4rem 0', color: 'var(--color-charcoal)', overflowWrap: 'anywhere' }}
                >
                  {selected.title || 'Untitled'}
                </h2>
                <p style={{ margin: '0 0 1rem 0', color: 'var(--color-gray)', fontSize: 'var(--text-sm)' }}>
                  {versionAuthorName(selected) ? `By ${versionAuthorName(selected)} · ` : ''}
                  Saved <time dateTime={selected.created_at}>{formatVersionDate(selected.created_at)}</time>
                </p>
                {versions.findIndex((v) => v.id === selected.id) < versions.length - 1 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 'var(--text-sm)', marginBottom: '1rem' }}
                    onClick={() => compareWithPrevious(selected.id)}
                  >
                    Compare with previous version
                  </button>
                )}
                <pre
                  tabIndex={0}
                  aria-label={`Content of version ${selected.version_no}`}
                  style={{
                    margin: 0,
                    padding: '1rem 1.25rem',
                    backgroundColor: 'var(--color-off-white)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-charcoal)',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    maxHeight: '70vh',
                    overflowY: 'auto',
                  }}
                >
                  {selected.content || 'This version has no content.'}
                </pre>
              </article>
            )}

            {mode === 'compare' &&
              (versions.length < 2 ? (
                <p style={{ margin: 0, color: 'var(--color-gray)' }}>
                  Only one version exists, so there is nothing to compare yet.
                </p>
              ) : (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'flex-end',
                      flexWrap: 'wrap',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <label style={labelStyle}>
                      Base version
                      <select
                        value={baseId ?? ''}
                        onChange={(e) => setBaseId(e.target.value || null)}
                        style={selectStyle}
                      >
                        {versions.map((v) => (
                          <option key={v.id} value={v.id}>
                            {versionOptionLabel(v)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={swapCompare}
                      aria-label="Swap base and compared versions"
                      style={{ fontSize: 'var(--text-sm)' }}
                    >
                      ⇄ Swap
                    </button>
                    <label style={labelStyle}>
                      Compared version
                      <select
                        value={targetId ?? ''}
                        onChange={(e) => setTargetId(e.target.value || null)}
                        style={selectStyle}
                      >
                        {versions.map((v) => (
                          <option key={v.id} value={v.id}>
                            {versionOptionLabel(v)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p style={{ margin: '0 0 1rem 0', color: 'var(--color-gray)', fontSize: 'var(--text-xs)' }}>
                    Selecting a version in the list sets the compared version.
                  </p>
                  {base && target ? (
                    base.id === target.id ? (
                      <p style={{ margin: 0, color: 'var(--color-gray)' }}>
                        Select two different versions to see their differences.
                      </p>
                    ) : (
                      <VersionDiffView key={`${base.id}:${target.id}`} base={base} target={target} />
                    )
                  ) : (
                    <p style={{ margin: 0, color: 'var(--color-gray)' }}>Select two versions to compare.</p>
                  )}
                </div>
              ))}
          </section>
        </div>
      )}
    </div>
  );
}
