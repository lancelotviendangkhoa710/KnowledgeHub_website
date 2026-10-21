import Link from 'next/link';

function BrandMark() {
  return (
    <span className="nav-logo__mark" aria-hidden="true">
      <span className="logo-node logo-node--a" />
      <span className="logo-node logo-node--b" />
      <span className="logo-node logo-node--c" />
    </span>
  );
}

function Logo() {
  return (
    <Link href="/" className="nav-logo" aria-label="KnowledgeHub home">
      <BrandMark />
      <span className="nav-logo__wordmark">Knowledge<strong>Hub</strong></span>
    </Link>
  );
}

export default function HomePage() {
  return (
    <>
      <header className="nav-header" role="banner">
        <div className="container nav-inner">
          <Logo />
          <nav className="nav-links" aria-label="Primary navigation">
            <Link href="/" className="nav-link">Home</Link>
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#about" className="nav-link">About</a>
          </nav>
          <div className="nav-actions">
            <Link href="/login" className="nav-link nav-link--signin">Sign In</Link>
            <Link href="/courses" className="btn btn--primary btn--sm">Explore Courses</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-heading">
          <div className="container hero-inner">
            <div className="hero-copy">
              <div className="hero-badge">
                <span className="hero-badge__dot" aria-hidden="true" />
                Curated Learning, Personalized
              </div>
              <h1 className="hero-heading" id="hero-heading">
                Discover, Learn,<br />
                and <em className="hero-heading__accent">Master</em><br />
                What Matters Most
              </h1>
              <p className="hero-description">
                KnowledgeHub brings curated courses, structured learning paths, and an AI companion that adapts to your goals — so every learning step moves you closer to mastery.
              </p>
              <div className="hero-actions">
                <Link href="/courses" className="btn btn--primary">Explore Courses</Link>
                <a href="#features" className="btn btn--ghost">Discover Features</a>
              </div>
            </div>

            <div className="hero-illustration" aria-hidden="true">
              <div className="kg-canvas">
                <svg className="kg-lines" viewBox="0 0 360 360" xmlns="http://www.w3.org/2000/svg">
                  <line x1="180" y1="180" x2="180" y2="78" className="kg-line" />
                  <line x1="180" y1="180" x2="292" y2="152" className="kg-line" />
                  <line x1="180" y1="180" x2="264" y2="264" className="kg-line" />
                  <line x1="180" y1="180" x2="96" y2="264" className="kg-line" />
                  <line x1="180" y1="180" x2="68" y2="152" className="kg-line" />
                  <line x1="180" y1="78" x2="292" y2="152" className="kg-line kg-line--secondary" />
                  <line x1="292" y1="152" x2="264" y2="264" className="kg-line kg-line--secondary" />
                  <line x1="96" y1="264" x2="68" y2="152" className="kg-line kg-line--secondary" />
                </svg>
                <div className="kg-node kg-node--hub"><span className="kg-node__label">Hub</span></div>
                <div className="kg-node kg-node--sat kg-node--top"><span className="kg-node__label">Courses</span></div>
                <div className="kg-node kg-node--sat kg-node--right"><span className="kg-node__label">AI</span></div>
                <div className="kg-node kg-node--sat kg-node--bottom-right"><span className="kg-node__label">Paths</span></div>
                <div className="kg-node kg-node--sat kg-node--bottom-left"><span className="kg-node__label">Topics</span></div>
                <div className="kg-node kg-node--sat kg-node--left"><span className="kg-node__label">Tags</span></div>
                <div className="kg-card kg-card--a"><span className="kg-card__dot" /><span>3 new courses</span></div>
                <div className="kg-card kg-card--b"><span className="kg-card__dot kg-card__dot--green" /><span>Path 42% done</span></div>
              </div>
            </div>
          </div>
          <div className="hero-bg" aria-hidden="true">
            <div className="hero-bg__circle hero-bg__circle--a" />
            <div className="hero-bg__circle hero-bg__circle--b" />
          </div>
        </section>

        <section className="features" id="features" aria-labelledby="features-heading">
          <div className="container">
            <div className="section-header">
              <p className="section-eyebrow">What you get</p>
              <h2 className="section-heading" id="features-heading">Everything a serious learner needs</h2>
              <p className="section-subheading">Four connected capabilities designed to turn learning goals into lasting knowledge.</p>
            </div>
            <div className="features-grid">
              <article className="feature-card">
                <div className="feature-icon feature-icon--hub" aria-hidden="true"><div className="fi-hub__ring" /><div className="fi-hub__dot" /><div className="fi-hub__spoke fi-hub__spoke--a" /><div className="fi-hub__spoke fi-hub__spoke--b" /><div className="fi-hub__spoke fi-hub__spoke--c" /></div>
                <h3 className="feature-card__title">Knowledge Hub</h3>
                <p className="feature-card__desc">Explore curated courses and learning materials in a structured, searchable knowledge base. Every resource is easy to find when you need it.</p>
              </article>
              <article className="feature-card">
                <div className="feature-icon feature-icon--collab" aria-hidden="true"><div className="fi-collab__circle fi-collab__circle--a" /><div className="fi-collab__circle fi-collab__circle--b" /><div className="fi-collab__overlap" /></div>
                <h3 className="feature-card__title">Curated Learning</h3>
                <p className="feature-card__desc">Discover structured courses created by KnowledgeHub&apos;s internal content team, with learning materials organized for progress.</p>
              </article>
              <article className="feature-card feature-card--accent">
                <div className="feature-icon feature-icon--ai" aria-hidden="true"><div className="fi-ai__outer" /><div className="fi-ai__inner" /><div className="fi-ai__pulse" /></div>
                <h3 className="feature-card__title">AI Learning Companion</h3>
                <p className="feature-card__desc">A conversational AI that remembers your goals, preferences, and progress — offering guidance tailored specifically to your journey.</p>
              </article>
              <article className="feature-card">
                <div className="feature-icon feature-icon--path" aria-hidden="true"><div className="fi-path__step fi-path__step--a" /><div className="fi-path__line fi-path__line--a" /><div className="fi-path__step fi-path__step--b" /><div className="fi-path__line fi-path__line--b" /><div className="fi-path__step fi-path__step--c" /></div>
                <h3 className="feature-card__title">Learning Paths</h3>
                <p className="feature-card__desc">Build structured, step-by-step roadmaps with prerequisite awareness. Follow a clear progression from concept to mastery.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="how-it-works" id="how-it-works" aria-labelledby="hiw-heading">
          <div className="container">
            <div className="section-header"><p className="section-eyebrow">The process</p><h2 className="section-heading" id="hiw-heading">From curiosity to mastery</h2></div>
            <div className="hiw-steps">
              <div className="hiw-step"><div className="hiw-step__number" aria-hidden="true">01</div><div className="hiw-step__visual" aria-hidden="true"><div className="hiw-icon hiw-icon--discover"><div className="hiw-icon__lens" /><div className="hiw-icon__handle" /></div></div><div className="hiw-step__content"><h3 className="hiw-step__title">Discover Knowledge</h3><p className="hiw-step__desc">Browse a curated library of courses and learning materials across the topics you care about.</p></div></div>
              <div className="hiw-connector" aria-hidden="true"><div className="hiw-connector__line" /><div className="hiw-connector__dot" /></div>
              <div className="hiw-step"><div className="hiw-step__number" aria-hidden="true">02</div><div className="hiw-step__visual" aria-hidden="true"><div className="hiw-icon hiw-icon--connect"><div className="hiw-icon__node hiw-icon__node--a" /><div className="hiw-icon__node hiw-icon__node--b" /><div className="hiw-icon__node hiw-icon__node--c" /><div className="hiw-icon__edge hiw-icon__edge--ab" /><div className="hiw-icon__edge hiw-icon__edge--bc" /></div></div><div className="hiw-step__content"><h3 className="hiw-step__title">Connect Ideas</h3><p className="hiw-step__desc">Explore related topics, categories, and learning materials. Your AI companion surfaces helpful connections along the way.</p></div></div>
              <div className="hiw-connector" aria-hidden="true"><div className="hiw-connector__line" /><div className="hiw-connector__dot" /></div>
              <div className="hiw-step"><div className="hiw-step__number" aria-hidden="true">03</div><div className="hiw-step__visual" aria-hidden="true"><div className="hiw-icon hiw-icon--build"><div className="hiw-icon__bar hiw-icon__bar--a" /><div className="hiw-icon__bar hiw-icon__bar--b" /><div className="hiw-icon__bar hiw-icon__bar--c" /><div className="hiw-icon__flag" /></div></div><div className="hiw-step__content"><h3 className="hiw-step__title">Build Your Path</h3><p className="hiw-step__desc">Build a personal learning roadmap with milestones, prerequisites, and progress tracking.</p></div></div>
            </div>
          </div>
        </section>

        <section className="cta-section" id="about" aria-labelledby="cta-heading">
          <div className="container cta-inner"><div className="cta-content"><h2 className="cta-heading" id="cta-heading">Ready to take ownership<br />of your learning?</h2><p className="cta-desc">Explore curated courses, build lasting knowledge, and move forward with a learning path designed for you.</p><Link href="/courses" className="btn btn--white btn--lg">Start Exploring for Free</Link></div><div className="cta-shapes" aria-hidden="true"><div className="cta-shape cta-shape--a" /><div className="cta-shape cta-shape--b" /><div className="cta-shape cta-shape--c" /></div></div>
        </section>
      </main>

      <footer className="site-footer" role="contentinfo">
        <div className="container footer-inner"><div className="footer-brand"><Logo /><p className="footer-brand__desc">A curated learning platform with an AI Learning Companion. Built for curious minds who take learning seriously.</p></div><nav className="footer-nav" aria-label="Footer navigation"><div className="footer-nav__col"><p className="footer-nav__label">Platform</p><Link href="/courses" className="footer-nav__link">Explore</Link><a href="#features" className="footer-nav__link">Features</a><a href="#how-it-works" className="footer-nav__link">How It Works</a></div><div className="footer-nav__col"><p className="footer-nav__label">Learning</p><Link href="/courses" className="footer-nav__link">Courses</Link><a href="#features" className="footer-nav__link">AI Companion</a><a href="#how-it-works" className="footer-nav__link">Learning Paths</a></div><div className="footer-nav__col"><p className="footer-nav__label">Company</p><a href="#about" className="footer-nav__link">About</a><a href="#" className="footer-nav__link">Privacy</a><a href="#" className="footer-nav__link">Terms</a></div></nav></div>
        <div className="footer-bottom"><div className="container footer-bottom-inner"><p className="footer-copyright">© 2026 KnowledgeHub. All rights reserved.</p><p className="footer-tagline">Knowledge worth keeping.</p></div></div>
      </footer>
    </>
  );
}
