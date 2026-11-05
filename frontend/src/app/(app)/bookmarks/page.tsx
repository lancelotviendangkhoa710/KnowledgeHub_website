'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CourseCard from '@/components/content/CourseCard';
import { Article } from '@/types/content';
import { api } from '@/lib/api';
import { getAccessToken } from '@/lib/authToken';

export default function BookmarksPage() {
  const [bookmarkedArticles, setBookmarkedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasAuth, setHasAuth] = useState<boolean>(false);

  useEffect(() => {
    async function loadBookmarks() {
      const authBearer = getAccessToken();
      if (!authBearer) {
        setHasAuth(false);
        setLoading(false);
        return;
      }

      setHasAuth(true);
      setLoading(true);
      try {
        const response = await api.get<{ data: Article[] }>('/v1/bookmarks');
        if (response?.data && Array.isArray(response.data)) {
          setBookmarkedArticles(response.data.map((a) => ({ ...a, is_bookmarked: true })));
        } else {
          setBookmarkedArticles([]);
        }
      } catch {
        setBookmarkedArticles([]);
      } finally {
        setLoading(false);
      }
    }

    loadBookmarks();
  }, []);

  return (
    <div className="container" style={{ paddingTop: '2.5rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
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
          Personal Course Archive
        </span>
        <h1 style={{ marginBottom: '0.5rem', color: 'var(--color-charcoal)', fontSize: '2.25rem', fontWeight: 800 }}>
          My Saved Library
        </h1>
        <p style={{ color: 'var(--color-gray)', fontSize: '1.05rem', lineHeight: 1.6 }}>
          Curated courses and deep-dive materials you have saved for continuous study and reference.
        </p>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-gray)' }}>
          Loading your saved library...
        </div>
      ) : !hasAuth ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4.5rem 2rem',
            background: 'var(--color-white)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xs)',
            maxWidth: 580,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary-pale)',
              color: 'var(--color-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-charcoal)', marginBottom: '0.75rem' }}>
            Sign In Required
          </h2>
          <p style={{ color: 'var(--color-gray)', marginBottom: '2rem', fontSize: '1rem', lineHeight: 1.6 }}>
            Please sign in to view and manage your saved courses in your personal library.
          </p>
          <Link href="/login?redirect=/bookmarks" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontWeight: 600 }}>Sign In Now &rarr;</Link>
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
            background: 'var(--color-white)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="1.5"
            style={{ margin: '0 auto 1rem auto', display: 'block' }}
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-charcoal)', fontSize: '1.25rem', fontWeight: 600 }}>
            Your library is empty
          </h3>
          <p style={{ color: 'var(--color-gray)', marginBottom: '1.5rem', maxWidth: 460, margin: '0 auto 1.5rem auto' }}>
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
