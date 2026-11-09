'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Article } from '@/types/content';
import { fetchMyArticles, publishArticle, archiveArticle } from '@/lib/contentClient';
import { getCurrentUser, setCurrentUser as setGlobalCurrentUser, subscribeCurrentUser, AuthUser } from '@/lib/auth';
import { getAccessToken } from '@/lib/authToken';
import { accountClient } from '@/lib/accountClient';

type StatusFilter = 'all' | 'published' | 'draft' | 'archived';

export default function ContributorCourseManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser);
  const [authChecked, setAuthChecked] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Subscribe to auth updates and verify active session
  useEffect(() => {
    const unsub = subscribeCurrentUser(() => setUser(getCurrentUser()));
    const authBearer = getAccessToken();
    const currentUser = getCurrentUser();

    if (!authBearer && !currentUser) {
      router.push('/login?redirect=/courses/manage');
      return;
    }

    if (!currentUser && authBearer) {
      accountClient
        .me()
        .then((res) => {
          setGlobalCurrentUser(res.data.user);
          setUser(res.data.user);
          setAuthChecked(true);
        })
        .catch(() => {
          router.push('/login?redirect=/courses/manage');
        });
    } else {
      setUser(currentUser);
      setAuthChecked(true);
    }

    return unsub;
  }, [router]);

  // Load author articles once authenticated
  useEffect(() => {
    if (!authChecked || !user) return;

    const isContributorOrAdmin =
      user.roles?.includes('contributor') || user.roles?.includes('admin');

    if (!isContributorOrAdmin) return;

    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const data = await fetchMyArticles();
        if (isMounted) {
          setArticles(data || []);
        }
      } catch {
        if (isMounted) {
          setArticles([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [authChecked, user]);

  // KPI Overview Metrics
  const metrics = useMemo(() => {
    const total = articles.length;
    const published = articles.filter((a) => a.status === 'published').length;
    const drafts = articles.filter((a) => a.status === 'draft').length;
    const archived = articles.filter((a) => a.status === 'archived').length;
    return { total, published, drafts, archived };
  }, [articles]);

  // Filtered & Searched Course List
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      // Status filter
      if (activeTab !== 'all' && article.status !== activeTab) {
        return false;
      }

      // Search query filter (matches title, slug, category, or tags)
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.trim().toLowerCase();
        const titleMatch = (
          article.published_version?.title ||
          article.latest_version?.title ||
          article.slug ||
          ''
        )
          .toLowerCase()
          .includes(query);
        const slugMatch = (article.slug || '').toLowerCase().includes(query);
        const catMatch = (article.category?.name || '').toLowerCase().includes(query);
        const tagMatch = article.tags?.some((t) => t.name.toLowerCase().includes(query)) ?? false;

        return titleMatch || slugMatch || catMatch || tagMatch;
      }

      return true;
    });
  }, [articles, activeTab, searchQuery]);

  // Helper to format date
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to extract version label
  const getVersionLabel = (article: Article): string => {
    const v = article.published_version || article.latest_version;
    if (v?.version_no) {
      return `v${v.version_no}.0`;
    }
    const vers = (article as { versions?: { version_no: number }[] }).versions;
    if (vers && vers.length > 0) {
      return `v${vers[0].version_no}.0`;
    }
    return 'v1.0';
  };

  // Inline Publish Handler
  const handlePublish = async (courseId: string) => {
    setPublishingId(courseId);
    setActionError(null);
    try {
      const updated = await publishArticle(courseId);
      setArticles((prev) =>
        prev.map((a) =>
          a.id === courseId
            ? {
                ...a,
                status: 'published',
                published_at: updated.published_at || new Date().toISOString(),
                published_version: updated.published_version || a.published_version || a.latest_version,
              }
            : a
        )
      );
      setToastNotice('Course successfully published to the KnowledgeHub platform!');
      setTimeout(() => setToastNotice(null), 4000);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setActionError(e.message || 'Failed to publish course. Please try again.');
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setPublishingId(null);
    }
  };

  // Inline Archive Handler
  const handleArchive = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to archive this course? It will be removed from public listings.')) {
      return;
    }

    setArchivingId(courseId);
    setActionError(null);
    try {
      await archiveArticle(courseId);
      setArticles((prev) =>
        prev.map((a) => (a.id === courseId ? { ...a, status: 'archived' } : a))
      );
      setToastNotice('Course has been archived.');
      setTimeout(() => setToastNotice(null), 4000);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setActionError(e.message || 'Failed to archive course.');
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setArchivingId(null);
    }
  };

  // Loading skeleton state while verifying session
  if (!authChecked) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--color-gray)' }}>
        <div style={{ display: 'inline-block', width: 32, height: 32, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1rem', fontSize: '0.95rem' }}>Verifying contributor workbench access...</p>
      </div>
    );
  }

  const isContributorOrAdmin =
    user?.roles?.includes('contributor') || user?.roles?.includes('admin');

  // RBAC Access Restricted Card for non-contributors / regular learners
  if (!isContributorOrAdmin) {
    return (
      <div className="container" style={{ paddingTop: '5rem', paddingBottom: '5rem', maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <div
          style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '3.5rem 2.5rem',
            boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-charcoal)', marginBottom: '0.85rem', letterSpacing: '-0.02em' }}>
            Contributor Privileges Required
          </h2>
          <p style={{ color: 'var(--color-gray)', lineHeight: 1.7, marginBottom: '2.25rem', fontSize: '1.025rem' }}>
            Your account currently has the standard user role. The Contributor Workbench is reserved for verified domain experts and curriculum authors. You can request contributor access through your account settings.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/courses" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>
              Explore Courses
            </Link>
            <Link href="/account" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>
              Apply on Account Page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem', maxWidth: 1180, margin: '0 auto' }}>
      {/* Toast and Alert Messages */}
      {toastNotice && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            backgroundColor: '#065F46',
            color: '#FFFFFF',
            padding: '0.85rem 1.35rem',
            borderRadius: 'var(--radius-md, 8px)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.92rem',
            fontWeight: 500,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastNotice}</span>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          style={{
            marginBottom: '1.5rem',
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            style={{ background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Header & Navigation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.25rem',
          marginBottom: '2.25rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-primary)',
              marginBottom: '0.35rem',
            }}
          >
            <span>CONTRIBUTOR WORKBENCH</span>
          </div>
          <h1
            style={{
              fontSize: '2.15rem',
              fontWeight: 800,
              color: 'var(--color-charcoal)',
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
              margin: '0 0 0.45rem 0',
            }}
          >
            My Curricula & Courses
          </h1>
          <p
            style={{
              color: 'var(--color-gray)',
              fontSize: '1rem',
              lineHeight: 1.5,
              margin: 0,
              maxWidth: 620,
            }}
          >
            Manage drafts, monitor published version snapshots, and author technical curricula.
          </p>
        </div>

        <Link
          href="/courses/create"
          className="btn btn-primary"
          style={{
            padding: '0.75rem 1.45rem',
            fontSize: '0.925rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>+ Author New Course</span>
        </Link>
      </div>

      {/* 2. KPI Metrics Overview (4 Metric Cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem',
        }}
      >
        {/* Total Courses Card */}
        <div
          onClick={() => setActiveTab('all')}
          style={{
            backgroundColor: 'var(--color-white)',
            border: activeTab === 'all' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '1.35rem 1.5rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Courses
            </span>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary-pale, #F3E5E5)',
                color: 'var(--color-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-charcoal)', lineHeight: 1.1 }}>
            {loading ? '—' : metrics.total}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-gray)', marginTop: '0.35rem' }}>
            Authored curricula & drafts
          </div>
        </div>

        {/* Published Curricula Card */}
        <div
          onClick={() => setActiveTab('published')}
          style={{
            backgroundColor: 'var(--color-white)',
            border: activeTab === 'published' ? '2px solid #15803D' : '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '1.35rem 1.5rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Published Curricula
            </span>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#15803D', lineHeight: 1.1 }}>
            {loading ? '—' : metrics.published}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-gray)', marginTop: '0.35rem' }}>
            Live for learners platform-wide
          </div>
        </div>

        {/* Drafts in Progress Card */}
        <div
          onClick={() => setActiveTab('draft')}
          style={{
            backgroundColor: 'var(--color-white)',
            border: activeTab === 'draft' ? '2px solid #D97706' : '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '1.35rem 1.5rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Drafts in Progress
            </span>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: '#FEF3C7',
                color: '#D97706',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8B0000', lineHeight: 1.1 }}>
            {loading ? '—' : metrics.drafts}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-gray)', marginTop: '0.35rem' }}>
            Unpublished version snapshots
          </div>
        </div>

        {/* Archived Modules Card */}
        <div
          onClick={() => setActiveTab('archived')}
          style={{
            backgroundColor: 'var(--color-white)',
            border: activeTab === 'archived' ? '2px solid #706B6B' : '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '1.35rem 1.5rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#706B6B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Archived Modules
            </span>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: '#F3F4F6',
                color: '#706B6B',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#706B6B', lineHeight: 1.1 }}>
            {loading ? '—' : metrics.archived}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-gray)', marginTop: '0.35rem' }}>
            Retired / deprecated curricula
          </div>
        </div>
      </div>

      {/* 3. Status Filter Tabs & Real-Time Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--color-white)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--color-border)',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Courses', count: metrics.total },
            { id: 'published', label: 'Published', count: metrics.published },
            { id: 'draft', label: 'Drafts', count: metrics.drafts },
            { id: 'archived', label: 'Archived', count: metrics.archived },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as StatusFilter)}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: 'var(--radius-md, 6px)',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 700 : 500,
                  backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--color-gray)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '10px',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#F3F4F6',
                    color: isActive ? '#FFFFFF' : 'var(--color-charcoal)',
                    fontWeight: 600,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: 260, flex: '1 1 260px', maxWidth: 380 }}>
          <span
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-gray-light)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses by title or slug..."
            style={{
              width: '100%',
              padding: '0.5rem 2rem 0.5rem 2.4rem',
              fontSize: '0.88rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md, 6px)',
              backgroundColor: 'var(--color-off-white)',
              color: 'var(--color-charcoal)',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--color-gray)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                padding: '0.2rem',
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4. Courses Management Table / Cards */}
      {loading ? (
        <div
          style={{
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--color-border)',
            padding: '3rem',
            textAlign: 'center',
            color: 'var(--color-gray)',
          }}
        >
          <div style={{ display: 'inline-block', width: 28, height: 28, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '0.85rem', fontSize: '0.92rem' }}>Loading course inventory...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        /* Empty State */
        <div
          style={{
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--color-border)',
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary-pale, #F3E5E5)',
              color: 'var(--color-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          {articles.length === 0 ? (
            <>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-charcoal)', marginBottom: '0.5rem' }}>
                No courses authored yet
              </h3>
              <p style={{ color: 'var(--color-gray)', fontSize: '0.95rem', maxWidth: 440, margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
                You haven&apos;t created any courses yet. Author your first technical curriculum to share domain knowledge with learners.
              </p>
              <Link href="/courses/create" className="btn btn-primary" style={{ padding: '0.65rem 1.4rem', fontWeight: 600 }}>
                + Author First Course
              </Link>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-charcoal)', marginBottom: '0.5rem' }}>
                No courses match your filter
              </h3>
              <p style={{ color: 'var(--color-gray)', fontSize: '0.95rem', maxWidth: 420, margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
                No courses found matching tab &ldquo;{activeTab}&rdquo;
                {searchQuery ? ` and search &ldquo;${searchQuery}&rdquo;` : ''}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setSearchQuery('');
                }}
                className="btn btn-secondary"
                style={{ padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}
              >
                Reset Filters
              </button>
            </>
          )}
        </div>
      ) : (
        /* Course Table */
        <div
          style={{
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 780 }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--color-off-white)',
                    borderBottom: '1px solid var(--color-border)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--color-gray)',
                  }}
                >
                  <th style={{ padding: '0.9rem 1.25rem' }}>Course & Slug</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Category & Tags</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Snapshot</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Last Updated</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredArticles.map((article, idx) => {
                  const title =
                    article.published_version?.title ||
                    article.latest_version?.title ||
                    article.slug;
                  const versionTag = getVersionLabel(article);
                  const isDraft = article.status === 'draft';
                  const isPublished = article.status === 'published';
                  const isArchived = article.status === 'archived';
                  const isThisPublishing = publishingId === article.id;
                  const isThisArchiving = archivingId === article.id;

                  return (
                    <tr
                      key={article.id}
                      style={{
                        borderBottom: idx === filteredArticles.length - 1 ? 'none' : '1px solid var(--color-border-light, #F0E8E8)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Course Title & Slug */}
                      <td style={{ padding: '1.1rem 1.25rem', maxWidth: 300 }}>
                        <Link
                          href={isPublished ? `/courses/${article.slug}` : `/courses/create?parent_id=${article.id}`}
                          style={{
                            fontWeight: 700,
                            color: 'var(--color-charcoal)',
                            fontSize: '0.96rem',
                            lineHeight: 1.35,
                            display: 'block',
                            marginBottom: '0.2rem',
                            textDecoration: 'none',
                          }}
                        >
                          {title}
                        </Link>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--color-gray)',
                            fontFamily: 'var(--font-mono, monospace)',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          /{article.slug}
                        </span>
                      </td>

                      {/* Category & Tags */}
                      <td style={{ padding: '1.1rem 1rem' }}>
                        {article.category ? (
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: 'var(--color-primary)',
                              backgroundColor: 'var(--color-primary-faint, #FBF0F0)',
                              border: '1px solid var(--color-border)',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              marginBottom: '0.35rem',
                            }}
                          >
                            {article.category.name}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-gray-light)' }}>General</span>
                        )}
                        {article.tags && article.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                            {article.tags.slice(0, 2).map((t) => (
                              <span
                                key={t.id}
                                style={{
                                  fontSize: '0.72rem',
                                  color: 'var(--color-gray)',
                                  backgroundColor: '#F3F4F6',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '3px',
                                }}
                              >
                                #{t.name}
                              </span>
                            ))}
                            {article.tags.length > 2 && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-gray-light)' }}>
                                +{article.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Version Snapshot */}
                      <td style={{ padding: '1.1rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            fontFamily: 'var(--font-mono, monospace)',
                            color: 'var(--color-charcoal)',
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            padding: '0.18rem 0.5rem',
                            borderRadius: '4px',
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="16 18 22 12 16 6" />
                            <polyline points="8 6 2 12 8 18" />
                          </svg>
                          <span>{versionTag}</span>
                        </span>
                      </td>

                      {/* Status Tag */}
                      <td style={{ padding: '1.1rem 1rem' }}>
                        {isPublished && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              border: '1px solid #86EFAC',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '12px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#15803D' }} />
                            Published
                          </span>
                        )}
                        {isDraft && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              backgroundColor: '#FEF3C7',
                              color: '#8B0000',
                              border: '1px solid #FDE68A',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '12px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#D97706' }} />
                            Draft
                          </span>
                        )}
                        {isArchived && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              backgroundColor: '#F3F4F6',
                              color: '#706B6B',
                              border: '1px solid #E5E7EB',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '12px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#9CA3AF' }} />
                            Archived
                          </span>
                        )}
                      </td>

                      {/* Last Updated Timestamp */}
                      <td style={{ padding: '1.1rem 1rem', fontSize: '0.84rem', color: 'var(--color-gray)' }}>
                        <div>{formatDate(article.updated_at || article.created_at)}</div>
                        {article.published_at && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--color-gray-light)', marginTop: '0.15rem' }}>
                            Pub: {formatDate(article.published_at)}
                          </div>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: '1.1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'flex-end' }}>
                          {/* View link */}
                          <Link
                            href={`/courses/${article.slug}`}
                            title="View course reader"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: 'var(--color-charcoal)',
                              backgroundColor: 'transparent',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-md, 6px)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span>View</span>
                          </Link>

                          {/* New Version / Edit link */}
                          <Link
                            href={`/courses/create?parent_id=${article.id}`}
                            title="Author new version snapshot"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: 'var(--color-primary)',
                              backgroundColor: 'var(--color-primary-faint, #FBF0F0)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-md, 6px)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            <span>New Version</span>
                          </Link>

                          {/* Publish Inline Action */}
                          {isDraft && (
                            <button
                              type="button"
                              onClick={() => handlePublish(article.id)}
                              disabled={isThisPublishing}
                              title="Publish this draft course"
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: '#15803D',
                                backgroundColor: '#DCFCE7',
                                border: '1px solid #86EFAC',
                                borderRadius: 'var(--radius-md, 6px)',
                                cursor: isThisPublishing ? 'wait' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>{isThisPublishing ? 'Publishing...' : 'Publish'}</span>
                            </button>
                          )}

                          {/* Archive Inline Action */}
                          {isPublished && (
                            <button
                              type="button"
                              onClick={() => handleArchive(article.id)}
                              disabled={isThisArchiving}
                              title="Archive this course"
                              style={{
                                padding: '0.35rem 0.55rem',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                color: 'var(--color-gray)',
                                backgroundColor: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md, 6px)',
                                cursor: isThisArchiving ? 'wait' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              <span>{isThisArchiving ? '...' : 'Archive'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
