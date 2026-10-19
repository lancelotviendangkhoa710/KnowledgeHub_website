import Link from 'next/link';

export default function CoursesPage() {
  return (
    <div className="content-container home-content">
      <section className="content-section" aria-labelledby="courses-title">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Discover knowledge</p>
            <h1 id="courses-title">Courses and resources</h1>
            <p className="section-description">
              Explore published learning materials. Search and category data will appear when the content API is available.
            </p>
          </div>
          <Link className="text-link" href="/">Back to discover</Link>
        </div>
        <div className="empty-state">
          <h2>Published resources are not connected yet</h2>
          <p>The KnowledgeHub content API is not available in this frontend scaffold. No sample resources are shown as real content.</p>
        </div>
      </section>
    </div>
  );
}
