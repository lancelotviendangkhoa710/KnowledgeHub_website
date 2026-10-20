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
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--text-muted)' }}>
        Loading course curriculum...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <h2 style={{ marginBottom: '1rem' }}>Course Material Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
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
            <pre key={`code-${idx}`}>
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
        elements.push(<h2 key={idx}>{line.replace('## ', '')}</h2>);
      } else if (line.startsWith('### ')) {
        elements.push(<h3 key={idx}>{line.replace('### ', '')}</h3>);
      } else if (line.startsWith('> ')) {
        elements.push(<blockquote key={idx}>{line.replace('> ', '')}</blockquote>);
      } else if (line.startsWith('* ') || line.startsWith('- ')) {
        elements.push(<li key={idx} style={{ marginLeft: '1.25rem' }}>{line.replace(/^[*\-]\s+/, '')}</li>);
      } else if (line.trim() === '---') {
        elements.push(<hr key={idx} style={{ borderColor: 'var(--border-subtle)', margin: '2rem 0' }} />);
      } else if (line.trim().length > 0) {
        elements.push(<p key={idx}>{line}</p>);
      }
    });

    return elements;
  };

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        <Link href="/courses" style={{ color: 'var(--text-muted)' }}>
          Courses
        </Link>
        <span>/</span>
        {article.category && (
          <>
            <span style={{ color: 'var(--text-secondary)' }}>{article.category.name}</span>
            <span>/</span>
          </>
        )}
        <span style={{ color: 'var(--accent-gold)' }}>Current Course</span>
      </nav>

      {/* Reader Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '3rem', alignItems: 'start' }}>
        {/* Main Content Column */}
        <article style={{ maxWidth: 'var(--max-w-reader)' }}>
          <header style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span className="badge badge-gold">
                Version {version?.version_no || 1}.0
              </span>
              <span className="badge badge-status-published">
                Verified Curriculum
              </span>
            </div>

            <h1 style={{ marginBottom: '1.25rem', lineHeight: 1.2 }}>
              {version?.title}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  {article.author?.name ? article.author.name[0] : 'C'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {article.author?.name || 'Staff Engineer'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Published on {article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Recent'}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
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
              background: 'var(--bg-glass-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
            }}
          >
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Course Information</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Domain: </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{article.category?.name}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Snapshot ID: </span>
                <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  {version?.id}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Peer Review: </span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>Internal Core Approved</span>
              </div>
            </div>
          </div>

          {/* Contributor revision box */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
            }}
          >
            <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>
              Author Actions
            </span>
            <h4 style={{ marginBottom: '0.5rem' }}>Update Curriculum</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
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
