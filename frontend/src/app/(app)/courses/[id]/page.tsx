'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Article } from '@/types/content';
import { fetchArticle } from '@/lib/contentClient';


function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        margin: '1.75rem 0',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid #334155',
        backgroundColor: '#0F172A',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.45rem 1rem',
          backgroundColor: '#1E293B',
          borderBottom: '1px solid #334155',
          fontSize: '0.75rem',
          color: '#94A3B8',
          fontFamily: 'var(--font-mono, monospace)',
          textTransform: 'lowercase',
        }}
      >
        <span>{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            background: 'transparent',
            border: '1px solid #475569',
            color: copied ? '#4ADE80' : '#E2E8F0',
            borderRadius: '4px',
            padding: '0.2rem 0.55rem',
            fontSize: '0.72rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all var(--transition-fast)',
          }}
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre
        style={{
          padding: '1.25rem',
          margin: 0,
          overflowX: 'auto',
          fontSize: '0.9rem',
          lineHeight: 1.65,
          color: '#F8FAFC',
          fontFamily: 'var(--font-mono, monospace)',
          backgroundColor: '#0F172A',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Callout({
  kind,
  title,
  children,
}: {
  kind: 'note' | 'tip' | 'warning' | 'default';
  title?: string;
  children: React.ReactNode;
}) {
  const styles = {
    note: {
      border: '#3B82F6',
      bg: '#EFF6FF',
      text: '#1E40AF',
      title: title || 'Note',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
    },
    tip: {
      border: '#10B981',
      bg: '#ECFDF5',
      text: '#065F46',
      title: title || 'Tip',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
          <path d="M9 18h6m-4 4h2m-1-18a7 7 0 0 0-7 7c0 2.22 1.2 4.15 3 5.19V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-.81c1.8-1.04 3-2.97 3-5.19a7 7 0 0 0-7-7z" />
        </svg>
      ),
    },
    warning: {
      border: '#F59E0B',
      bg: '#FFFBEB',
      text: '#92400E',
      title: title || 'Warning',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    default: {
      border: 'var(--color-primary, #0284C7)',
      bg: 'var(--color-primary-faint, #F0F9FF)',
      text: 'var(--color-charcoal, #0F172A)',
      title: undefined,
      icon: null,
    },
  }[kind];

  return (
    <div
      style={{
        borderLeft: `4px solid ${styles.border}`,
        backgroundColor: styles.bg,
        padding: '1rem 1.25rem',
        borderRadius: '0 var(--radius-md) var(--radius-md) 0',
        margin: '1.5rem 0',
      }}
    >
      {styles.title && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            marginBottom: '0.4rem',
            fontWeight: 700,
            color: styles.text,
            fontSize: '0.9rem',
          }}
        >
          {styles.icon}
          <span>{styles.title}</span>
        </div>
      )}
      <div style={{ color: styles.text, fontSize: '0.975rem', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

function renderInlineFormatting(text: string): React.ReactNode {
  // Simple inline parser for `code`, **bold**, *italic*, and [link](url)
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`code-${match.index}`}
          style={{
            backgroundColor: '#F1F5F9',
            color: '#0F172A',
            padding: '0.15rem 0.4rem',
            borderRadius: '4px',
            fontSize: '0.88em',
            fontFamily: 'var(--font-mono, monospace)',
            border: '1px solid var(--color-border)',
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={`bold-${match.index}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(<em key={`italic-${match.index}`}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('[') && token.includes('](')) {
      const closingBracket = token.indexOf('](');
      const linkText = token.slice(1, closingBracket);
      const linkHref = token.slice(closingBracket + 2, -1);
      parts.push(
        <a
          key={`link-${match.index}`}
          href={linkHref}
          target={linkHref.startsWith('http') ? '_blank' : undefined}
          rel={linkHref.startsWith('http') ? 'noopener noreferrer' : undefined}
          style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
        >
          {linkText}
        </a>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export default function CourseDetailPage() {
  const params = useParams();
  const idOrSlug = params?.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');

  useEffect(() => {
    async function loadCourse() {
      if (!idOrSlug) return;
      setLoading(true);
      const data = await fetchArticle(idOrSlug);
      setArticle(data);
      setBookmarked(data?.is_bookmarked ?? false);
      setLoading(false);
    }
    loadCourse();
  }, [idOrSlug]);


  // Extract dynamic table of contents from markdown
  const tocItems = useMemo(() => {
    if (!article) return [];
    const v = article.published_version || article.latest_version;
    const raw = v?.content || '';
    const lines = raw.split('\n');
    const items: { id: string; text: string; level: number }[] = [];
    let inCode = false;

    lines.forEach((line, idx) => {
      if (line.startsWith('```')) {
        inCode = !inCode;
        return;
      }
      if (inCode) return;

      if (line.startsWith('## ')) {
        const text = line.replace('## ', '').trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `sec-${idx}`;
        items.push({ id, text, level: 2 });
      } else if (line.startsWith('### ')) {
        const text = line.replace('### ', '').trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `sec-${idx}`;
        items.push({ id, text, level: 3 });
      }
    });

    return items;
  }, [article]);

  useEffect(() => {
    if (tocItems.length === 0) return;

    const handleScroll = () => {
      const scrollY = window.scrollY + 120;
      let currentId = '';
      for (const item of tocItems) {
        const el = document.getElementById(item.id);
        if (el && el.offsetTop <= scrollY) {
          currentId = item.id;
        }
      }
      if (currentId) {
        setActiveHeadingId(currentId);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tocItems]);

  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `#${id}`);
      setActiveHeadingId(id);
    }
  };

  const toggleBookmark = () => {
    setBookmarked(!bookmarked);
    try {
      const stored = JSON.parse(localStorage.getItem('kh_saved_courses') || '[]');
      if (!bookmarked) {
        if (!stored.includes(article?.id)) stored.push(article?.id);
      } else {
        const idx = stored.indexOf(article?.id);
        if (idx !== -1) stored.splice(idx, 1);
      }
      localStorage.setItem('kh_saved_courses', JSON.stringify(stored));
    } catch {
      // Ignore
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--color-gray)' }}>
        Loading course curriculum...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--color-charcoal)' }}>Course Material Not Found</h2>
        <p style={{ color: 'var(--color-gray)', marginBottom: '2rem' }}>
          The requested course material does not exist or has been archived.
        </p>
        <Link href="/courses" className="btn btn-primary">
          Back to Courses
        </Link>
      </div>
    );
  }

  const version = article.published_version || article.latest_version;
  const content = version?.content || 'No content recorded for this version.';

  // Advanced parser for technical long-form reading with Dracula code blocks and alert callouts
  const renderFormattedContent = (raw: string) => {
    const lines = raw.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLanguage = '';

    lines.forEach((line, idx) => {
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBuffer = [];
          codeLanguage = line.replace('```', '').trim();
        } else {
          inCodeBlock = false;
          elements.push(
            <CodeBlock
              key={`code-${idx}`}
              code={codeBuffer.join('\n')}
              language={codeLanguage}
            />
          );
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      if (line.startsWith('## ')) {
        const text = line.replace('## ', '').trim();
        const headingId = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `sec-${idx}`;
        elements.push(
          <h2
            key={idx}
            id={headingId}
            style={{
              color: 'var(--color-charcoal)',
              marginTop: '3rem',
              marginBottom: '1.25rem',
              borderBottom: '1.5px solid var(--color-border)',
              paddingBottom: '0.65rem',
              fontSize: '1.85rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              scrollMarginTop: 'calc(var(--header-height) + 1.5rem)',
            }}
          >
            {text}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        const text = line.replace('### ', '').trim();
        const headingId = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `sec-${idx}`;
        elements.push(
          <h3
            key={idx}
            id={headingId}
            style={{
              color: 'var(--color-charcoal)',
              marginTop: '2.25rem',
              marginBottom: '0.85rem',
              fontSize: '1.4rem',
              fontWeight: 700,
              letterSpacing: '-0.015em',
              scrollMarginTop: 'calc(var(--header-height) + 1.5rem)',
            }}
          >
            {text}
          </h3>
        );
      } else if (line.startsWith('> [!NOTE]') || line.startsWith('> [!IMPORTANT]')) {
        const rawNote = line.replace(/^>\s*\[!(NOTE|IMPORTANT)\]\s*/i, '').trim();
        elements.push(
          <Callout key={idx} kind="note" title="Note">
            {renderInlineFormatting(rawNote || 'Important technical context and requirements.')}
          </Callout>
        );
      } else if (line.startsWith('> [!TIP]')) {
        const rawTip = line.replace(/^>\s*\[!TIP\]\s*/i, '').trim();
        elements.push(
          <Callout key={idx} kind="tip" title="Tip & Best Practice">
            {renderInlineFormatting(rawTip || 'Recommended production design pattern.')}
          </Callout>
        );
      } else if (line.startsWith('> [!WARNING]') || line.startsWith('> [!CAUTION]')) {
        const rawWarn = line.replace(/^>\s*\[!(WARNING|CAUTION)\]\s*/i, '').trim();
        elements.push(
          <Callout key={idx} kind="warning" title="Warning">
            {renderInlineFormatting(rawWarn || 'Breaking changes or operational risks.')}
          </Callout>
        );
      } else if (line.startsWith('> ')) {
        const rawQuote = line.replace(/^>\s*/, '').trim();
        elements.push(
          <Callout key={idx} kind="default">
            {renderInlineFormatting(rawQuote)}
          </Callout>
        );
      } else if (line.startsWith('* ') || line.startsWith('- ')) {
        elements.push(
          <li
            key={idx}
            style={{
              marginLeft: '1.5rem',
              color: 'var(--color-charcoal)',
              marginBottom: '0.65rem',
              lineHeight: 1.75,
              fontSize: '1.05rem',
            }}
          >
            {renderInlineFormatting(line.replace(/^[*-]\s+/, ''))}
          </li>
        );
      } else if (line.trim() === '---') {
        elements.push(<hr key={idx} style={{ borderColor: 'var(--color-border)', margin: '2.5rem 0' }} />);
      } else if (line.trim().length > 0) {
        elements.push(
          <p
            key={idx}
            style={{
              color: 'var(--color-charcoal)',
              marginBottom: '1.4rem',
              lineHeight: 1.85,
              fontSize: '1.075rem',
              letterSpacing: '0.005em',
            }}
          >
            {renderInlineFormatting(line)}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <div className="container" style={{ paddingTop: '2.5rem' }}>
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-gray)', marginBottom: '1.75rem' }}>
        <Link href="/courses" style={{ color: 'var(--color-gray)', transition: 'color var(--transition-fast)' }}>
          Courses
        </Link>
        <span style={{ color: 'var(--color-gray-light)' }}>/</span>
        {article.category && (
          <>
            <span style={{ color: 'var(--color-charcoal)', fontWeight: 500 }}>{article.category.name}</span>
            <span style={{ color: 'var(--color-gray-light)' }}>/</span>
          </>
        )}
        <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Current Course</span>
      </nav>

      {/* Reader Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '3rem', alignItems: 'start' }}>
        {/* Main Content Column */}
        <article style={{ maxWidth: 'var(--max-w-reader)', background: 'var(--color-white)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xs)' }}>
          <header style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
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
                Version {version?.version_no || 1}.0
              </span>
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
                Verified Curriculum
              </span>
            </div>

            <h1 style={{ marginBottom: '1.25rem', lineHeight: 1.2, color: 'var(--color-charcoal)', fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 800 }}>
              {version?.title}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', color: 'var(--color-gray)', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--color-primary-pale)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}
                >
                  {article.author?.name ? article.author.name[0] : 'C'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>
                    {article.author?.name || 'Staff Engineer'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-gray)' }}>
                    Published on {article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Recent'}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={toggleBookmark}
                  className="btn btn-secondary"
                  style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                  </svg>
                  {bookmarked ? 'Bookmarked' : 'Bookmark'}
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="btn btn-outline"
                  style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem' }}
                >
                  {copied ? 'Copied URL!' : 'Share'}
                </button>
              </div>
            </div>
          </header>

          {/* Prose Content */}
          <div className="prose">
            {renderFormattedContent(content)}
          </div>
        </article>

        {/* Sidebar Info & Controls */}
        <aside style={{ position: 'sticky', top: 'calc(var(--header-height) + 1.5rem)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Dynamic Table of Contents */}
          {tocItems.length > 0 && (
            <nav
              aria-label="Table of Contents"
              style={{
                background: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                <h4 style={{ margin: 0, color: 'var(--color-charcoal)', fontWeight: 700, fontSize: '1rem' }}>
                  Table of Contents
                </h4>
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {tocItems.map((item) => {
                  const isActive = activeHeadingId === item.id;
                  return (
                    <li key={item.id} style={{ paddingLeft: item.level === 3 ? '1.25rem' : '0' }}>
                      <a
                        href={`#${item.id}`}
                        onClick={(e) => scrollToSection(e, item.id)}
                        style={{
                          fontSize: item.level === 3 ? '0.82rem' : '0.875rem',
                          color: isActive ? 'var(--color-primary)' : 'var(--color-gray)',
                          fontWeight: isActive ? 600 : 400,
                          textDecoration: 'none',
                          lineHeight: 1.45,
                          display: 'block',
                          transition: 'color var(--transition-fast)',
                          borderLeft: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                          paddingLeft: '0.5rem',
                        }}
                      >
                        {item.text}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
          <div
            style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <h4 style={{ marginBottom: '1rem', color: 'var(--color-charcoal)', fontWeight: 600, fontSize: '1.1rem' }}>
              Course Information
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              {article.category && (
                <div>
                  <span style={{ color: 'var(--color-gray)' }}>Domain: </span>
                  <span style={{ color: 'var(--color-charcoal)', fontWeight: 600 }}>{article.category.name}</span>
                </div>
              )}
              <div>
                <span style={{ color: 'var(--color-gray)' }}>Snapshot ID: </span>
                <span style={{ color: 'var(--color-charcoal)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  {version?.id || 'Draft (No Snapshot)'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--color-gray)' }}>Peer Review: </span>
                <span style={{ color: '#1B6E34', fontWeight: 600 }}>Internal Core Approved</span>
              </div>
            </div>
          </div>

          {/* Contributor revision box */}
          <div
            style={{
              background: 'var(--color-primary-faint)',
              border: '1px solid var(--color-primary-pale)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <span
              className="badge"
              style={{
                backgroundColor: 'var(--color-primary-pale)',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-border)',
                marginBottom: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.2rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
              }}
            >
              Author Actions
            </span>
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-charcoal)', fontWeight: 600 }}>
              Update Curriculum
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-gray)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Need to add sections or fix technical details? Create an immutable Version {(version?.version_no || 1) + 1}.
            </p>
            <Link
              href={`/courses/create?parent_id=${article.id}&slug=${article.slug}`}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              Draft Revision &rarr;
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
