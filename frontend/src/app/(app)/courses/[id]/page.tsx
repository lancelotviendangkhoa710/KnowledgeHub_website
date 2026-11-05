'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Article } from '@/types/content';
import { fetchArticle, fetchArticles } from '@/lib/contentClient';
import { api } from '@/lib/api';
import { getCurrentUser, setCurrentUser as setGlobalCurrentUser, subscribeCurrentUser, AuthUser } from '@/lib/auth';
import { accountClient } from '@/lib/accountClient';
import { getAccessToken } from '@/lib/authToken';


function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard write permission denied or unavailable
      }
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
    const matchedPart = match[0];
    if (matchedPart.startsWith('`') && matchedPart.endsWith('`')) {
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
          {matchedPart.slice(1, -1)}
        </code>
      );
    } else if (matchedPart.startsWith('**') && matchedPart.endsWith('**')) {
      parts.push(<strong key={`bold-${match.index}`}>{matchedPart.slice(2, -2)}</strong>);
    } else if (matchedPart.startsWith('*') && matchedPart.endsWith('*')) {
      parts.push(<em key={`italic-${match.index}`}>{matchedPart.slice(1, -1)}</em>);
    } else if (matchedPart.startsWith('[') && matchedPart.includes('](')) {
      const closingBracket = matchedPart.indexOf('](');
      const linkText = matchedPart.slice(1, closingBracket);
      const linkHref = matchedPart.slice(closingBracket + 2, -1).trim();

      const isSafe =
        linkHref.startsWith('#') ||
        (linkHref.startsWith('/') &&
          !linkHref.startsWith('//') &&
          !linkHref.startsWith('/\\') &&
          !linkHref.includes('\\') &&
          !/[\r\n\t]/.test(linkHref)) ||
        linkHref.startsWith('http://') ||
        linkHref.startsWith('https://');

      if (isSafe) {
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
      } else {
        parts.push(linkText);
      }
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const idOrSlug = params?.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const [bookmarkNotice, setBookmarkNotice] = useState<string | null>(null);
  const [isBookmarkPending, setIsBookmarkPending] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [readingProgress, setReadingProgress] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getCurrentUser);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);

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
    async function loadCourse() {
      if (!idOrSlug) return;
      setLoading(true);
      const data = await fetchArticle(idOrSlug);
      setArticle(data);
      const user = getCurrentUser();
      const authBearer = getAccessToken();
      if (user || authBearer) {
        setBookmarked(data?.is_bookmarked ?? false);
      } else {
        setBookmarked(false);
      }
      if (data?.category_id) {
        fetchArticles({ categoryId: data.category_id })
          .then((list) => {
            setRelatedArticles(list.filter((a) => a.id !== data.id).slice(0, 3));
          })
          .catch(() => {});
      }
      setLoading(false);
    }
    loadCourse();
  }, [idOrSlug]);


  // Extract dynamic table of contents from markdown with unique IDs
  const tocItems = useMemo(() => {
    if (!article) return [];
    const v = article.published_version || article.latest_version;
    const raw = v?.content || '';
    const lines = raw.split('\n');
    const items: { id: string; text: string; level: number }[] = [];
    const seenIds = new Map<string, number>();
    let inCode = false;

    lines.forEach((line, idx) => {
      if (line.startsWith('```')) {
        inCode = !inCode;
        return;
      }
      if (inCode) return;

      if (line.startsWith('## ')) {
        const text = line.replace('## ', '').trim();
        const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `sec-${idx}`;
        const count = seenIds.get(base) || 0;
        seenIds.set(base, count + 1);
        const id = count === 0 ? base : `${base}-${count}`;
        items.push({ id, text, level: 2 });
      } else if (line.startsWith('### ')) {
        const text = line.replace('### ', '').trim();
        const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `sec-${idx}`;
        const count = seenIds.get(base) || 0;
        seenIds.set(base, count + 1);
        const id = count === 0 ? base : `${base}-${count}`;
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

  const toggleBookmark = async () => {
    if (!article || isBookmarkPending) return;

    const user = getCurrentUser();
    const authBearer = getAccessToken();

    if (!user && !authBearer) {
      setBookmarkNotice('Vui lòng đăng nhập để lưu khóa học vào Thư viện cá nhân');
      router.push(`/login?redirect=/courses/${encodeURIComponent(idOrSlug)}`);
      return;
    }

    const targetState = !bookmarked;
    setIsBookmarkPending(true);
    setBookmarked(targetState);
    setBookmarkNotice(null);

    try {
      if (targetState) {
        await api.post(`/v1/articles/${article.id}/bookmark`, {});
      } else {
        await api.delete(`/v1/articles/${article.id}/bookmark`);
      }
    } catch {
      // Revert optimistic update on error
      setBookmarked(!targetState);
      setBookmarkNotice('Không thể đồng bộ bookmark với máy chủ. Vui lòng thử lại.');
      setTimeout(() => setBookmarkNotice(null), 4000);
    } finally {
      setIsBookmarkPending(false);
    }
  };


  // Track reading progress based on article content scroll
  useEffect(() => {
    const updateProgress = () => {
      const articleEl = document.getElementById('course-article-content');
      if (!articleEl) return;
      const rect = articleEl.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalHeight = rect.height;
      const scrolled = Math.max(0, -rect.top);
      const maxScroll = totalHeight - windowHeight + 100;
      if (maxScroll <= 0) {
        setReadingProgress(100);
      } else {
        const percent = Math.min(100, Math.max(0, Math.round((scrolled / maxScroll) * 100)));
        setReadingProgress(percent);
      }
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [article]);

  // Load completion status from storage
  useEffect(() => {
    if (!article?.id) return;
    try {
      const completedList: string[] = JSON.parse(localStorage.getItem('kh_completed_articles') || '[]');
      setIsCompleted(completedList.includes(article.id));
    } catch {
      // Ignore
    }
  }, [article?.id]);

  const handleToggleCompleted = () => {
    if (!article?.id) return;
    const nextCompleted = !isCompleted;
    setIsCompleted(nextCompleted);
    try {
      const completedList: string[] = JSON.parse(localStorage.getItem('kh_completed_articles') || '[]');
      if (nextCompleted) {
        if (!completedList.includes(article.id)) completedList.push(article.id);
      } else {
        const idx = completedList.indexOf(article.id);
        if (idx !== -1) completedList.splice(idx, 1);
      }
      localStorage.setItem('kh_completed_articles', JSON.stringify(completedList));
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

  const isGuest = !currentUser && !getAccessToken();

  const { introContent, remainingContent } = useMemo(() => {
    if (!content) return { introContent: '', remainingContent: '' };
    const lines = content.split('\n');
    let splitIdx = -1;
    let headingCount = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('## ')) {
        headingCount++;
        if (headingCount >= 2) {
          splitIdx = i;
          break;
        }
      }
    }
    if (splitIdx === -1) {
      let nonEmpties = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().length > 0) nonEmpties++;
        if (nonEmpties >= 4) {
          splitIdx = i + 1;
          break;
        }
      }
    }
    if (splitIdx > 0 && splitIdx < lines.length) {
      return {
        introContent: lines.slice(0, splitIdx).join('\n'),
        remainingContent: lines.slice(splitIdx).join('\n'),
      };
    }
    const fallbackCut = Math.min(6, lines.length);
    return {
      introContent: lines.slice(0, fallbackCut).join('\n'),
      remainingContent: lines.slice(fallbackCut).join('\n'),
    };
  }, [content]);

  // Advanced parser for technical long-form reading with Dracula code blocks and alert callouts
  const renderFormattedContent = (raw: string) => {
    const lines = raw.split('\n');
    const elements: React.ReactNode[] = [];
    const seenHeadingIds = new Map<string, number>();

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Code Block
      if (line.startsWith('```')) {
        const codeLanguage = line.replace('```', '').trim();
        const codeBuffer: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeBuffer.push(lines[i]);
          i++;
        }
        elements.push(
          <CodeBlock
            key={`code-${i}`}
            code={codeBuffer.join('\n')}
            language={codeLanguage}
          />
        );
        i++; // skip closing ```
        continue;
      }

      // Headings
      if (line.startsWith('## ')) {
        const text = line.replace('## ', '').trim();
        const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `sec-${i}`;
        const count = seenHeadingIds.get(base) || 0;
        seenHeadingIds.set(base, count + 1);
        const headingId = count === 0 ? base : `${base}-${count}`;
        elements.push(
          <h2
            key={`h2-${i}`}
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
        i++;
        continue;
      }

      if (line.startsWith('### ')) {
        const text = line.replace('### ', '').trim();
        const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `sec-${i}`;
        const count = seenHeadingIds.get(base) || 0;
        seenHeadingIds.set(base, count + 1);
        const headingId = count === 0 ? base : `${base}-${count}`;
        elements.push(
          <h3
            key={`h3-${i}`}
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
        i++;
        continue;
      }

      // Group consecutive blockquote lines starting with > into one Callout
      if (line.startsWith('>')) {
        let calloutKind: 'note' | 'tip' | 'warning' | 'default' = 'default';
        let calloutTitle: string | undefined = undefined;
        const quoteContents: string[] = [];

        const firstClean = line.replace(/^>\s*/, '');
        if (/^\[!(NOTE|IMPORTANT)\]/i.test(firstClean)) {
          calloutKind = 'note';
          calloutTitle = 'Note';
          const rest = firstClean.replace(/^\[!(NOTE|IMPORTANT)\]\s*/i, '').trim();
          if (rest) quoteContents.push(rest);
        } else if (/^\[!TIP\]/i.test(firstClean)) {
          calloutKind = 'tip';
          calloutTitle = 'Tip & Best Practice';
          const rest = firstClean.replace(/^\[!TIP\]\s*/i, '').trim();
          if (rest) quoteContents.push(rest);
        } else if (/^\[!(WARNING|CAUTION)\]/i.test(firstClean)) {
          calloutKind = 'warning';
          calloutTitle = 'Warning';
          const rest = firstClean.replace(/^\[!(WARNING|CAUTION)\]\s*/i, '').trim();
          if (rest) quoteContents.push(rest);
        } else {
          quoteContents.push(firstClean);
        }

        i++;
        while (i < lines.length && lines[i].startsWith('>')) {
          quoteContents.push(lines[i].replace(/^>\s*/, ''));
          i++;
        }

        elements.push(
          <Callout key={`quote-${i}`} kind={calloutKind} title={calloutTitle}>
            {quoteContents.map((qc, qIdx) => (
              <p key={qIdx} style={{ margin: qIdx > 0 ? '0.5rem 0 0 0' : 0 }}>
                {renderInlineFormatting(qc)}
              </p>
            ))}
          </Callout>
        );
        continue;
      }

      // List Items
      if (line.startsWith('* ') || line.startsWith('- ')) {
        elements.push(
          <li
            key={`li-${i}`}
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
        i++;
        continue;
      }

      // Horizontal Rule
      if (line.trim() === '---') {
        elements.push(<hr key={`hr-${i}`} style={{ borderColor: 'var(--color-border)', margin: '2.5rem 0' }} />);
        i++;
        continue;
      }

      // Paragraph
      if (line.trim().length > 0) {
        elements.push(
          <p
            key={`p-${i}`}
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

      i++;
    }

    return elements;
  };

  return (
    <div className="container" style={{ paddingTop: '2.5rem' }}>
      {/* Top Reading Progress Bar */}
      <div
        role="progressbar"
        aria-valuenow={readingProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${readingProgress}%`,
          height: '4px',
          backgroundColor: 'var(--color-primary, #0284C7)',
          zIndex: 9999,
          transition: 'width 100ms ease-out',
        }}
      />
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
        <article
          id="course-article-content"
          style={{ maxWidth: 'var(--max-w-reader)', background: 'var(--color-white)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xs)' }}
        >
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
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={toggleBookmark}
                    disabled={isBookmarkPending}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.45rem 0.95rem',
                      fontSize: '0.85rem',
                      backgroundColor: bookmarked ? 'var(--color-primary-pale)' : undefined,
                      color: bookmarked ? 'var(--color-primary)' : undefined,
                      borderColor: bookmarked ? 'var(--color-primary)' : undefined,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                    {bookmarked ? 'Bookmarked' : 'Bookmark'}
                  </button>
                  {bookmarkNotice && (
                    <div
                      role="status"
                      style={{
                        position: 'absolute',
                        top: '115%',
                        right: 0,
                        backgroundColor: '#0F172A',
                        color: '#F8FAFC',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        boxShadow: 'var(--shadow-md)',
                        zIndex: 50,
                        border: '1px solid #334155',
                      }}
                    >
                      {bookmarkNotice}
                    </div>
                  )}
                </div>

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
            {isGuest ? (
              <>
                {renderFormattedContent(introContent)}

                {/* Blurred preview teaser */}
                {remainingContent && (
                  <div
                    aria-hidden="true"
                    style={{
                      filter: 'blur(5px)',
                      opacity: 0.35,
                      pointerEvents: 'none',
                      userSelect: 'none',
                      maxHeight: 220,
                      overflow: 'hidden',
                      marginTop: '1.5rem',
                    }}
                  >
                    {renderFormattedContent(remainingContent.slice(0, 800))}
                  </div>
                )}

                {/* Curriculum Access Gate */}
                <div
                  style={{
                    marginTop: '2rem',
                    padding: '2.75rem 2rem',
                    borderRadius: 'var(--radius-lg)',
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
                    border: '1.5px solid var(--color-border)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
                    textAlign: 'center',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-primary-pale, #E0F2FE)',
                      color: 'var(--color-primary, #0284C7)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1.25rem',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <h3
                    style={{
                      fontSize: '1.45rem',
                      fontWeight: 700,
                      color: 'var(--color-charcoal)',
                      marginBottom: '0.75rem',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Nội dung Độc quyền dành cho Thành viên
                  </h3>
                  <p
                    style={{
                      color: 'var(--color-gray)',
                      fontSize: '1rem',
                      lineHeight: 1.65,
                      maxWidth: 540,
                      margin: '0 auto 1.75rem auto',
                    }}
                  >
                    Vui lòng đăng nhập tài khoản KnowledgeHub để mở khóa toàn bộ bài giảng kỹ thuật, mã nguồn mẫu và theo dõi tiến độ học tập.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <Link
                      href={`/login?redirect=/courses/${encodeURIComponent(idOrSlug)}`}
                      className="btn btn-primary"
                      style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem', fontWeight: 600 }}
                    >
                      Đăng nhập ngay
                    </Link>
                    <Link
                      href={`/register?redirect=/courses/${encodeURIComponent(idOrSlug)}`}
                      className="btn btn-secondary"
                      style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem', fontWeight: 600 }}
                    >
                      Đăng ký tài khoản miễn phí
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              renderFormattedContent(content)
            )}
          </div>

          {/* Completion Footer Action */}
          {!isGuest && (
            <div
              style={{
                marginTop: '3.5rem',
              padding: '2rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: isCompleted ? '#F0FDF4' : 'var(--color-background)',
              border: isCompleted ? '1.5px solid #86EFAC' : '1px solid var(--color-border)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.25rem',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                {isCompleted ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 14 14" />
                  </svg>
                )}
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: isCompleted ? '#166534' : 'var(--color-charcoal)' }}>
                  {isCompleted ? 'Lesson Completed' : 'Complete Lesson'}
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: isCompleted ? '#15803D' : 'var(--color-gray)' }}>
                {isCompleted
                  ? 'You have completed this module on this browser. Lesson progress is recorded locally on this device.'
                  : 'Mark this module as complete to save your learning history on this browser.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleCompleted}
              className={isCompleted ? 'btn btn-secondary' : 'btn btn-primary'}
              style={{
                padding: '0.65rem 1.4rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {isCompleted ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Completed (Click to undo)
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Mark as Completed
                </>
              )}
            </button>
          </div>
          )}
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

          {/* Author Actions (Only for Author or Admin) vs Related Modules (for Users & Guests) */}
          {(() => {
            const isAuthor = Boolean(
              currentUser &&
                article &&
                (article.author_id === currentUser.id || article.author?.id === currentUser.id)
            );
            const isAdmin = Boolean(currentUser?.roles?.includes('admin'));
            const canEdit = isAuthor || isAdmin;

            if (canEdit) {
              return (
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
              );
            }

            return (
              <div
                style={{
                  background: 'var(--color-white)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                  <h4 style={{ margin: 0, color: 'var(--color-charcoal)', fontWeight: 700, fontSize: '1rem' }}>
                    Related Curricula
                  </h4>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-gray)', marginBottom: '1rem', lineHeight: 1.45 }}>
                  Related modules in the {article.category ? `"${article.category.name}"` : 'technical'} domain:
                </p>
                {relatedArticles.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {relatedArticles.map((rel) => {
                      const relVersion = rel.published_version || rel.latest_version;
                      return (
                        <Link
                          key={rel.id}
                          href={`/courses/${rel.slug || rel.id}`}
                          style={{
                            display: 'block',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border-light)',
                            textDecoration: 'none',
                            backgroundColor: 'var(--color-background)',
                            transition: 'border-color var(--transition-fast)',
                          }}
                        >
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '0.2rem' }}>
                            {relVersion?.title || rel.slug}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-gray)' }}>
                            Version {relVersion?.version_no || 1}.0 • {rel.category?.name || 'Technical'}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-gray)', fontStyle: 'italic' }}>
                    Additional modules for this learning domain are currently in preparation.
                  </div>
                )}
                <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid var(--color-border-light)' }}>
                  <Link
                    href="/learning/roadmaps"
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    Explore Learning Roadmaps &rarr;
                  </Link>
                </div>
              </div>
            );
          })()}
        </aside>
      </div>
    </div>
  );
}
