import Link from 'next/link';

const topics = [
  { name: 'Programming', description: 'Languages, software, and engineering' },
  { name: 'Data & AI', description: 'Data science and artificial intelligence' },
  { name: 'Business', description: 'Strategy, management, and finance' },
  { name: 'Design', description: 'Visual design and user experience' },
  { name: 'Communication', description: 'Writing, presentation, and languages' },
  { name: 'Personal development', description: 'Build skills for work and life' },
];

export default function HomePage() {
  return (
    <div className="page-shell">
      <section className="discovery-hero" aria-labelledby="home-title">
        <div className="content-container discovery-hero__inner">
          <p className="eyebrow">Knowledge worth keeping</p>
          <h1 id="home-title">Find the knowledge you need to move forward.</h1>
          <p className="discovery-hero__description">
            Explore curated learning resources, follow ideas, and build a path that works for you.
          </p>
          <form action="/courses" method="get" className="search-form" role="search">
            <label className="visually-hidden" htmlFor="knowledge-search">Search learning resources</label>
            <input
              id="knowledge-search"
              name="q"
              type="search"
              placeholder="Search topics, articles, and courses"
            />
            <button type="submit">Search</button>
          </form>
          <Link className="text-link" href="/courses">Browse all learning resources</Link>
        </div>
      </section>

      <div className="content-container home-content">
        <section className="content-section" aria-labelledby="topics-title">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Explore by subject</p>
              <h2 id="topics-title">Knowledge topics</h2>
              <p className="section-description">Choose a subject to focus your next discovery.</p>
            </div>
            <Link className="text-link" href="/courses">Browse resources</Link>
          </div>
          <ul className="topic-grid">
            {topics.map((topic) => (
              <li key={topic.name}>
                <Link className="topic-link" href={`/courses?topic=${encodeURIComponent(topic.name)}`}>
                  <span className="topic-link__name">{topic.name}</span>
                  <span className="topic-link__description">{topic.description}</span>
                  <span className="topic-link__arrow" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="content-section resources-section" aria-labelledby="resources-title">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">A place to continue</p>
              <h2 id="resources-title">Learning resources</h2>
              <p className="section-description">
                Browse published materials and narrow your search by subject or resource type.
              </p>
            </div>
            <Link className="text-link" href="/courses">View all resources</Link>
          </div>
          <div className="resource-filters" aria-label="Resource types">
            <span className="filter-label">Resource types</span>
            <span className="filter-chip">Articles</span>
            <span className="filter-chip">Documents</span>
            <span className="filter-chip">Videos</span>
            <span className="filter-chip">External links</span>
          </div>
          <div className="empty-state">
            <h3>Resources will appear here</h3>
            <p>Published learning resources are not connected yet. Visit the courses area to continue.</p>
            <Link className="button button--secondary" href="/courses">Open courses</Link>
          </div>
        </section>

        <section className="learning-tools" aria-label="Learning tools">
          <article className="learning-tool">
            <p className="eyebrow">Plan your learning</p>
            <h2>Learning roadmaps</h2>
            <p>Organize the next steps in your learning journey.</p>
            <span className="feature-status">Roadmaps are not available yet</span>
          </article>
          <article className="learning-tool">
            <p className="eyebrow">Learn with support</p>
            <h2>AI learning companion</h2>
            <p>Get personalized guidance as you explore and learn.</p>
            <span className="feature-status">Coming in a future release</span>
          </article>
        </section>
      </div>
    </div>
  );
}