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

/** Login URL that brings the visitor back to this page after signing in. */
const LOGIN_PATH = '/login?redirect=/admin/tags';
/** Roles allowed to create tags; mirrors `CreateTagRequest::authorize` on the backend. */
const ALLOWED_ROLES = ['contributor', 'admin'];

/** Outcome of the last create attempt, shown under the form. */
type CreateResult =
  | { kind: 'created'; tag: TagRecord }
  | { kind: 'exists'; tag: TagRecord; name: string }
  | { kind: 'error'; message: string };

/** True when the user holds a role the backend accepts for creating tags. */
function canManageTags(user: AuthUser | null): boolean {
  return !!user && (user.roles ?? []).some((role) => ALLOWED_ROLES.includes(role));
}

/** Human-readable message for an API error (network, 401, 403, 429 or Laravel validation). */
function describeError(error: unknown, fallback: string): string {
  const e = error as TagError;
  if (isNetworkError(error)) return e?.message ?? 'Unable to reach the KnowledgeHub API.';
  if (e.status === 401) return 'Your session has expired. Please sign in again.';
  if (e.status === 403) return 'Your account is not allowed to create tags.';
  if (e.status === 429) return 'Too many attempts. Please wait a minute and try again.';
  const first = e.errors ? Object.values(e.errors)[0]?.[0] : undefined;
  return first ?? e.message ?? fallback;
}

/**
 * `/admin/tags` route: resolves the signed-in user, then renders the Tag Library for
 * contributors/admins, a restricted card for other roles, or redirects guests to login.
 */
export default function TagLibraryPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(() => getCurrentUser());
  const [authChecked, setAuthChecked] = useState(false);
  // Set when the profile could not be loaded for a transient reason (network/5xx); the session is kept.
  const [profileError, setProfileError] = useState<string | null>(null);
  // Bumped by the Retry button to re-run the profile load.
  const [profileAttempt, setProfileAttempt] = useState(0);

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
      setProfileError(null);
      accountClient
        .me()
        .then((response) => {
          if (cancelled) return;
          setCurrentUser(response.data.user);
          setUser(response.data.user);
          setAuthChecked(true);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          const status = (error as TagError)?.status;
          // Only an invalid session goes back to login; transient failures keep the page and offer Retry.
          if (status === 401 || status === 403) router.replace(LOGIN_PATH);
          else setProfileError(describeError(error, 'Unable to load your profile.'));
        });
    }
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router, profileAttempt]);

  // Signing out while on the page sends the visitor to the login screen.
  useEffect(() => {
    if (authChecked && !user) router.replace(LOGIN_PATH);
  }, [authChecked, user, router]);

  if (profileError) {
    return (
      <section className="auth-page content-container">
        <div className="auth-card">
          <p className="eyebrow">Tag Library</p>
          <h1>Could not check your access</h1>
          <p className="auth-error" role="alert">{profileError}</p>
          <button
            className="button button--primary auth-submit"
            type="button"
            onClick={() => setProfileAttempt((attempt) => attempt + 1)}
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

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

/** Tag list with client-side filter and the create form; rendered only for allowed roles. */
function TagLibrary() {
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [filter, setFilter] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  // A create ended with an unknown result (network error): submit stays locked until the list is reloaded.
  const [needsRecheck, setNeedsRecheck] = useState(false);
  const latestLoad = useRef(0);

  /** Load every tag; resolves true only when this (latest) request succeeded. */
  const load = useCallback(async (): Promise<boolean> => {
    const requestId = ++latestLoad.current;
    setLoading(true);
    setLoadError(null);
    try {
      const list = await tagAdminClient.listAll();
      if (requestId !== latestLoad.current) return false;
      setTags(list.tags);
      setTruncated(list.truncated);
      return true;
    } catch (error) {
      if (requestId === latestLoad.current) setLoadError(describeError(error, 'Unable to load tags.'));
      return false;
    } finally {
      if (requestId === latestLoad.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Tags matching the filter box by normalised name or by slug. */
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
  // The slug can outgrow the name (e.g. "@" becomes "-at-"); the API rejects slugs over 100 characters.
  const slugTooLong = !tooLong && slug.length > TAG_NAME_MAX;
  const canSubmit =
    cleanName !== '' &&
    !existing &&
    !tooLong &&
    !slugTooLong &&
    !noSlug &&
    !submitting &&
    !needsRecheck &&
    !loading &&
    !loadError;

  /** Validate locally, POST the tag, then show created / already existed / error and refresh the list. */
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
        // Possibly created meanwhile: report "exists" only if the refreshed list really has a match.
        const fresh = await tagAdminClient.listAll().catch(() => null);
        if (fresh) {
          setTags(fresh.tags);
          setTruncated(fresh.truncated);
        }
        const match = fresh ? findExistingTag(fresh.tags, cleanName) : null;
        if (match) setResult({ kind: 'exists', tag: match, name: cleanName });
        else setResult({ kind: 'error', message: describeError(error, 'Unable to create this tag.') });
      } else if (isNetworkError(error)) {
        // Lock before `finally` releases `submitting`, so Create cannot be pressed until the list is reloaded.
        setNeedsRecheck(true);
      } else {
        if (e?.status === 401) setSessionExpired(true);
        setResult({ kind: 'error', message: describeError(error, 'Unable to create this tag.') });
      }
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Reload the list; when it succeeds, release the post-network-error lock so the duplicate
   * hint is re-evaluated against fresh data (the earlier attempt may have reached the server).
   */
  async function reloadTags() {
    setResult(null);
    const ok = await load();
    if (ok) setNeedsRecheck(false);
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
            aria-invalid={!!existing || tooLong || slugTooLong || noSlug}
          />
          <small id="tag-name-hint" className="account-hint">
            {existing
              ? `Already exists as "${existing.name}" (${existing.slug}). Use the existing tag instead.`
              : tooLong
                ? `Use at most ${TAG_NAME_MAX} characters.`
                : slugTooLong
                  ? `The generated slug would be ${slug.length} characters; shorten the name so it stays within ${TAG_NAME_MAX}.`
                  : noSlug
                  ? 'Include at least one Latin letter or number.'
                  : cleanName
                    ? `Slug: ${slug}`
                    : `Up to ${TAG_NAME_MAX} characters.`}
          </small>
        </label>
        <span className="visually-hidden" aria-live="polite">{existing ? 'This tag already exists.' : ''}</span>
        <div className="account-actions">
          <button className="button button--primary account-submit" type="submit" disabled={!canSubmit}>
            {submitting ? 'Creating...' : 'Create tag'}
          </button>
        </div>

        <div role="status">
          {result?.kind === 'created' && (
            <p className="auth-message">
              Created tag &quot;{result.tag.name}&quot; ({result.tag.slug}).
            </p>
          )}
          {result?.kind === 'exists' && (
            <p className="auth-message">
              &quot;{result.name}&quot; already existed as &quot;{result.tag.name}&quot; ({result.tag.slug}). No new tag was created.
            </p>
          )}
        </div>
        {needsRecheck && (
          <div className="auth-error" role="alert">
            <p>
              Could not reach the KnowledgeHub API, so the tag may or may not have been created. Retry reloads
              the tag list first; Create stays locked until it succeeds.
            </p>
            <button className="button button--secondary" type="button" disabled={loading} onClick={() => void reloadTags()}>
              {loading ? 'Reloading...' : 'Retry'}
            </button>
          </div>
        )}
        {result?.kind === 'error' && (
          <div className="auth-error" role="alert">
            <p>{result.message}</p>
            {sessionExpired && <Link href={LOGIN_PATH}>Sign in again</Link>}
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

      {truncated && !loadError && (
        <p className="auth-error" role="alert">
          Only the first {tags.length} tags were loaded. The list and the duplicate check may be incomplete.
        </p>
      )}

      {loadError ? (
        <div className="auth-error" role="alert">
          <p>{loadError}</p>
          <button className="button button--secondary" type="button" onClick={() => void reloadTags()}>Retry</button>
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
