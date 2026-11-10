'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Article } from '@/types/content';
import { fetchMyArticles, publishArticle, archiveArticle } from '@/lib/contentClient';
import { getCurrentUser, setCurrentUser as setGlobalCurrentUser, subscribeCurrentUser, AuthUser } from '@/lib/auth';
import { getAccessToken } from '@/lib/authToken';
import { accountClient } from '@/lib/accountClient';

type StatusFilter = 'all' | 'published' | 'draft' | 'archived';

interface MetricCounts {
  total: number;
  published: number;
  drafts: number;
  archived: number;
}

interface MetricCardProps {
  title: string;
  count: number | string;
  subtitle: string;
  active: boolean;
  color: string;
  activeBorderColor: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  onClick: () => void;
}

/**
 * Interactive KPI metric card supporting keyboard navigation and filter toggling.
 */
function MetricCard({
  title,
  count,
  subtitle,
  active,
  color,
  activeBorderColor,
  iconBg,
  iconColor,
  icon,
  onClick,
}: MetricCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`Filter by ${title}: ${count}`}
      style={{
        backgroundColor: 'var(--color-white)',
        border: active ? `2px solid ${activeBorderColor}` : '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '1.35rem 1.5rem',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: 'var(--shadow-xs)',
        textAlign: 'left',
        width: '100%',
        display: 'block',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </span>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: iconBg,
            color: iconColor,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </span>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1.1 }}>
        {count}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-gray)', marginTop: '0.35rem' }}>
        {subtitle}
      </div>
    </button>
  );
}

/**
 * Visual badge indicating course lifecycle status (published, draft, or archived).
 */
function StatusBadge({ status }: { status: 'draft' | 'published' | 'archived' }) {
  if (status === 'published') {
    return (
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
    );
  }

  if (status === 'draft') {
    return (
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
    );
  }

  return (
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
  );
}

interface CourseTableRowProps {
  article: Article;
  isLast: boolean;
  isPublishing: boolean;
  isArchiving: boolean;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
  formatDate: (date?: string | null) => string;
  getVersionLabel: (article: Article) => string;
}

/**
 * Individual row within the course management table displaying metadata and inline actions.
 */
function CourseTableRow({
  article,
  isLast,
  isPublishing,
  isArchiving,
  onPublish,
  onArchive,
  formatDate,
  getVersionLabel,
}: CourseTableRowProps) {
  const title =
    article.published_version?.title ||
    article.latest_version?.title ||
    article.slug;
  const versionTag = getVersionLabel(article);
  const isDraft = article.status === 'draft';
  const isPublished = article.status === 'published';

  return (
    <tr
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--color-border-light, #F0E8E8)',
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
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span>{versionTag}</span>
        </span>
      </td>

      {/* Status Tag */}
      <td style={{ padding: '1.1rem 1rem' }}>
        <StatusBadge status={article.status} />
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

      {/* Actions */}
      <td style={{ padding: '1.1rem 1.25rem', textAlign: 'right' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'flex-end' }}>
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>View</span>
          </Link>

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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>New Version</span>
          </Link>

          {isDraft && (
            <button
              type="button"
              onClick={() => onPublish(article.id)}
              disabled={isPublishing}
              title="Publish this draft course"
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#15803D',
                backgroundColor: '#DCFCE7',
                border: '1px solid #86EFAC',
                borderRadius: 'var(--radius-md, 6px)',
                cursor: isPublishing ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{isPublishing ? 'Publishing...' : 'Publish'}</span>
            </button>
          )}

          {isPublished && (
            <button
              type="button"
              onClick={() => onArchive(article.id)}
              disabled={isArchiving}
              title="Archive this course"
              style={{
                padding: '0.35rem 0.55rem',
                fontSize: '0.8rem',
                fontWeight: 500,
                color: 'var(--color-gray)',
                backgroundColor: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md, 6px)',
                cursor: isArchiving ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <span>{isArchiving ? '...' : 'Archive'}</span>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * Top header component with eyebrow, page title, subtitle, and primary call to action.
 */
function CourseManagementHeader() {
  return (
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
  );
}

interface CourseFilterBarProps {
  activeTab: StatusFilter;
  onSelectTab: (tab: StatusFilter) => void;
  metrics: MetricCounts;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onClearSearch: () => void;
}

/**
 * Filter bar presenting status tabs and a real-time search input.
 */
function CourseFilterBar({
  activeTab,
  onSelectTab,
  metrics,
  searchQuery,
  onSearchChange,
  onClearSearch,
}: CourseFilterBarProps) {
  const tabs = [
    { id: 'all' as StatusFilter, label: 'All Courses', count: metrics.total },
    { id: 'published' as StatusFilter, label: 'Published', count: metrics.published },
    { id: 'draft' as StatusFilter, label: 'Drafts', count: metrics.drafts },
    { id: 'archived' as StatusFilter, label: 'Archived', count: metrics.archived },
  ];

  return (
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
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search courses by title or slug..."
          aria-label="Search courses by title or slug"
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
            onClick={onClearSearch}
            aria-label="Clear course search"
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
  );
}

interface CourseEmptyStateProps {
  isTotalZero: boolean;
  activeTab: StatusFilter;
  searchQuery: string;
  onResetFilters: () => void;
}

/**
 * Empty state card rendered when no courses exist or when filters produce zero matches.
 */
function CourseEmptyState({
  isTotalZero,
  activeTab,
  searchQuery,
  onResetFilters,
}: CourseEmptyStateProps) {
  return (
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
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      </div>
      {isTotalZero ? (
        <>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-charcoal)', marginBottom: '0.5rem' }}>
            No courses authored yet
          </h3>
          <p style={{ color: 'var(--color-gray)', fontSize: '0.95rem', maxWidth: 440, margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
            You haven&apos;t created any courses yet. Author your first technical curriculum to share domain knowledge across the platform.
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
            No courses found matching tab “{activeTab}”{searchQuery ? ` and search “${searchQuery}”` : ''}.
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="btn btn-secondary"
            style={{ padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}
          >
            Reset Filters
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Access restricted card shown to standard users lacking contributor or administrator privileges.
 */
function CourseRestrictedAccessCard() {
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

/**
 * Main workbench dashboard allowing contributors and admins to view, filter, and manage courses.
 */
export default function ContributorCourseManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser);
  const [authChecked, setAuthChecked] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    isCancelledRef.current = false;
    return () => {
      isCancelledRef.current = true;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastNotice(msg);
    toastTimerRef.current = setTimeout(() => {
      if (!isCancelledRef.current) setToastNotice(null);
    }, 4000);
  }, []);

  const showError = useCallback((msg: string) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setActionError(msg);
    errorTimerRef.current = setTimeout(() => {
      if (!isCancelledRef.current) setActionError(null);
    }, 5000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const unsub = subscribeCurrentUser(() => {
      if (!cancelled) {
        setUser(getCurrentUser());
      }
    });

    const authBearer = getAccessToken();
    const currentUser = getCurrentUser();

    if (!authBearer && !currentUser) {
      router.push('/login?redirect=/courses/manage');
      return () => {
        cancelled = true;
        unsub();
      };
    }

    if (!currentUser && authBearer) {
      accountClient
        .me()
        .then((res) => {
          if (cancelled) return;
          setGlobalCurrentUser(res.data.user);
          setUser(res.data.user);
          setAuthChecked(true);
        })
        .catch(() => {
          if (cancelled) return;
          router.push('/login?redirect=/courses/manage');
        });
    } else {
      setUser(currentUser);
      setAuthChecked(true);
    }

    return () => {
      cancelled = true;
      unsub();
    };
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchMyArticles();
      if (!isCancelledRef.current) {
        setArticles(data || []);
      }
    } catch (err: unknown) {
      if (!isCancelledRef.current) {
        const e = err as { message?: string };
        setLoadError(e.message || 'Unable to retrieve your courses. Please check your network and retry.');
        setArticles([]);
      }
    } finally {
      if (!isCancelledRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!authChecked || !user) return;

    const isContributorOrAdmin =
      user.roles?.includes('contributor') || user.roles?.includes('admin');

    if (!isContributorOrAdmin) {
      setLoading(false);
      return;
    }

    loadData();
  }, [authChecked, user, loadData]);

  const metrics = useMemo<MetricCounts>(() => {
    const total = articles.length;
    const published = articles.filter((a) => a.status === 'published').length;
    const drafts = articles.filter((a) => a.status === 'draft').length;
    const archived = articles.filter((a) => a.status === 'archived').length;
    return { total, published, drafts, archived };
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      if (activeTab !== 'all' && article.status !== activeTab) {
        return false;
      }

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

  const formatDate = useCallback((dateStr?: string | null) => {
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
  }, []);

  const getVersionLabel = useCallback((article: Article): string => {
    const v = article.published_version || article.latest_version;
    if (v?.version_no) {
      return `v${v.version_no}.0`;
    }
    const vers = (article as { versions?: { version_no: number }[] }).versions;
    if (vers && vers.length > 0) {
      return `v${vers[0].version_no}.0`;
    }
    return 'v1.0';
  }, []);

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
      showToast('Course successfully published to the KnowledgeHub platform!');
    } catch (err: unknown) {
      const e = err as { message?: string };
      showError(e.message || 'Failed to publish course. Please try again.');
    } finally {
      setPublishingId(null);
    }
  };

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
      showToast('Course has been archived.');
    } catch (err: unknown) {
      const e = err as { message?: string };
      showError(e.message || 'Failed to archive course.');
    } finally {
      setArchivingId(null);
    }
  };

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

  if (!isContributorOrAdmin) {
    return <CourseRestrictedAccessCard />;
  }

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem', maxWidth: 1180, margin: '0 auto' }}>
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
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
            aria-label="Dismiss error notification"
            style={{ background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          style={{
            marginBottom: '1.5rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #F87171',
            color: '#B91C1C',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md, 8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ fontSize: '0.92rem' }}>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.84rem' }}
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* 1. Header & Navigation */}
      <CourseManagementHeader />

      {/* 2. KPI Metrics Overview (4 Metric Cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem',
        }}
      >
        <MetricCard
          title="Total Courses"
          count={loading ? '—' : metrics.total}
          subtitle="Authored curricula & drafts"
          active={activeTab === 'all'}
          color="var(--color-charcoal)"
          activeBorderColor="var(--color-primary)"
          iconBg="var(--color-primary-pale, #F3E5E5)"
          iconColor="var(--color-primary)"
          onClick={() => setActiveTab('all')}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          }
        />

        <MetricCard
          title="Published Curricula"
          count={loading ? '—' : metrics.published}
          subtitle="Live for readers platform-wide"
          active={activeTab === 'published'}
          color="#15803D"
          activeBorderColor="#15803D"
          iconBg="#DCFCE7"
          iconColor="#15803D"
          onClick={() => setActiveTab('published')}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />

        <MetricCard
          title="Drafts in Progress"
          count={loading ? '—' : metrics.drafts}
          subtitle="Unpublished version snapshots"
          active={activeTab === 'draft'}
          color="#8B0000"
          activeBorderColor="#D97706"
          iconBg="#FEF3C7"
          iconColor="#D97706"
          onClick={() => setActiveTab('draft')}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          }
        />

        <MetricCard
          title="Archived Modules"
          count={loading ? '—' : metrics.archived}
          subtitle="Retired / deprecated curricula"
          active={activeTab === 'archived'}
          color="#706B6B"
          activeBorderColor="#706B6B"
          iconBg="#F3F4F6"
          iconColor="#706B6B"
          onClick={() => setActiveTab('archived')}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          }
        />
      </div>

      {/* 3. Status Filter Tabs & Real-Time Search Bar */}
      <CourseFilterBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        metrics={metrics}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
      />

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
        <CourseEmptyState
          isTotalZero={articles.length === 0}
          activeTab={activeTab}
          searchQuery={searchQuery}
          onResetFilters={() => {
            setActiveTab('all');
            setSearchQuery('');
          }}
        />
      ) : (
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
                {filteredArticles.map((article, idx) => (
                  <CourseTableRow
                    key={article.id}
                    article={article}
                    isLast={idx === filteredArticles.length - 1}
                    isPublishing={publishingId === article.id}
                    isArchiving={archivingId === article.id}
                    onPublish={handlePublish}
                    onArchive={handleArchive}
                    formatDate={formatDate}
                    getVersionLabel={getVersionLabel}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
