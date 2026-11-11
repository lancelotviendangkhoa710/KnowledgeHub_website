'use client';

import { Suspense, useEffect, useState, useCallback, useRef, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import CourseCard from '@/components/content/CourseCard';
import { Article, Category } from '@/types/content';
import {
  fetchArticlesPage,
  fetchCategories,
  ApiReadOptions,
  PaginationMeta,
  SERVER_WAKING_MESSAGE,
} from '@/lib/contentClient';
import { getCurrentUser, setCurrentUser as setGlobalCurrentUser, subscribeCurrentUser, AuthUser } from '@/lib/auth';
import { getAccessToken } from '@/lib/authToken';
import { accountClient } from '@/lib/accountClient';
import { api } from '@/lib/api';

/** Page size requested from `GET /api/v1/articles` (matches the backend default). */
const COURSES_PER_PAGE = 15;
/** Shape of a category UUID accepted in `?category=`; anything else is ignored and never sent to the API. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads `?page=` as a positive integer; anything else (missing, 0, negative, text) means page 1. */
function parsePageParam(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 1 ? n : 1;
}

/** Reads `?category=` as a category UUID; anything else means "all domains". */
function parseCategoryParam(value: string | null): string {
  return value && UUID_PATTERN.test(value) ? value : 'all';
}

/** Identifies which request produced the course data on screen: 1-based page plus category id or `'all'`. */
interface ResultsKey {
  /** 1-based page number that was requested. */
  page: number;
  /** Category UUID that was requested, or `'all'` for no filter. */
  category: string;
}

/**
 * Public course catalog route (`/courses`). Wraps the catalog in a Suspense boundary because it reads
 * `useSearchParams()`.
 */
export default function CoursesPage() {
  // useSearchParams() needs a Suspense boundary so the route can still be prerendered at build time.
  return (
    <Suspense
      fallback={
        <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center', color: 'var(--color-gray)' }}>
          Loading curated courses...
        </div>
      }
    >
      <CoursesCatalog />
    </Suspense>
  );
}

/**
 * Catalog content: server-paginated course grid synced to `?page=` / `?category=`, domain filter pills,
 * client-side search over the current page and the contributor call-to-action strip.
 */
function CoursesCatalog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawPage = searchParams.get('page');
  const rawCategory = searchParams.get('category');
  // The URL is the source of truth for page and category, so refresh/back keep the same view.
  const currentPage = parsePageParam(rawPage);
  const selectedCategory = parseCategoryParam(rawCategory);

  const [articles, setArticles] = useState<Article[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  // Total number of published courses (from the last unfiltered page load) for the "All Domains" pill.
  const [allTotal, setAllTotal] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  // True only after a SUCCESSFUL categories load; a failure never counts as "loaded".
  const [categoriesLoaded, setCategoriesLoaded] = useState<boolean>(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(false);
  // Which request (page + category) produced `articles` / `meta`; differs from the URL after a failed load.
  const [resultsKey, setResultsKey] = useState<ResultsKey | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [wakingUp, setWakingUp] = useState<boolean>(false);
  // Controller of the page load currently in flight; a newer load aborts it so rapid clicks never race.
  const loadAbortRef = useRef<AbortController | null>(null);
  const categoriesAbortRef = useRef<AbortController | null>(null);
  const listTopRef = useRef<HTMLElement | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getCurrentUser);

  /** Keeps `currentUser` in sync with the auth store and resolves the profile when only a token exists. */
  useEffect(() => {
    const unsub = subscribeCurrentUser(() => setCurrentUser(getCurrentUser()));
    const authBearer = getAccessToken();
    if (authBearer && !getCurrentUser()) {
      accountClient
        .me()
        .then((res) => {
          setGlobalCurrentUser(res.data.user);
          setCurrentUser(res.data.user);
        })
        .catch((err: { status?: number }) => {
          if (err?.status === 401) {
            setGlobalCurrentUser(null);
            setCurrentUser(null);
          }
        });
    }
    return unsub;
  }, []);

  /** Writes page/category to the URL with `replace`, keeping any other query params. */
  const updateQuery = useCallback(
    (page: number, category: string) => {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      if (page > 1) params.set('page', String(page));
      else params.delete('page');
      if (category !== 'all') params.set('category', category);
      else params.delete('category');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  /** Normalises invalid query values in the address bar (e.g. `?page=abc` or `?page=0` → page 1). */
  useEffect(() => {
    // Page 1 is the default, so `?page=1` is also removed to keep one canonical URL per page.
    const pageInvalid = rawPage !== null && (currentPage === 1 || String(currentPage) !== rawPage);
    const categoryInvalid = rawCategory !== null && parseCategoryParam(rawCategory) === 'all';
    if (pageInvalid || categoryInvalid) {
      updateQuery(currentPage, selectedCategory);
    }
  }, [rawPage, rawCategory, currentPage, selectedCategory, updateQuery]);

  /**
   * Loads the domain filter pills. Categories are non-critical: on failure the course list, the active
   * category filter and the page stay as they are, and a non-blocking notice offers its own Retry.
   */
  const loadCategories = useCallback(async () => {
    categoriesAbortRef.current?.abort();
    const controller = new AbortController();
    categoriesAbortRef.current = controller;
    setCategoriesLoading(true);
    try {
      const cats = await fetchCategories({ signal: controller.signal });
      if (controller.signal.aborted) return;
      setCategories(cats);
      setCategoriesError(null);
      setCategoriesLoaded(true);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setCategoriesError(err instanceof Error && err.message ? err.message : 'Unable to load course domains.');
    } finally {
      if (categoriesAbortRef.current === controller) {
        categoriesAbortRef.current = null;
        setCategoriesLoading(false);
      }
    }
  }, []);

  /** Loads the categories once on mount and aborts that request on unmount. */
  useEffect(() => {
    loadCategories();
    return () => {
      categoriesAbortRef.current?.abort();
      categoriesAbortRef.current = null;
    };
  }, [loadCategories]);

  /** Drops a category filter only when a successful categories load proves it does not exist. */
  useEffect(() => {
    if (categoriesLoaded && selectedCategory !== 'all' && !categories.some((c) => c.id === selectedCategory)) {
      updateQuery(1, 'all');
    }
  }, [categoriesLoaded, categories, selectedCategory, updateQuery]);

  /**
   * Loads one page of published courses for a category (`'all'` = no filter). The newest call aborts any
   * load still in flight; on failure the previously shown results and their `resultsKey` are kept.
   */
  const loadPage = useCallback(
    async (page: number, category: string) => {
      // Latest request wins: abort a load that is still in flight (or still retrying during cold start).
      loadAbortRef.current?.abort();
      const controller = new AbortController();
      loadAbortRef.current = controller;
      setLoading(true);
      setLoadError(null);
      setWakingUp(false);
      const readOptions: ApiReadOptions = {
        signal: controller.signal,
        onRetry: () => {
          if (!controller.signal.aborted) setWakingUp(true);
        },
      };
      try {
        const result = await fetchArticlesPage(
          {
            page,
            perPage: COURSES_PER_PAGE,
            categoryId: category === 'all' ? undefined : category,
          },
          readOptions
        );
        if (controller.signal.aborted) return;

        // A page past the end (stale link, courses removed) is invalid: go back to page 1.
        if (result.items.length === 0 && page > result.meta.lastPage) {
          loadAbortRef.current = null; // keep the loading state; the URL change starts the page-1 load
          updateQuery(1, category);
          return;
        }

        let articlesList = result.items;
        const authBearer = getAccessToken();
        if (authBearer) {
          try {
            const bRes = await api.get<{ data: Article[] }>('/v1/bookmarks');
            if (bRes?.data && Array.isArray(bRes.data)) {
              const bIds = new Set(bRes.data.map((b) => b.id));
              articlesList = result.items.map((a) => ({ ...a, is_bookmarked: bIds.has(a.id) }));
            }
          } catch {
            // If bookmarks endpoint is unreachable, fallback to fetched articles
          }
          if (controller.signal.aborted) return;
        }

        setArticles(articlesList);
        setMeta(result.meta);
        setResultsKey({ page, category });
        if (category === 'all') setAllTotal(result.meta.total);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setLoadError(
          err instanceof Error && err.message
            ? err.message
            : 'Unable to load courses from KnowledgeHub API.'
        );
      } finally {
        // Only the current load may clear the loading state (an aborted one was superseded or unmounted).
        if (loadAbortRef.current === controller) {
          loadAbortRef.current = null;
          setLoading(false);
          setWakingUp(false);
        }
      }
    },
    [updateQuery]
  );

  /** Loads the page/category from the URL whenever either changes; aborts the load on change or unmount. */
  useEffect(() => {
    loadPage(currentPage, selectedCategory);
    return () => {
      loadAbortRef.current?.abort();
      loadAbortRef.current = null;
    };
  }, [loadPage, currentPage, selectedCategory]);

  /** Retries the page/category currently in the URL (and the categories if they failed too). */
  const retryLoad = useCallback(() => {
    loadPage(currentPage, selectedCategory);
    if (categoriesError) loadCategories();
  }, [loadPage, loadCategories, currentPage, selectedCategory, categoriesError]);

  /**
   * Moves both the viewport and keyboard focus to the results, so focus is never lost when the
   * clicked Previous/Next button becomes disabled on the first/last page.
   */
  const scrollToList = () => {
    const el = listTopRef.current;
    if (!el) return;
    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  };

  /**
   * Navigates to a page (clamped to the last page of the shown results). Choosing the page that is
   * already requested but failed to load retries it instead of doing nothing.
   */
  const goToPage = (page: number) => {
    const lastPage = meta?.lastPage ?? 1;
    const target = Math.min(Math.max(1, page), lastPage);
    if (target === currentPage) {
      if (resultsStale && !loading) retryLoad();
      return;
    }
    updateQuery(target, selectedCategory);
    scrollToList();
  };

  /** Selects a domain filter (`'all'` clears it); changing the domain always restarts at page 1. */
  const selectCategory = (categoryId: string) => {
    if (categoryId === selectedCategory) return;
    updateQuery(1, categoryId);
  };

  /** Courses of the current page matching the search box (category filter and pagination are server-side). */
  const filteredArticles = articles.filter((article) => {
    const version = article.published_version || article.latest_version;
    const title = version?.title.toLowerCase() || '';
    const content = version?.content.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    return !q || title.includes(q) || content.includes(q);
  });

  /** True when the shown results came from a different page/category than the URL now asks for. */
  const resultsStale =
    resultsKey !== null && (resultsKey.page !== currentPage || resultsKey.category !== selectedCategory);
  /** True when the shown results belong to another domain, so their page count does not apply. */
  const resultsFromOtherCategory = resultsKey !== null && resultsKey.category !== selectedCategory;

  /** Plain-language label for results kept on screen after the requested page/category failed to load. */
  const staleLabel = (() => {
    if (!resultsStale || loading || !resultsKey) return '';
    if (resultsFromOtherCategory) {
      const previousDomain =
        resultsKey.category === 'all'
          ? 'All Domains'
          : categories.find((c) => c.id === resultsKey.category)?.name ?? 'the previous domain';
      return `Still showing courses from ${previousDomain}${resultsKey.page > 1 ? `, page ${resultsKey.page}` : ''}: the selected domain could not be loaded.`;
    }
    return `Still showing page ${resultsKey.page}: page ${currentPage} could not be loaded.`;
  })();

  /** Final result range only (kept while a new page loads, then replaced once it arrives). */
  const summaryText =
    meta && meta.total > 0 && articles.length > 0
      ? `Showing ${meta.from ?? 0}–${meta.to ?? 0} of ${meta.total} ${meta.total === 1 ? 'course' : 'courses'}`
      : '';

  return (
    <div className="container" style={{ paddingTop: '2.5rem' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', maxWidth: 780, margin: '0 auto 3.5rem auto' }}>
        <div style={{ display: 'inline-flex', marginBottom: '1.25rem' }}>
          <span
            className="badge"
            style={{
              backgroundColor: 'var(--color-primary-pale)',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-border)',
              fontSize: '0.78rem',
              fontWeight: 600,
              padding: '0.25rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Official Knowledge Repository
          </span>
        </div>
        <h1
          style={{
            marginBottom: '1rem',
            color: 'var(--color-charcoal)',
            fontSize: 'clamp(2.2rem, 4.5vw, 3.25rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
          }}
        >
          Curated Engineering Courses & Deep Dives
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--color-gray)', marginBottom: '2rem', lineHeight: 1.65 }}>
          High-fidelity, peer-reviewed curricula authored by internal staff engineers and domain specialists.
        </p>

        {/* Search Bar */}
        <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto' }}>
          <input
            type="text"
            placeholder="Search systems, database internals, algorithms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.85rem 1.25rem 0.85rem 2.85rem',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-white)',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-charcoal)',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
              boxShadow: 'var(--shadow-xs)',
            }}
          />
          <svg
            aria-hidden="true"
            focusable="false"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-gray)"
            strokeWidth="2"
            style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      </section>

      {/* Category Pills Navigation */}
      <section
        aria-label="Filter courses by domain"
        style={{
          marginBottom: '2.5rem',
          display: 'flex',
          gap: '0.65rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => selectCategory('all')}
          aria-pressed={selectedCategory === 'all'}
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: 'var(--radius-full)',
            border: '1.5px solid',
            borderColor: selectedCategory === 'all' ? 'var(--color-primary)' : 'var(--color-border)',
            background: selectedCategory === 'all' ? 'var(--color-primary-pale)' : 'var(--color-white)',
            color: selectedCategory === 'all' ? 'var(--color-primary)' : 'var(--color-gray)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all var(--transition-fast)',
            boxShadow: selectedCategory === 'all' ? 'var(--shadow-xs)' : 'none',
          }}
        >
          All Domains{allTotal !== null ? ` (${allTotal})` : ''}
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => selectCategory(cat.id)}
              aria-pressed={isSelected}
              style={{
                padding: '0.55rem 1.15rem',
                borderRadius: 'var(--radius-full)',
                border: '1.5px solid',
                borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                background: isSelected ? 'var(--color-primary-pale)' : 'var(--color-white)',
                color: isSelected ? 'var(--color-primary)' : 'var(--color-gray)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)',
                boxShadow: isSelected ? 'var(--shadow-xs)' : 'none',
              }}
            >
              {cat.name}
            </button>
          );
        })}
      </section>

      {categoriesError && (
        <div
          role="status"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            margin: '-1.5rem 0 2rem 0',
            padding: '0.65rem 1rem',
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--color-gray)',
            fontSize: '0.875rem',
          }}
        >
          <span>
            Course domains could not be loaded{selectedCategory !== 'all' ? ' — your domain filter is still applied' : ''}.
          </span>
          <button
            type="button"
            onClick={() => loadCategories()}
            disabled={categoriesLoading}
            aria-busy={categoriesLoading}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.95rem', fontSize: '0.8rem', fontWeight: 600 }}
          >
            {categoriesLoading ? 'Retrying...' : 'Retry domains'}
          </button>
        </div>
      )}

      {/* Course Grid & State Feedback */}
      <section
        ref={listTopRef}
        tabIndex={-1}
        aria-label="Course results"
        style={{ scrollMarginTop: '6rem', outline: 'none' }}
      >
        <ServerWakingStatus active={wakingUp} />
        {/* Always mounted so screen readers announce each final result range; no transient loading text. */}
        <p
          aria-live="polite"
          style={{
            color: 'var(--color-gray)',
            fontSize: '0.9rem',
            margin: summaryText ? '0 0 0.35rem 0' : 0,
          }}
        >
          {summaryText}
        </p>
        {loading && articles.length === 0 ? (
          wakingUp ? null : (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-gray)' }}>
              Loading curated courses...
            </div>
          )
        ) : loadError && articles.length === 0 ? (
          <LoadErrorBanner message={loadError} onRetry={retryLoad} retrying={loading} />
        ) : (
          <>
            {loadError && (
              <LoadErrorBanner message={loadError} onRetry={retryLoad} retrying={loading} compact />
            )}
            {summaryText && (
              <p
                style={{
                  color: staleLabel ? 'var(--color-primary)' : 'var(--color-gray)',
                  fontWeight: staleLabel ? 600 : 400,
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                  minHeight: '1.2em',
                }}
              >
                {loading ? 'Loading…' : staleLabel}
                {!loading && !staleLabel && searchQuery && meta && meta.lastPage > 1
                  ? 'Search filters the courses on this page only.'
                  : ''}
              </p>
            )}
            {filteredArticles.length > 0 ? (
              <div
                aria-busy={loading}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                  gap: '1.75rem',
                  opacity: loading ? 0.55 : 1,
                  transition: 'opacity var(--transition-fast)',
                }}
              >
                {filteredArticles.map((article) => (
                  <CourseCard key={article.id} article={article} />
                ))}
              </div>
            ) : articles.length === 0 && selectedCategory === 'all' ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  background: 'var(--color-white)',
                  border: '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-charcoal)', fontSize: '1.25rem', fontWeight: 600 }}>
                  No courses published yet
                </h3>
                <p style={{ color: 'var(--color-gray)', maxWidth: 480, margin: '0 auto' }}>
                  Published courses will appear here as soon as contributors release them.
                </p>
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  background: 'var(--color-white)',
                  border: '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-charcoal)', fontSize: '1.25rem', fontWeight: 600 }}>
                  No courses matched your query
                </h3>
                <p style={{ color: 'var(--color-gray)', marginBottom: '1.5rem', maxWidth: 480, margin: '0 auto 1.5rem auto' }}>
                  Try adjusting your search terms or selecting another engineering domain.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    selectCategory('all');
                    setSearchQuery('');
                  }}
                  className="btn btn-secondary"
                >
                  Reset Filters
                </button>
              </div>
            )}
            {/* While loading, follow the requested page; after a failed load, mark the page actually shown.
                Hidden when the shown data belongs to another domain (its page count does not apply). */}
            {meta && resultsKey && !resultsFromOtherCategory && meta.lastPage > 1 && (
              <Pagination
                currentPage={resultsStale && !loading ? resultsKey.page : currentPage}
                lastPage={meta.lastPage}
                onChange={goToPage}
              />
            )}
          </>
        )}
      </section>

      {/* Contributor Action Strip */}
      {(() => {
        const isGuest = !currentUser && !getAccessToken();
        const isContributorOrAdmin =
          currentUser?.roles?.some((r) => r === 'contributor' || r === 'admin') ?? false;

        return (
          <section
            style={{
              marginTop: '4.5rem',
              padding: '2.5rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-primary-faint)',
              border: '1px solid var(--color-primary-pale)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div>
              <span
                className="badge"
                style={{
                  backgroundColor: 'var(--color-primary-pale)',
                  color: 'var(--color-primary)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  marginBottom: '0.75rem',
                  display: 'inline-flex',
                }}
              >
                {isContributorOrAdmin
                  ? 'Active Contributor Workspace'
                  : 'KnowledgeHub Publishing System'}
              </span>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--color-charcoal)', fontWeight: 700 }}>
                {isContributorOrAdmin
                  ? 'Author & Publish Course Curricula'
                  : 'Interested in Authoring Course Material?'}
              </h2>
              <p style={{ color: 'var(--color-gray)', maxWidth: 620, lineHeight: 1.65 }}>
                {isContributorOrAdmin
                  ? 'Create new course modules with immutable version snapshots, structured markdown, and direct publishing workflow.'
                  : isGuest
                  ? 'Are you a domain expert interested in publishing technical curricula? Sign in and request Contributor access via your account profile.'
                  : 'Course authoring access is granted exclusively by Administrators. Update your profile and submit a request to an Administrator.'}
              </p>
            </div>

            {isContributorOrAdmin ? (
              <Link
                href="/courses/create"
                className="btn btn-primary"
                style={{ padding: '0.7rem 1.5rem', fontWeight: 600 }}
              >
                Open Contributor Studio &rarr;
              </Link>
            ) : isGuest ? (
              <Link
                href="/login?redirect=/courses"
                className="btn btn-primary"
                style={{ padding: '0.7rem 1.5rem', fontWeight: 600 }}
              >
                Sign In to Request Access &rarr;
              </Link>
            ) : (
              <Link
                href="/account"
                className="btn btn-secondary"
                style={{ padding: '0.7rem 1.5rem', fontWeight: 600 }}
              >
                Request Access via Account &rarr;
              </Link>
            )}
          </section>
        );
      })()}
    </div>
  );
}

/** One entry of the compact page list: a page number or a gap marker (distinct keys for React). */
type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

/**
 * Compact page list: always the first and last page, a window around the current page,
 * and ellipses for the gaps (e.g. 1 … 4 5 6 … 12). Seven or fewer pages are listed in full.
 */
function getPageItems(current: number, last: number): PageItem[] {
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => i + 1);
  }
  let start = Math.max(2, current - 1);
  let end = Math.min(last - 1, current + 1);
  if (current <= 3) {
    start = 2;
    end = 4;
  } else if (current >= last - 2) {
    start = last - 3;
    end = last - 1;
  }
  // Never hide a single page behind an ellipsis.
  if (start === 3) start = 2;
  if (end === last - 2) end = last - 1;
  const items: PageItem[] = [1];
  if (start > 2) items.push('ellipsis-start');
  for (let page = start; page <= end; page++) items.push(page);
  if (end < last - 1) items.push('ellipsis-end');
  items.push(last);
  return items;
}

/** Accessible Previous / page numbers / Next control styled with UX-01 tokens. */
function Pagination({
  currentPage,
  lastPage,
  onChange,
}: {
  currentPage: number;
  lastPage: number;
  onChange: (page: number) => void;
}) {
  /** Default look of a pagination button (UX-01 tokens). */
  const baseStyle: CSSProperties = {
    minWidth: '2.5rem',
    height: '2.5rem',
    padding: '0 0.85rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-full)',
    border: '1.5px solid var(--color-border)',
    background: 'var(--color-white)',
    color: 'var(--color-charcoal)',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  };
  /** Current page: brand background with inverted text. */
  const activeStyle: CSSProperties = {
    ...baseStyle,
    borderColor: 'var(--color-primary)',
    background: 'var(--color-primary)',
    color: 'var(--color-white)',
    boxShadow: 'var(--shadow-xs)',
  };
  /** Unavailable Previous/Next: muted text on the paper background. */
  const disabledStyle: CSSProperties = {
    ...baseStyle,
    background: 'var(--color-off-white)',
    color: 'var(--color-gray-light)',
    cursor: 'not-allowed',
  };
  const isFirst = currentPage <= 1;
  const isLast = currentPage >= lastPage;

  return (
    <nav aria-label="Pagination" style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center' }}>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}
      >
        <li>
          <button
            type="button"
            onClick={() => onChange(currentPage - 1)}
            disabled={isFirst}
            aria-label="Previous page"
            style={isFirst ? disabledStyle : baseStyle}
          >
            &larr; Previous
          </button>
        </li>
        {getPageItems(currentPage, lastPage).map((item) =>
          typeof item === 'number' ? (
            <li key={item}>
              <button
                type="button"
                onClick={() => onChange(item)}
                aria-label={`Page ${item}`}
                aria-current={item === currentPage ? 'page' : undefined}
                style={item === currentPage ? activeStyle : baseStyle}
              >
                {item}
              </button>
            </li>
          ) : (
            <li key={item} aria-hidden="true" style={{ color: 'var(--color-gray)', padding: '0 0.25rem' }}>
              &hellip;
            </li>
          )
        )}
        <li>
          <button
            type="button"
            onClick={() => onChange(currentPage + 1)}
            disabled={isLast}
            aria-label="Next page"
            style={isLast ? disabledStyle : baseStyle}
          >
            Next &rarr;
          </button>
        </li>
      </ul>
    </nav>
  );
}

/**
 * Error state for a failed course list load, styled with UX-01 brand tokens.
 * `compact` renders a slim inline notice above existing (stale) results instead of a full card.
 */
function LoadErrorBanner({
  message,
  onRetry,
  retrying,
  compact = false,
}: {
  message: string;
  onRetry: () => void;
  retrying: boolean;
  compact?: boolean;
}) {
  /** Retry action shared by the compact and full layouts. */
  const retryButton = (
    <button
      type="button"
      onClick={() => onRetry()}
      disabled={retrying}
      aria-busy={retrying}
      className="btn btn-primary"
      style={{
        padding: compact ? '0.45rem 1.1rem' : '0.7rem 1.75rem',
        fontWeight: 600,
        fontSize: compact ? '0.85rem' : '0.95rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexShrink: 0,
      }}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
      {retrying ? 'Retrying...' : 'Retry'}
    </button>
  );

  if (compact) {
    return (
      <div
        role="alert"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          background: 'var(--color-primary-faint)',
          border: '1px solid var(--color-primary-pale)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--color-charcoal)',
          fontSize: '0.95rem',
        }}
      >
        <span>
          <strong style={{ color: 'var(--color-primary)' }}>Could not refresh courses.</strong> {message}
          <span style={{ display: 'block', color: 'var(--color-gray)', marginTop: '0.25rem' }}>
            Please check your connection or try again.
          </span>
        </span>
        {retryButton}
      </div>
    );
  }

  return (
    <div
      role="alert"
      style={{
        textAlign: 'center',
        padding: '3.5rem 2rem',
        background: 'var(--color-white)',
        border: '1.5px solid var(--color-primary-pale)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        maxWidth: 600,
        margin: '0 auto',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          backgroundColor: 'var(--color-primary-faint)',
          color: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto',
        }}
      >
        <svg
          aria-hidden="true"
          focusable="false"
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3
        style={{
          marginBottom: '0.75rem',
          color: 'var(--color-charcoal)',
          fontSize: '1.25rem',
          fontWeight: 700,
        }}
      >
        Unable to Load Courses
      </h3>
      <p
        style={{
          color: 'var(--color-charcoal)',
          marginBottom: '0.5rem',
          lineHeight: 1.6,
          fontSize: '1rem',
        }}
      >
        {message}
      </p>
      <p
        style={{
          color: 'var(--color-gray)',
          marginBottom: '1.75rem',
          lineHeight: 1.6,
          fontSize: '0.95rem',
        }}
      >
        Please check your connection or try again.
      </p>
      {retryButton}
    </div>
  );
}

/**
 * Calm, non-error status shown while GET requests are retried during a backend cold start.
 * The polite live region is always mounted and only its content toggles, so screen readers
 * reliably announce the message when it appears.
 *
 * @param props.active Whether the backend is currently being retried (cold start in progress).
 */
function ServerWakingStatus({ active }: { active: boolean }) {
  if (!active) {
    return <div role="status" aria-live="polite" />;
  }
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        maxWidth: 600,
        margin: '0 auto 1.5rem auto',
        padding: '1rem 1.25rem',
        background: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        color: 'var(--color-charcoal)',
        fontSize: '0.95rem',
        textAlign: 'center',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'var(--color-primary)',
          flexShrink: 0,
        }}
      />
      <span>{SERVER_WAKING_MESSAGE}</span>
    </div>
  );
}
