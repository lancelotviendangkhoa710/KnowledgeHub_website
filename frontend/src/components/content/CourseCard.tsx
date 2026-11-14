'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Article } from '@/types/content';
import { getAccessToken } from '@/lib/authToken';
import { api } from '@/lib/api';
import { markdownExcerpt } from '@/lib/markdownText';

interface CourseCardProps {
  article: Article;
}

export default function CourseCard({ article }: CourseCardProps) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(article.is_bookmarked ?? false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const authBearer = getAccessToken();
    if (!authBearer) {
      setNotice('Please sign in to save courses to your library');
      router.push('/login?redirect=/courses');
      return;
    }

    if (isPending) return;
    const nextState = !bookmarked;
    setIsPending(true);
    setBookmarked(nextState);
    setNotice(null);

    try {
      if (nextState) {
        await api.post(`/v1/articles/${article.id}/bookmark`, {});
      } else {
        await api.delete(`/v1/articles/${article.id}/bookmark`);
      }
    } catch {
      setBookmarked(!nextState);
      setNotice('Unable to update bookmark. Please try again.');
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setIsPending(false);
    }
  };

  const version = article.published_version || article.latest_version;
  const title = version?.title || 'Untitled Course Material';
  const excerpt = markdownExcerpt(version?.content) || 'In-depth peer-reviewed course material.';

  return (
    <article
      className="course-card"
      style={{
        backgroundColor: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-xs)',
        transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {article.category && (
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
                {article.category.name}
              </span>
            )}
            {article.status === 'draft' ? (
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
                Draft
              </span>
            ) : (
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
                Verified
              </span>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={toggleBookmark}
              disabled={isPending}
              aria-label={bookmarked ? 'Remove from saved library' : 'Save course'}
              title={bookmarked ? 'Remove from saved library' : 'Save to personal library'}
              style={{
                background: bookmarked ? 'var(--color-primary-pale)' : 'var(--color-white)',
                border: '1px solid',
                borderColor: bookmarked ? 'var(--color-primary)' : 'var(--color-border)',
                color: bookmarked ? 'var(--color-primary)' : 'var(--color-gray)',
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
            {notice && (
              <div
                role="status"
                style={{
                  position: 'absolute',
                  top: '115%',
                  right: 0,
                  backgroundColor: '#0F172A',
                  color: '#F8FAFC',
                  padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 50,
                  border: '1px solid #334155',
                }}
              >
                {notice}
              </div>
            )}
          </div>
        </div>

        <Link href={`/courses/${article.slug || article.id}`}>
          <h3
            style={{
              marginBottom: '0.75rem',
              color: 'var(--color-charcoal)',
              fontSize: '1.2rem',
              fontWeight: 600,
              lineHeight: 1.3,
              transition: 'color var(--transition-fast)',
            }}
          >
            {title}
          </h3>
        </Link>

        <p style={{ fontSize: '0.92rem', color: 'var(--color-gray)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
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
                  color: 'var(--color-gray)',
                  background: 'var(--color-off-white)',
                  padding: '0.2rem 0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-light)',
                  fontWeight: 500,
                }}
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--color-border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--color-primary-pale)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {article.author?.name ? article.author.name[0] : 'C'}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-charcoal)' }}>
              {article.author?.name || 'Contributor'}
            </span>
          </div>

          <Link
            href={`/courses/${article.slug || article.id}`}
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'color var(--transition-fast)',
            }}
          >
            Study Course &rarr;
          </Link>
        </div>
      </div>
    </article>
  );
}
