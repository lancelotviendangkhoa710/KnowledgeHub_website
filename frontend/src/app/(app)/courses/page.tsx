'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CourseCard from '@/components/content/CourseCard';
import { Article, Category } from '@/types/content';
import { fetchArticles, fetchCategories } from '@/lib/contentClient';

export default function CoursesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [arts, cats] = await Promise.all([fetchArticles(), fetchCategories()]);
      setArticles(arts);
      setCategories(cats);
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredArticles = articles.filter((article) => {
    const matchesCategory =
      selectedCategory === 'all' || article.category_id === selectedCategory;
    const version = article.published_version || article.latest_version;
    const title = version?.title.toLowerCase() || '';
    const content = version?.content.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || title.includes(q) || content.includes(q);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="container" style={{ paddingTop: '2.5rem' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', maxWidth: 780, margin: '0 auto 3rem auto' }}>
        <div style={{ display: 'inline-flex', marginBottom: '1rem' }}>
          <span className="badge badge-gold">
            Official Knowledge Repository
          </span>
        </div>
        <h1 style={{ marginBottom: '1.25rem' }}>
          Curated Engineering Courses & Deep Dives
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          High-fidelity, peer-reviewed curricula authored by internal staff engineers and domain specialists.
        </p>

        {/* Search Bar */}
        <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto' }}>
          <input
            type="text"
            placeholder="Search systems, database internals, algorithms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.85rem 1.25rem 0.85rem 2.85rem',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              outline: 'none',
              transition: 'all var(--transition-fast)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          />
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="2"
            style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      </section>

      {/* Category Pills Navigation */}
      <section style={{ marginBottom: '2.5rem', display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setSelectedCategory('all')}
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid',
            borderColor: selectedCategory === 'all' ? 'var(--accent-gold)' : 'var(--border-subtle)',
            background: selectedCategory === 'all' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface)',
            color: selectedCategory === 'all' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all var(--transition-fast)',
          }}
        >
          All Domains ({articles.length})
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              padding: '0.55rem 1.15rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid',
              borderColor: selectedCategory === cat.id ? 'var(--accent-gold)' : 'var(--border-subtle)',
              background: selectedCategory === cat.id ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface)',
              color: selectedCategory === cat.id ? 'var(--accent-gold)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all var(--transition-fast)',
            }}
          >
            {cat.name}
          </button>
        ))}
      </section>

      {/* Course Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          Loading curated courses...
        </div>
      ) : filteredArticles.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.75rem',
          }}
        >
          {filteredArticles.map((article) => (
            <CourseCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>No courses matched your query</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Try adjusting your search terms or selecting another engineering domain.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="btn btn-secondary"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Contributor Action Strip */}
      <section
        style={{
          marginTop: '4.5rem',
          padding: '2.5rem',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(22, 28, 46, 0.9), rgba(16, 21, 34, 0.95))',
          border: '1px solid var(--border-medium)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div>
          <span className="badge badge-cyan" style={{ marginBottom: '0.75rem' }}>
            Internal Publishing System
          </span>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Are you an internal contributor?</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 600 }}>
            Author new engineering curricula with immutable version snapshots, automated diagram generation, and instant publication rights.
          </p>
        </div>

        <Link href="/courses/create" className="btn btn-primary">
          Open Contributor Studio &rarr;
        </Link>
      </section>
    </div>
  );
}
