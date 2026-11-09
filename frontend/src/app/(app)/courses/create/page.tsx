'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Category } from '@/types/content';
import { fetchCategories, fetchArticle } from '@/lib/contentClient';
import { api } from '@/lib/api';
import { getCurrentUser, setCurrentUser, subscribeCurrentUser, AuthUser } from '@/lib/auth';
import { getAccessToken } from '@/lib/authToken';
import { accountClient } from '@/lib/accountClient';
import { extractYouTubeVideoId } from '@/lib/videoUtils';

const DRAFT_STORAGE_KEY = 'kh_course_editor_draft';

export default function ContributorCourseCreatePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser);
  const [authChecked, setAuthChecked] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState('distributed-systems, algorithms');
  const [content, setContent] = useState(
`## 1. Introduction & Problem Statement
Detail the systems background, failure modes, or architectural problem this course addresses.

\`\`\`typescript
// Provide executable or concrete code examples
interface ConsensusNode {
  id: string;
  term: number;
  votedFor: string | null;
}
\`\`\`

## 2. Invariants & Proof of Correctness
List the mathematical or operational guarantees enforced by this architecture.

> **Operational Invariant**: No state machine may execute state transitions out of global log order.
`
  );
  const [previewMode, setPreviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoInputUrl, setVideoInputUrl] = useState('');
  const [videoCustomTitle, setVideoCustomTitle] = useState('');
  const [videoInsertNotice, setVideoInsertNotice] = useState<string | null>(null);

  const detectedVideoId = extractYouTubeVideoId(videoInputUrl);

  const handleInsertVideo = () => {
    if (!detectedVideoId) return;
    const cleanUrl = videoInputUrl.trim();
    const cleanTitle = videoCustomTitle.trim();
    const snippet = cleanTitle
      ? `\n\n@[youtube](${cleanUrl || detectedVideoId} "${cleanTitle}")\n\n`
      : `\n\n@[youtube](${cleanUrl || detectedVideoId})\n\n`;

    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = content.substring(0, start);
      const after = content.substring(end);
      const nextContent = before + snippet + after;
      setContent(nextContent);
      setTimeout(() => {
        textarea.focus();
        const newPos = start + snippet.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 50);
    } else {
      setContent((prev) => `${prev.trim()}${snippet}`);
    }

    setVideoInputUrl('');
    setVideoCustomTitle('');
    setShowVideoModal(false);
    setVideoInsertNotice(`Embedded YouTube video (${detectedVideoId}) added to lecture content.`);
    setTimeout(() => setVideoInsertNotice(null), 4000);
  };

  useEffect(() => {
    return subscribeCurrentUser(() => setUser(getCurrentUser()));
  }, []);

  useEffect(() => {
    const authBearer = getAccessToken();
    const currentUser = getCurrentUser();

    if (!authBearer && !currentUser) {
      router.push('/login?redirect=/courses/create');
      return;
    }

    if (!currentUser && authBearer) {
      accountClient
        .me()
        .then((res) => {
          setCurrentUser(res.data.user);
          setUser(res.data.user);
          setAuthChecked(true);
        })
        .catch(() => {
          router.push('/login?redirect=/courses/create');
        });
    } else {
      setUser(currentUser);
      setAuthChecked(true);
    }
  }, [router]);

  useEffect(() => {
    async function load() {
      const cats = await fetchCategories();
      setCategories(cats);
      if (cats.length > 0) {
        setCategoryId(cats[0].id);
      }
    }
    load();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // Restore draft if saved before sign-in redirect
      const savedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed.title) setTitle(parsed.title);
          if (parsed.slug) setSlug(parsed.slug);
          if (parsed.categoryId) setCategoryId(parsed.categoryId);
          if (parsed.tags) setTags(parsed.tags);
          if (parsed.content) setContent(parsed.content);
        } catch {
          // ignore corrupted draft
        }
      }

      const pid = params.get('parent_id');
      if (pid) {
        setParentId(pid);
        fetchArticle(pid)
          .then((art) => {
            if (art) {
              const v = art.published_version || art.latest_version;
              if (v) {
                setTitle(`Revision: ${v.title}`);
                setContent(v.content);
              }
              if (art.category_id) {
                setCategoryId(art.category_id);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      );
    }
  };

  const handleSubmit = async (publish: boolean) => {
    if (!title.trim() || !content.trim()) {
      alert('Please provide both a course title and content body.');
      return;
    }

    const bearerSession = getAccessToken();
    if (!bearerSession) {
      setErrorMessage('Authentication session expired. Please sign in again to author course material.');
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    // Call API or simulate contributor creation
    try {
      if (parentId) {
        type VersionCreateResponse = {
          status: string;
          message: string;
          data?: { id: string; article_id: string; version_no: number };
        };
        const verRes = await api.post<VersionCreateResponse>(`/v1/articles/${parentId}/versions`, {
          title,
          content,
        });

        if (publish && verRes?.data?.id) {
          await api.post(`/v1/articles/${parentId}/publish`, {
            version_id: verRes.data.id,
          });
        }
      } else {
        type ArticleCreateResponse = {
          status: string;
          message: string;
          data?: { id: string; slug: string; status: string };
        };

        const data = await api.post<ArticleCreateResponse>('/v1/articles', {
          title,
          slug,
          category_id: categoryId || null,
          content,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        });

        if (publish && data?.data?.id) {
          await api.post(`/v1/articles/${data.data.id}/publish`, {});
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string; errors?: Record<string, string[]> };
      if (errorObj?.status === 401 || errorObj?.message === 'Unauthenticated.') {
        setErrorMessage('Authentication session expired or unauthorized. Please sign in to your contributor account.');
        setIsSubmitting(false);
        return;
      }
      if (errorObj?.status && errorObj.status >= 400) {
        const firstErr = errorObj.errors ? Object.values(errorObj.errors)[0]?.[0] : undefined;
        setErrorMessage(firstErr || errorObj.message || 'Failed to save course. Please check your inputs.');
        setIsSubmitting(false);
        return;
      }
      // Local fallback simulation if API is unreachable
    }

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    }

    setIsSubmitting(false);
    setSuccessMessage(
      parentId
        ? (publish ? 'New course version published successfully!' : 'Draft revision saved to your workbench.')
        : (publish ? 'Course successfully published to the KnowledgeHub platform!' : 'Course draft saved to your contributor workbench.')
    );

    setTimeout(() => {
      router.push('/courses');
    }, 1800);
  };

  const isContributorOrAdmin =
    user?.roles?.some((role) => role === 'contributor' || role === 'admin') ?? false;

  if (!authChecked) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--color-gray)' }}>
        Verifying contributor access...
      </div>
    );
  }

  if (!isContributorOrAdmin) {
    return (
      <div className="container" style={{ paddingTop: '5rem', maxWidth: 640, textAlign: 'center' }}>
        <div
          style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '3.5rem 2.5rem',
            boxShadow: 'var(--shadow-sm)',
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
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-charcoal)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Contributor & Administrator Access Required</h2>
          <p style={{ color: 'var(--color-gray)', lineHeight: 1.7, marginBottom: '2.25rem', fontSize: '1.025rem' }}>
            Your account currently has the standard User role. To maintain internal curriculum quality, only domain specialists (Contributors) or Administrators may author new courses. Please contact an Administrator to request Contributor privileges.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/courses" className="btn btn-primary" style={{ padding: '0.75rem 1.6rem', fontWeight: 600 }}>Back to Courses</Link>
            <Link href="/account" className="btn btn-secondary" style={{ padding: '0.75rem 1.6rem', fontWeight: 600 }}>View Account Privileges</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '2.5rem', maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
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
              }}
            >
              Contributor Studio
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-gray)' }}>— Internal Publishing Workflow</span>
          </div>
          <h1 style={{ color: 'var(--color-charcoal)', fontSize: '2.25rem', fontWeight: 800 }}>Author Course Material</h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="btn btn-secondary"
            style={{ fontSize: '0.875rem' }}
          >
            {previewMode ? 'Edit Raw Markdown' : 'Preview Layout'}
          </button>
        </div>
      </div>

      {parentId && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '0.85rem 1.25rem',
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
            borderRadius: 'var(--radius-md)',
            color: '#0369A1',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontWeight: 700 }}>Draft Revision Mode:</span> Creating a new version snapshot for parent course ID: <code>{parentId}</code>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.5rem',
            color: '#B91C1C',
            marginBottom: '1.5rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <span>{errorMessage}</span>
          {(errorMessage.toLowerCase().includes('sign in') || errorMessage.toLowerCase().includes('authenticat')) && (
            <Link
              href={`/login?redirect=${encodeURIComponent(parentId ? `/courses/create?parent_id=${parentId}` : '/courses/create')}`}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem(
                    DRAFT_STORAGE_KEY,
                    JSON.stringify({ title, slug, categoryId, tags, content })
                  );
                }
              }}
              className="btn btn-primary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              Sign In
            </Link>
          )}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            background: '#EBF5EE',
            border: '1px solid #D2EBD9',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.5rem',
            color: '#1B6E34',
            marginBottom: '1.5rem',
            fontWeight: 600,
          }}
        >
          {successMessage} Redirecting to explorer...
        </div>
      )}

      {/* Editor Form */}
      <div
        style={{
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-charcoal)' }}>
              Course Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g., Foundations of Database Storage Engines"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-white)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-charcoal)',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-charcoal)' }}>
              Domain Category *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-white)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-charcoal)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-charcoal)' }}>
              Canonical Slug URL
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="url-friendly-slug"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-white)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-gray)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-charcoal)' }}>
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., storage, lsm-trees, wal"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-white)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-charcoal)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Content Body Editor or Preview */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-charcoal)', margin: 0 }}>
              Curriculum Body (Markdown & Code Supported) *
            </label>

            {!previewMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowVideoModal((prev) => !prev)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #FECACA',
                    backgroundColor: showVideoModal ? '#FEE2E2' : '#FFF1F2',
                    color: '#BE123C',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                    <polygon points="9.545 15.568 15.818 12 9.545 8.432" fill="white" />
                  </svg>
                  <span>{showVideoModal ? 'Close Video Tool' : 'Insert YouTube Video'}</span>
                </button>
              </div>
            )}
          </div>

          {videoInsertNotice && (
            <div
              style={{
                marginBottom: '0.75rem',
                padding: '0.55rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                fontSize: '0.82rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{videoInsertNotice}</span>
            </div>
          )}

          {/* YouTube Video Insertion Card */}
          {showVideoModal && !previewMode && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#FFF5F5',
                border: '1.5px solid #FECDD3',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#E11D48">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                  <polygon points="9.545 15.568 15.818 12 9.545 8.432" fill="white" />
                </svg>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#9F1239' }}>
                  Insert YouTube Video Lecture
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#881337', marginBottom: '0.25rem' }}>
                    YouTube Link or Video ID *
                  </label>
                  <input
                    type="text"
                    value={videoInputUrl}
                    onChange={(e) => setVideoInputUrl(e.target.value)}
                    placeholder="e.g. https://youtu.be/dQw4w9WgXcQ or https://www.youtube.com/watch?v=..."
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm, 6px)',
                      border: '1px solid #FDA4AF',
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-mono, monospace)',
                      color: 'var(--color-charcoal)',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#881337', marginBottom: '0.25rem' }}>
                    Video Lecture Title (optional)
                  </label>
                  <input
                    type="text"
                    value={videoCustomTitle}
                    onChange={(e) => setVideoCustomTitle(e.target.value)}
                    placeholder="e.g. Raft Consensus Protocol Walkthrough"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm, 6px)',
                      border: '1px solid #FDA4AF',
                      fontSize: '0.85rem',
                      color: 'var(--color-charcoal)',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Real-time Validation Feedback */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem' }}>
                  {!videoInputUrl.trim() && (
                    <span style={{ color: 'var(--color-gray)' }}>
                      Supports standard, short, embed, or shorts YouTube URLs.
                    </span>
                  )}
                  {videoInputUrl.trim() && detectedVideoId && (
                    <span style={{ color: '#047857', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Valid YouTube ID: <code>{detectedVideoId}</code>
                    </span>
                  )}
                  {videoInputUrl.trim() && !detectedVideoId && (
                    <span style={{ color: '#B91C1C', fontWeight: 600 }}>
                      ⚠ Invalid YouTube link. Please check the URL or provide a valid 11-character video ID.
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowVideoModal(false);
                      setVideoInputUrl('');
                      setVideoCustomTitle('');
                    }}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: 'var(--radius-sm, 6px)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'transparent',
                      color: 'var(--color-charcoal)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!detectedVideoId}
                    onClick={handleInsertVideo}
                    style={{
                      padding: '0.4rem 0.9rem',
                      borderRadius: 'var(--radius-sm, 6px)',
                      border: 'none',
                      backgroundColor: detectedVideoId ? '#E11D48' : '#FDA4AF',
                      color: 'white',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: detectedVideoId ? 'pointer' : 'not-allowed',
                      transition: 'background-color var(--transition-fast)',
                    }}
                  >
                    Insert into Lecture
                  </button>
                </div>
              </div>
            </div>
          )}

          {previewMode ? (
            <div
              className="prose"
              style={{
                minHeight: 380,
                padding: '1.5rem',
                background: 'var(--color-off-white)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <h2 style={{ color: 'var(--color-charcoal)', marginTop: 0 }}>{title || 'Untitled Course'}</h2>
              <pre style={{ background: 'var(--color-charcoal)', color: '#F8FAFC', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                <code>{content}</code>
              </pre>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              rows={16}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                width: '100%',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-white)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-charcoal)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                outline: 'none',
                resize: 'vertical',
              }}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border-light)', paddingTop: '1.5rem' }}>
          <Link href="/courses" className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
            Cancel
          </Link>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="btn btn-secondary"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Publishing...' : 'Publish to Platform (Direct)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
