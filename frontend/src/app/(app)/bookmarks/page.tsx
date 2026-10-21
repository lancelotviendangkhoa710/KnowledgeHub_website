'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CourseCard from '@/components/content/CourseCard';
import { Article } from '@/types/content';
import { fetchArticles } from '@/lib/contentClient';

export default function BookmarksPage() {
  const [bookmarkedArticles, setBookmarkedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadBookmarks() {
      setLoading(true);
      const allArticles = await fetchArticles();
      let savedIds: string[] = [];

      try {
        savedIds = JSON.parse(localStorage.getItem('kh_saved_courses') || '["art-001", "art-003"]');
      } catch {
        savedIds = ['art-001', 'art-003'];
      }

      const filtered = allArticles.filter((a) => savedIds.includes(a.id)).map((a) => ({
        ...a,
        is_bookmarked: true,
      }));

      setBookmarkedArticles(filtered);
      setLoading(false);
    }

    loadBookmarks();
  }, []);

  return (
    <div className="container" style={{ paddingTop: '2.5rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <span className="badge badge-gold" style={{ marginBottom: '0.75rem' }}>
          Personal Course Archive
        </span>
        <h1 style={{ marginBottom: '0.5rem' }}>My Saved Library</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Curated courses and deep-dive materials you have saved for continuous study and reference.
        </p>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          Loading your saved library...
        </div>
      ) : bookmarkedArticles.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.75rem',
          }}
        >
          {bookmarkedArticles.map((article) => (
            <CourseCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '5rem 2rem',
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent-gold)"
            strokeWidth="1.5"
            style={{ margin: '0 auto 1rem auto', display: 'block' }}
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Your library is empty</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: 460, margin: '0 auto 1.5rem auto' }}>
            Browse through our verified engineering curricula and bookmark topics you want to master.
          </p>
          <Link href="/courses" className="btn btn-primary">
            Explore Curricula &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
