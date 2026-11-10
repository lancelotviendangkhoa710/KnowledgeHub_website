'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import CourseCard from '@/components/content/CourseCard';
import { Article, Category } from '@/types/content';
import { fetchArticles, fetchCategories } from '@/lib/contentClient';
import { getCurrentUser, setCurrentUser as setGlobalCurrentUser, subscribeCurrentUser, AuthUser } from '@/lib/auth';
import { getAccessToken } from '@/lib/authToken';
import { accountClient } from '@/lib/accountClient';
import { api } from '@/lib/api';

export default function CoursesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getCurrentUser);

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

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Categories are non-critical here: a failure only hides the filter pills, never the course list.
      const [arts, cats] = await Promise.all([
        fetchArticles(),
        fetchCategories().catch((): Category[] => []),
      ]);
      let articlesList = arts;

      const authBearer = getAccessToken();
      if (authBearer) {
        try {
          const bRes = await api.get<{ data: Article[] }>('/v1/bookmarks');
          if (bRes?.data && Array.isArray(bRes.data)) {
            const bIds = new Set(bRes.data.map((b) => b.id));
            articlesList = arts.map((a) => ({ ...a, is_bookmarked: bIds.has(a.id) }));
          }
        } catch {
          // If bookmarks endpoint is unreachable, fallback to fetched articles
        }
      }

      setArticles(articlesList);
      setCategories(cats);
      // Drop a category filter that no longer exists (e.g. categories failed to load or were removed).
      setSelectedCategory((prev) => (prev === 'all' || cats.some((c) => c.id === prev) ? prev : 'all'));
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to load courses from KnowledgeHub API.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredArticles = articles.filter((article) => {
    const matchesCategory =
      selectedCategory === 'all' || article.category_id === selectedCategory;
    const version = article.published_version || article.latest_version;
    const title = version?.title.toLowerCase() || '';
    const content = version?.content.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || title.includes(q) || content.includes(q);

    return matchesCategory && matchesSearch;
  });

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
      <section style={{ marginBottom: '2.5rem', display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
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
          All Domains ({articles.length})
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
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

      {/* Course Grid & State Feedback */}
      {loading && articles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-gray)' }}>
          Loading curated courses...
        </div>
      ) : loadError && articles.length === 0 ? (
        <LoadErrorBanner message={loadError} onRetry={loadData} retrying={loading} />
      ) : (
        <>
          {loadError && (
            <LoadErrorBanner message={loadError} onRetry={loadData} retrying={loading} compact />
          )}
          {filteredArticles.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: '1.75rem',
              }}
            >
              {filteredArticles.map((article) => (
                <CourseCard key={article.id} article={article} />
              ))}
            </div>
          ) : articles.length === 0 ? (
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
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="btn btn-secondary"
              >
                Reset Filters
              </button>
            </div>
          )}
        </>
      )}

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
