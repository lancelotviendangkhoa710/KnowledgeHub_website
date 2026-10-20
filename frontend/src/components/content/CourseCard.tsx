'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Article } from '@/types/content';

interface CourseCardProps {
  article: Article;
}

export default function CourseCard({ article }: CourseCardProps) {
  const [bookmarked, setBookmarked] = useState(article.is_bookmarked ?? false);

  const toggleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarked(!bookmarked);

    // Persist bookmark to localStorage for immediate UI persistence
    try {
      const stored = JSON.parse(localStorage.getItem('kh_saved_courses') || '[]');
      if (!bookmarked) {
        if (!stored.includes(article.id)) stored.push(article.id);
      } else {
        const idx = stored.indexOf(article.id);
        if (idx !== -1) stored.splice(idx, 1);
      }
      localStorage.setItem('kh_saved_courses', JSON.stringify(stored));
    } catch {
      // Ignore local storage error
    }
  };

  const version = article.published_version || article.latest_version;
  const title = version?.title || 'Untitled Course Material';
  const excerpt = version?.content
    ? version.content
        .replace(/^[#>-].*$/gm, '')
        .replace(/[`*]/g, '')
        .trim()
        .slice(0, 140) + '...'
    : 'In-depth peer-reviewed course material.';

  return (
    <article className="course-card">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {article.category && (
              <span className="badge badge-gold">
                {article.category.name}
              </span>
            )}
            {article.status === 'draft' ? (
              <span className="badge badge-status-draft">Draft</span>
            ) : (
              <span className="badge badge-status-published">Verified</span>
            )}
          </div>

          <button
            onClick={toggleBookmark}
            aria-label={bookmarked ? 'Remove from saved library' : 'Save course'}
            style={{
              background: bookmarked ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid',
              borderColor: bookmarked ? 'var(--accent-gold)' : 'var(--border-subtle)',
              color: bookmarked ? 'var(--accent-gold)' : 'var(--text-muted)',
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        </div>

        <Link href={`/courses/${article.slug || article.id}`}>
          <h3 style={{ marginBottom: '0.75rem', color: 'var(--text-primary)', transition: 'color var(--transition-fast)' }}>
            {title}
          </h3>
        </Link>

        <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          {excerpt}
        </p>
      </div>

      <div>
        {article.tags && article.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
            {article.tags.map((tag) => (
              <span
                key={tag.id}
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {article.author?.name ? article.author.name[0] : 'C'}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              {article.author?.name || 'Contributor'}
            </span>
          </div>

          <Link
            href={`/courses/${article.slug || article.id}`}
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            Study Course &rarr;
          </Link>
        </div>
      </div>
    </article>
  );
}
