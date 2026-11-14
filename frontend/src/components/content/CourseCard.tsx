'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Article } from '@/types/content';
import { getAccessToken } from '@/lib/authToken';
import { api } from '@/lib/api';
import { hasVideoEmbed, markdownExcerpt } from '@/lib/markdownText';
import styles from './courseCard.module.css';

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
  const hasVideo = hasVideoEmbed(version?.content);
  const href = `/courses/${article.slug || article.id}`;
  const authorName = article.author?.name || 'Contributor';

  return (
    <article className={`course-card ${styles.card}`}>
      <div className={styles.top}>
        <div className={styles.badges}>
          {article.category && <span className={`${styles.badge} ${styles.badgeCategory}`}>{article.category.name}</span>}
          {article.status === 'draft' ? (
            <span className={`${styles.badge} ${styles.badgeDraft}`}>Draft</span>
          ) : (
            <span className={`${styles.badge} ${styles.badgeVerified}`}>Verified</span>
          )}
          {hasVideo && (
            <span className={`${styles.badge} ${styles.badgeVideo}`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
              Video
            </span>
          )}
        </div>

        <div className={styles.bookmarkWrap}>
          <button
            type="button"
            onClick={toggleBookmark}
            disabled={isPending}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? 'Remove from saved library' : 'Save course'}
            title={bookmarked ? 'Remove from saved library' : 'Save to personal library'}
            className={`${styles.bookmark} ${bookmarked ? styles.bookmarkOn : ''}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
          {notice && (
            <div role="status" className={styles.notice}>
              {notice}
            </div>
          )}
        </div>
      </div>

      <h3 className={styles.title}>
        <Link href={href} className={styles.titleLink}>
          {title}
        </Link>
      </h3>

      <p className={styles.excerpt}>{excerpt}</p>

      {article.tags && article.tags.length > 0 && (
        <div className={styles.tags}>
          {article.tags.map((tag) => (
            <span key={tag.id} className={styles.tag}>
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.author}>
          <span className={styles.avatar} aria-hidden="true">
            {authorName[0]}
          </span>
          <span className={styles.authorName}>{authorName}</span>
        </div>
        <Link href={href} className={styles.cta} aria-label={`Study ${title}`}>
          Study Course &rarr;
        </Link>
      </div>
    </article>
  );
}
