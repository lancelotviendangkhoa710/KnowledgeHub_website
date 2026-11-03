'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Article } from '@/types/content';
import { fetchArticle } from '@/lib/contentClient';

export default function CourseDetailPage() {
  const params = useParams();
  const idOrSlug = params?.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    async function loadCourse() {
      if (!idOrSlug) return;
      setLoading(true);
      const data = await fetchArticle(idOrSlug);
      setArticle(data);
      setBookmarked(data?.is_bookmarked ?? false);
      setLoading(false);
    }
    loadCourse();
  }, [idOrSlug]);

  const toggleBookmark = () => {
    setBookmarked(!bookmarked);
    try {
      const stored = JSON.parse(localStorage.getItem('kh_saved_courses') || '[]');
      if (!bookmarked) {
        if (!stored.includes(article?.id)) stored.push(article?.id);
      } else {
        const idx = stored.indexOf(article?.id);
        if (idx !== -1) stored.splice(idx, 1);
      }
      localStorage.setItem('kh_saved_courses', JSON.stringify(stored));
    } catch {
      // Ignore
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--color-gray)' }}>
        Loading course curriculum...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--color-charcoal)' }}>Course Material Not Found</h2>
        <p style={{ color: 'var(--color-gray)', marginBottom: '2rem' }}>
          The requested course material does not exist or has been archived.
        </p>
        <Link href="/courses" className="btn btn-primary">
          Back to Courses
        </Link>
      </div>
    );
  }

  const version = article.published_version || article.latest_version;
  const content = version?.content || 'No content recorded for this version.';

  // Simple parser to render markdown headings, code blocks, and blockquotes cleanly
  const renderFormattedContent = (raw: string) => {
    const lines = raw.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];

    lines.forEach((line, idx) => {
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBuffer = [];
        } else {
          inCodeBlock = false;
          elements.push(
            <pre key={`code-${idx}`} style={{ background: 'var(--color-charcoal)', color: '#F8FAFC', padding: '1.25rem', borderRadius: 'var(--radius-md)', margin: '1.5rem 0', overflowX: 'auto', border: '1px solid var(--color-border)' }}>
              <code>{codeBuffer.join('\n')}</code>
            </pre>
          );
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      if (line.startsWith('## ')) {
        elements.push(<h2 key={idx} style={{ color: 'var(--color-charcoal)', marginTop: '2.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', fontSize: '1.75rem', fontWeight: 700 }}>{line.replace('## ', '')}</h2>);
      } else if (line.startsWith('### ')) {
        elements.push(<h3 key={idx} style={{ color: 'var(--color-charcoal)', marginTop: '1.75rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>{line.replace('### ', '')}</h3>);
      } else if (line.startsWith('> ')) {
        elements.push(<blockquote key={idx} style={{ borderLeft: '3px solid var(--color-primary)', background: 'var(--color-primary-faint)', padding: '1rem 1.5rem', borderRadius: '0 var(--radius-md) var(--radius-md) 0', margin: '1.5rem 0', color: 'var(--color-charcoal)', fontStyle: 'italic' }}>{line.replace('> ', '')}</blockquote>);
      } else if (line.startsWith('* ') || line.startsWith('- ')) {
        elements.push(<li key={idx} style={{ marginLeft: '1.25rem', color: 'var(--color-charcoal)', marginBottom: '0.5rem' }}>{line.replace(/^[*\-]\s+/, '')}</li>);
      } else if (line.trim() === '---') {
        elements.push(<hr key={idx} style={{ borderColor: 'var(--color-border)', margin: '2rem 0' }} />);
      } else if (line.trim().length > 0) {
        elements.push(<p key={idx} style={{ color: 'var(--color-charcoal)', marginBottom: '1.25rem', lineHeight: 1.8, fontSize: '1.05rem' }}>{line}</p>);
      }
    });

    return elements;
  };

  return (
    <div className="container" style={{ paddingTop: '2.5rem' }}>
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-gray)', marginBottom: '1.75rem' }}>
        <Link href="/courses" style={{ color: 'var(--color-gray)', transition: 'color var(--transition-fast)' }}>
          Courses
        </Link>
        <span style={{ color: 'var(--color-gray-light)' }}>/</span>
        {article.category && (
          <>
            <span style={{ color: 'var(--color-charcoal)', fontWeight: 500 }}>{article.category.name}</span>
            <span style={{ color: 'var(--color-gray-light)' }}>/</span>
          </>
        )}
        <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Current Course</span>
      </nav>

      {/* Reader Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '3rem', alignItems: 'start' }}>
        {/* Main Content Column */}
        <article style={{ maxWidth: 'var(--max-w-reader)', background: 'var(--color-white)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xs)' }}>
          <header style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
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
                Version {version?.version_no || 1}.0
              </span>
              <span
                className="badge"
                style={{
                  backgroundColor: '#EBF5EE',
                  color: '#1B6E34',
                  border: '1px solid #D2EBD9',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                Verified Curriculum
              </span>
            </div>

            <h1 style={{ marginBottom: '1.25rem', lineHeight: 1.2, color: 'var(--color-charcoal)', fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 800 }}>
              {version?.title}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', color: 'var(--color-gray)', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--color-primary-pale)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}
                >
                  {article.author?.name ? article.author.name[0] : 'C'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>
                    {article.author?.name || 'Staff Engineer'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-gray)' }}>
                    Published on {article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Recent'}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={toggleBookmark}
                  className="btn btn-secondary"
                  style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                  </svg>
                  {bookmarked ? 'Bookmarked' : 'Bookmark'}
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="btn btn-outline"
                  style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem' }}
                >
                  {copied ? 'Copied URL!' : 'Share'}
                </button>
              </div>
            </div>
          </header>

          {/* Prose Content */}
          <div className="prose">
            {renderFormattedContent(content)}
          </div>
        </article>

        {/* Sidebar Info & Controls */}
        <aside style={{ position: 'sticky', top: 'calc(var(--header-height) + 1.5rem)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <h4 style={{ marginBottom: '1rem', color: 'var(--color-charcoal)', fontWeight: 600, fontSize: '1.1rem' }}>
              Course Information
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: 'var(--color-gray)' }}>Domain: </span>
                <span style={{ color: 'var(--color-charcoal)', fontWeight: 600 }}>{article.category?.name || 'General'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-gray)' }}>Snapshot ID: </span>
                <span style={{ color: 'var(--color-charcoal)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  {version?.id || 'Draft (No Snapshot)'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--color-gray)' }}>Peer Review: </span>
                <span style={{ color: '#1B6E34', fontWeight: 600 }}>Internal Core Approved</span>
              </div>
            </div>
          </div>

          {/* Contributor revision box */}
          <div
            style={{
              background: 'var(--color-primary-faint)',
              border: '1px solid var(--color-primary-pale)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <span
              className="badge"
              style={{
                backgroundColor: 'var(--color-primary-pale)',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-border)',
                marginBottom: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.2rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
              }}
            >
              Author Actions
            </span>
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-charcoal)', fontWeight: 600 }}>
              Update Curriculum
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-gray)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Need to add sections or fix technical details? Create an immutable Version {(version?.version_no || 1) + 1}.
            </p>
            <Link
              href={`/courses/create?parent_id=${article.id}&slug=${article.slug}`}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              Draft Revision &rarr;
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
