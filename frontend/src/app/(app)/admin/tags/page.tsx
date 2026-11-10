'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { accountClient } from '@/lib/accountClient';
import { AuthUser, getCurrentUser, setCurrentUser, subscribeCurrentUser } from '@/lib/auth';
import { getAccessToken } from '@/lib/authToken';
import {
  TAG_NAME_MAX,
  TagError,
  TagRecord,
  cleanTagName,
  findExistingTag,
  isNetworkError,
  nameKey,
  tagAdminClient,
  tagSlug,
} from '@/lib/tagAdminClient';

const LOGIN_PATH = '/login?redirect=/admin/tags';
// Mirrors CreateTagRequest::authorize on the backend.
const ALLOWED_ROLES = ['contributor', 'admin'];

type CreateResult =
  | { kind: 'created'; tag: TagRecord }
  | { kind: 'exists'; tag: TagRecord | null; name: string }
  | { kind: 'error'; message: string; retryable: boolean };

function canManageTags(user: AuthUser | null): boolean {
  return !!user && (user.roles ?? []).some((role) => ALLOWED_ROLES.includes(role));
}

function describeError(error: unknown, fallback: string): string {
  const e = error as TagError;
  if (isNetworkError(error)) return e?.message ?? 'Unable to reach the KnowledgeHub API.';
  if (e.status === 401) return 'Your session has expired. Please sign in again.';
  if (e.status === 403) return 'Your account is not allowed to create tags.';
  if (e.status === 429) return 'Too many attempts. Please wait a minute and try again.';
  const first = e.errors ? Object.values(e.errors)[0]?.[0] : undefined;
  return first ?? e.message ?? fallback;
}

export default function TagLibraryPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(() => getCurrentUser());
  const [authChecked, setAuthChecked] = useState(false);

  // Resolve the signed-in user (token is in memory; restore the profile if only the token is known).
  useEffect(() => {
    let cancelled = false;
    const unsubscribe = subscribeCurrentUser(() => {
      if (!cancelled) setUser(getCurrentUser());
    });
    const current = getCurrentUser();
    if (current) {
      setUser(current);
      setAuthChecked(true);
    } else if (!getAccessToken()) {
      router.replace(LOGIN_PATH);
    } else {
      accountClient
        .me()
        .then((response) => {
          if (cancelled) return;
          setCurrentUser(response.data.user);
          setUser(response.data.user);
          setAuthChecked(true);
        })
        .catch(() => {
          if (!cancelled) router.replace(LOGIN_PATH);
        });
    }
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router]);

  // Signing out while on the page sends the visitor to the login screen.
  useEffect(() => {
    if (authChecked && !user) router.replace(LOGIN_PATH);
  }, [authChecked, user, router]);

  if (!authChecked || !user) {
    return (
      <section className="account-page content-container">
        <p className="auth-lead" role="status">Checking your access...</p>
      </section>
    );
  }

  if (!canManageTags(user)) {
    return (
      <section className="auth-page content-container">
        <div className="auth-card">
          <p className="eyebrow">Tag Library</p>
          <h1>Access restricted</h1>
          <p className="auth-lead">
            The Tag Library is available to contributor and admin accounts. If you need to create tags,
            please ask an administrator to update your role.
          </p>
          <Link className="button button--primary auth-submit" href="/">Back to home</Link>
        </div>
      </section>
    );
  }

  return <TagLibrary />;
}

function TagLibrary() {
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const latestLoad = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestLoad.current;
    setLoading(true);
    setLoadError(null);
    try {
      const list = await tagAdminClient.listAll();
      if (requestId === latestLoad.current) setTags(list);
    } catch (error) {
      if (requestId === latestLoad.current) setLoadError(describeError(error, 'Unable to load tags.'));
    } finally {
      if (requestId === latestLoad.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleTags = useMemo(() => {
    const key = nameKey(filter);
    if (!key) return tags;
    const slugKey = tagSlug(filter);
    return tags.filter((tag) => nameKey(tag.name).includes(key) || (slugKey !== '' && tag.slug.includes(slugKey)));
  }, [tags, filter]);

  const hasCounts = tags.some((tag) => typeof tag.articles_count === 'number');
  const cleanName = cleanTagName(name);
  const slug = tagSlug(cleanName);
  const existing = cleanName ? findExistingTag(tags, cleanName) : null;
  const tooLong = cleanName.length > TAG_NAME_MAX;
  const noSlug = cleanName !== '' && slug === '';
  const canSubmit = cleanName !== '' && !existing && !tooLong && !noSlug && !submitting && !loading && !loadError;

  async function createTag(event?: FormEvent) {
    event?.preventDefault();
    if (!canSubmit) {
      if (existing) setResult({ kind: 'exists', tag: existing, name: cleanName });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const response = await tagAdminClient.create(cleanName);
      setResult({ kind: 'created', tag: response.data });
      setName('');
      await load();
    } catch (error) {
      const e = error as TagError;
      if (e?.status === 422 && e.errors?.slug) {
        // Someone created the same tag meanwhile: refresh and show it as existing.
        const fresh = await tagAdminClient.listAll().catch(() => null);
        if (fresh) setTags(fresh);
        setResult({ kind: 'exists', tag: fresh ? findExistingTag(fresh, cleanName) : null, name: cleanName });
      } else if (isNetworkError(error)) {
        setResult({
          kind: 'error',
          message: 'Could not reach the KnowledgeHub API, so the tag may or may not have been created. Retry to check and try again.',
          retryable: true,
        });
      } else {
        if (e?.status === 401) setSessionExpired(true);
        setResult({ kind: 'error', message: describeError(error, 'Unable to create this tag.'), retryable: false });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function retryCreate() {
    // The earlier attempt may have reached the server: refresh first so the duplicate check sees it.
    setResult(null);
    await load();
  }

  return (
    <section className="account-page account-page--wide content-container">
      <p className="eyebrow">Content</p>
      <h1>Tag Library</h1>
      <p className="auth-lead">
        Tags are shared across all articles. Check the list before adding one; names that differ only by
        case, accents, spacing or punctuation count as the same tag.
      </p>

      <form className="account-card" onSubmit={(event) => void createTag(event)} noValidate>
        <h2>Create a tag</h2>
        <label className="auth-field" htmlFor="tag-name">
          Tag name
          <input
            id="tag-name"
            value={name}
            onChange={(event) => { setName(event.target.value); setResult(null); }}
            maxLength={TAG_NAME_MAX + 20}
            autoComplete="off"
            disabled={submitting}
            aria-describedby="tag-name-hint"
            aria-invalid={!!existing || tooLong || noSlug}
          />
          <small id="tag-name-hint" className="account-hint">
            {existing
              ? `Already exists as "${existing.name}" (${existing.slug}). Use the existing tag instead.`
              : tooLong
                ? `Use at most ${TAG_NAME_MAX} characters.`
                : noSlug
                  ? 'Include at least one Latin letter or number.'
                  : cleanName
                    ? `Slug: ${slug}`
                    : `Up to ${TAG_NAME_MAX} characters.`}
          </small>
          <span className="visually-hidden" aria-live="polite">{existing ? 'This tag already exists.' : ''}</span>
        </label>
        <div className="account-actions">
          <button className="button button--primary account-submit" type="submit" disabled={!canSubmit}>
            {submitting ? 'Creating...' : 'Create tag'}
          </button>
        </div>

        <div aria-live="polite">
          {result?.kind === 'created' && (
            <p className="auth-message" role="status">
              Created tag &quot;{result.tag.name}&quot; ({result.tag.slug}).
            </p>
          )}
          {result?.kind === 'exists' && (
            <p className="auth-message" role="status">
              &quot;{result.name}&quot; already existed{result.tag ? ` as "${result.tag.name}" (${result.tag.slug})` : ''}. No new tag was created.
            </p>
          )}
        </div>
        {result?.kind === 'error' && (
          <div className="auth-error" role="alert">
            <p>{result.message}</p>
            {result.retryable && (
              <button className="button button--secondary" type="button" onClick={() => void retryCreate()}>
                Retry
              </button>
            )}
            {sessionExpired && <Link href="/login?redirect=/admin/tags">Sign in again</Link>}
          </div>
        )}
      </form>

      <div className="users-filters" role="search">
        <input
          type="search"
          aria-label="Filter tags"
          placeholder="Filter tags by name or slug"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          maxLength={TAG_NAME_MAX}
        />
      </div>

      {loadError ? (
        <div className="auth-error" role="alert">
          <p>{loadError}</p>
          <button className="button button--secondary" type="button" onClick={() => void load()}>Retry</button>
        </div>
      ) : loading && tags.length === 0 ? (
        <p className="auth-lead" role="status">Loading tags...</p>
      ) : tags.length === 0 ? (
        <div className="empty-state"><h3>No tags yet</h3><p>Create the first tag above.</p></div>
      ) : visibleTags.length === 0 ? (
        <div className="empty-state"><h3>No matching tags</h3><p>Try a different filter.</p></div>
      ) : (
        <>
          <p className="account-hint" aria-live="polite">
            Showing {visibleTags.length} of {tags.length} tag{tags.length === 1 ? '' : 's'}{loading ? ' (refreshing...)' : ''}.
          </p>
          <div className="users-table-wrap">
            <table className="users-table">
              <caption className="visually-hidden">Tags, sorted alphabetically</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Slug</th>
                  {hasCounts && <th scope="col">Articles</th>}
                </tr>
              </thead>
              <tbody>
                {visibleTags.map((tag) => (
                  <tr key={tag.id}>
                    <td data-label="Name">{tag.name}</td>
                    <td data-label="Slug"><code>{tag.slug}</code></td>
                    {hasCounts && <td data-label="Articles">{tag.articles_count ?? 0}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
