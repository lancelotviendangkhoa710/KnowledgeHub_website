import Link from 'next/link';
import { fetchArticles } from '@/lib/contentClient';
import CourseCard from '@/components/content/CourseCard';

export default async function HomePage() {
  const articles = await fetchArticles();
  const featured = articles.slice(0, 3);

  return (
    <div>
      {/* Hero Section */}
      <section style={{ padding: '5rem 0 4rem 0', position: 'relative', overflow: 'hidden' }}>
        <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', marginBottom: '1.25rem' }}>
            <span className="badge badge-gold">
              Curated Internal Knowledge Platform
            </span>
          </div>

          <h1 style={{ maxWidth: 860, margin: '0 auto 1.5rem auto', fontSize: 'clamp(2.4rem, 5vw, 4rem)', letterSpacing: '-0.03em' }}>
            Engineering Rigor. Curated Pedagogy. <br />
            <span style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Zero Social Noise.
            </span>
          </h1>

          <p style={{ maxWidth: 660, margin: '0 auto 2.5rem auto', fontSize: '1.2rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            KnowledgeHub is a closed-loop learning platform operated by internal domain specialists. Peer-crafted curricula with immutable version snapshots and dedicated AI Companion guidance.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/courses" className="btn btn-primary" style={{ padding: '0.85rem 1.85rem', fontSize: '1.05rem' }}>
              Explore Curricula &rarr;
            </Link>
            <Link href="/courses/create" className="btn btn-secondary" style={{ padding: '0.85rem 1.85rem', fontSize: '1.05rem' }}>
              Contributor Studio
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div
            style={{
              marginTop: '4rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
              maxWidth: 900,
              marginLeft: 'auto',
              marginRight: 'auto',
              padding: '1.75rem',
              background: 'var(--bg-glass-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-gold)' }}>100%</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Internal Staff Verified</div>
            </div>
            <div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>v1 &rarr; vN</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Immutable Versioning</div>
            </div>
            <div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>Zero</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>UGC or Social Distractions</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses Grid */}
      <section style={{ padding: '3rem 0 5rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
            <div>
              <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>
                Core Curricula
              </span>
              <h2>Featured Engineering Deep Dives</h2>
            </div>
            <Link href="/courses" style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: '0.95rem' }}>
              View All Courses &rarr;
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '1.75rem',
            }}
          >
            {featured.map((article) => (
              <CourseCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section style={{ padding: '4rem 0 6rem 0', background: 'rgba(16, 21, 34, 0.5)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 3.5rem auto' }}>
            <span className="badge badge-cyan" style={{ marginBottom: '0.75rem' }}>
              Architectural Pillars
            </span>
            <h2>Built for Technical Mastery</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              How KnowledgeHub differs fundamentally from general social learning platforms.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-gold)' }}>🛡️</div>
              <h3 style={{ marginBottom: '0.75rem' }}>Curated Internal Operations</h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                No unvetted user-generated posts. Only designated contributors and admins produce, refine, and maintain course content.
              </p>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-cyan)' }}>📜</div>
              <h3 style={{ marginBottom: '0.75rem' }}>Immutable Version Snapshots</h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                Every edit generates a distinct revision snapshot. Educational citations, code examples, and bookmarks never rot.
              </p>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-emerald)' }}>🤖</div>
              <h3 style={{ marginBottom: '0.75rem' }}>AI Learning Companion</h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                Context-aware AI partner grounded in verified curricula, offering Socratic questioning, progress tracking, and personalized roadmaps.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}