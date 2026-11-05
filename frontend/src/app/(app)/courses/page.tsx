'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CourseCard from '@/components/content/CourseCard';
import { Article, Category } from '@/types/content';
import { fetchArticles, fetchCategories } from '@/lib/contentClient';
import { getCurrentUser, setCurrentUser as setGlobalCurrentUser, subscribeCurrentUser, AuthUser } from '@/lib/auth';
import { getAccessToken } from '@/lib/authToken';
import { accountClient } from '@/lib/accountClient';

export default function CoursesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getCurrentUser);

  useEffect(() => {
    const unsub = subscribeCurrentUser(() => setCurrentUser(getCurrentUser()));
    const authBearer = getAccessToken();
    if (authBearer && !getCurrentUser()) {
      accountClient
        .me()
        .then((res) => {
          setGlobalCurrentUser(res.data.user);
          setCurrentUser(res.data.user);
        })
        .catch(() => {});
    }
    return unsub;
  }, []);

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
      <section style={{ textAlign: 'center', maxWidth: 780, margin: '0 auto 3.5rem auto' }}>
        <div style={{ display: 'inline-flex', marginBottom: '1.25rem' }}>
          <span
            className="badge"
            style={{
              backgroundColor: 'var(--color-primary-pale)',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-border)',
              fontSize: '0.78rem',
              fontWeight: 600,
              padding: '0.25rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Official Knowledge Repository
          </span>
        </div>
        <h1
          style={{
            marginBottom: '1rem',
            color: 'var(--color-charcoal)',
            fontSize: 'clamp(2.2rem, 4.5vw, 3.25rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
          }}
        >
          Curated Engineering Courses & Deep Dives
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--color-gray)', marginBottom: '2rem', lineHeight: 1.65 }}>
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
              background: 'var(--color-white)',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-charcoal)',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
              boxShadow: 'var(--shadow-xs)',
            }}
          />
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-gray)"
            strokeWidth="2"
            style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      </section>

      {/* Category Pills Navigation */}
      <section style={{ marginBottom: '2.5rem', display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: 'var(--radius-full)',
            border: '1.5px solid',
            borderColor: selectedCategory === 'all' ? 'var(--color-primary)' : 'var(--color-border)',
            background: selectedCategory === 'all' ? 'var(--color-primary-pale)' : 'var(--color-white)',
            color: selectedCategory === 'all' ? 'var(--color-primary)' : 'var(--color-gray)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all var(--transition-fast)',
            boxShadow: selectedCategory === 'all' ? 'var(--shadow-xs)' : 'none',
          }}
        >
          All Domains ({articles.length})
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '0.55rem 1.15rem',
                borderRadius: 'var(--radius-full)',
                border: '1.5px solid',
                borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                background: isSelected ? 'var(--color-primary-pale)' : 'var(--color-white)',
                color: isSelected ? 'var(--color-primary)' : 'var(--color-gray)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)',
                boxShadow: isSelected ? 'var(--shadow-xs)' : 'none',
              }}
            >
              {cat.name}
            </button>
          );
        })}
      </section>

      {/* Course Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-gray)' }}>
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
            background: 'var(--color-white)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-charcoal)', fontSize: '1.25rem', fontWeight: 600 }}>
            No courses matched your query
          </h3>
          <p style={{ color: 'var(--color-gray)', marginBottom: '1.5rem', maxWidth: 480, margin: '0 auto 1.5rem auto' }}>
            Try adjusting your search terms or selecting another engineering domain.
          </p>
          <button
            type="button"
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
      {(() => {
        const isGuest = !currentUser && !getAccessToken();
        const isContributorOrAdmin =
          currentUser?.roles?.some((r) => r === 'contributor' || r === 'admin') ?? false;

        return (
          <section
            style={{
              marginTop: '4.5rem',
              padding: '2.5rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-primary-faint)',
              border: '1px solid var(--color-primary-pale)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div>
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
                {isContributorOrAdmin
                  ? 'Active Contributor Workspace'
                  : 'Ban Chuyên Môn KnowledgeHub'}
              </span>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--color-charcoal)', fontWeight: 700 }}>
                {isContributorOrAdmin
                  ? 'Author & Publish Course Curricula'
                  : 'Tìm hiểu cách trở thành Contributor nội bộ'}
              </h2>
              <p style={{ color: 'var(--color-gray)', maxWidth: 620, lineHeight: 1.65 }}>
                {isContributorOrAdmin
                  ? 'Create new course modules with immutable version snapshots, structured markdown, and direct publishing workflow.'
                  : isGuest
                  ? 'Bạn là chuyên gia kỹ thuật và muốn xuất bản giáo trình? Vui lòng đăng nhập và gửi yêu cầu cấp quyền Contributor qua trang cá nhân.'
                  : 'Quyền tác giả khóa học được cấp duyệt bởi Quản trị viên. Hãy cập nhật hồ sơ cá nhân và gửi yêu cầu cấp quyền Contributor đến Admin.'}
              </p>
            </div>

            {isContributorOrAdmin ? (
              <Link
                href="/courses/create"
                className="btn btn-primary"
                style={{ padding: '0.7rem 1.5rem', fontWeight: 600 }}
              >
                Open Contributor Studio &rarr;
              </Link>
            ) : isGuest ? (
              <Link
                href="/login?redirect=/courses"
                className="btn btn-primary"
                style={{ padding: '0.7rem 1.5rem', fontWeight: 600 }}
              >
                Đăng nhập để gửi yêu cầu &rarr;
              </Link>
            ) : (
              <Link
                href="/account"
                className="btn btn-secondary"
                style={{ padding: '0.7rem 1.5rem', fontWeight: 600 }}
              >
                Gửi yêu cầu qua Trang cá nhân &rarr;
              </Link>
            )}
          </section>
        );
      })()}
    </div>
  );
}
