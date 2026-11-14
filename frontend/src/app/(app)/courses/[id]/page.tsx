'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Article } from '@/types/content';
import { fetchArticle, fetchArticles, SERVER_WAKING_MESSAGE } from '@/lib/contentClient';
import { api } from '@/lib/api';
import { getCurrentUser, setCurrentUser as setGlobalCurrentUser, subscribeCurrentUser, AuthUser } from '@/lib/auth';
import { accountClient } from '@/lib/accountClient';
import { getAccessToken } from '@/lib/authToken';
import YouTubeEmbed from '@/components/content/YouTubeEmbed';
import { extractYouTubeVideoId } from '@/lib/videoUtils';
import { courseLevel, splitCourseTitle } from '@/lib/courseDisplay';
import { coverTheme, type CoverTheme } from '@/lib/courseCover';
import { highlightCode } from '@/lib/highlightCode';
import s from './lesson.module.css';

const THEME_COLOR: Record<CoverTheme, string> = {
  sys: 'var(--c-sys)',
  prog: 'var(--c-prog)',
  data: 'var(--c-data)',
  career: 'var(--c-career)',
};

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
    <div className={s.code}>
      <div className={s.codeTop}>
        <span>{language || 'code'}</span>
        <button type="button" onClick={handleCopy}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {copied ? <path d="m5 12 5 5 9-10" /> : <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></>}
          </svg>
          <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
        </button>
      </div>
      <pre>
        <code>
          {highlightCode(code, language).map((tok, idx) =>
            tok.kind === 'plain' ? tok.text : (
              <span key={idx} className={s[tok.kind]}>
                {tok.text}
              </span>
            )
          )}
        </code>
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
  return (
    <div className={`${s.note} ${kind === 'warning' ? s.noteWarning : ''}`}>
      {title && <b>{title}</b>}
      {children}
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
      parts.push(<code key={`code-${match.index}`}>{matchedPart.slice(1, -1)}</code>);
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

function getHeadingSlug(text: string, fallbackIdx: number, seenIds: Set<string>): string {
  const base =
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `sec-${fallbackIdx}`;
  let candidate = base;
  let counter = 1;
  while (seenIds.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter++;
  }
  seenIds.add(candidate);
  return candidate;
}

/**
 * Course reader (`/courses/[id]`): loads one course by slug or ID from the live API, with a
 * cold-start "waking up" status, a retryable error state, and an abortable related-courses request.
 */
export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const idOrSlug = params?.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [wakingUp, setWakingUp] = useState<boolean>(false);
  // Controller of the load currently in flight; also acts as the "already loading" guard.
  const loadAbortRef = useRef<AbortController | null>(null);
  // Related-courses request is independent of the main load; aborted whenever a new course load starts.
  const relatedAbortRef = useRef<AbortController | null>(null);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const [bookmarkNotice, setBookmarkNotice] = useState<string | null>(null);
  const [isBookmarkPending, setIsBookmarkPending] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [readingProgress, setReadingProgress] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getCurrentUser);
  const [mounted, setMounted] = useState(false); // the signed-in marker is browser-only: read it after mount
  useEffect(() => setMounted(true), []);
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
        .catch((err: { status?: number }) => {
          if (err?.status === 401) {
            setGlobalCurrentUser(null);
            setCurrentUser(null);
          }
        });
    }
    return unsub;
  }, []);

  /**
   * Loads the course for the current route param. Guarded against concurrent runs (the Retry
   * button reuses it); aborts any previous related-courses request; aborted on unmount/route change.
   */
  const loadCourse = useCallback(async () => {
    if (!idOrSlug) {
      setLoading(false);
      return;
    }
    if (loadAbortRef.current) return; // a load (possibly retrying during cold start) is already in flight
    const controller = new AbortController();
    loadAbortRef.current = controller;
    relatedAbortRef.current?.abort();
    relatedAbortRef.current = null;
    setLoading(true);
    setLoadError(null);
    setWakingUp(false);
    try {
      const data = await fetchArticle(idOrSlug, {
        signal: controller.signal,
        onRetry: () => {
          if (!controller.signal.aborted) setWakingUp(true);
        },
      });
      if (controller.signal.aborted) return;
      setArticle(data);
      const user = getCurrentUser();
      const authBearer = getAccessToken();
      if (user || authBearer) {
        setBookmarked(data?.is_bookmarked ?? false);
      } else {
        setBookmarked(false);
      }
      if (data?.category_id) {
        const relatedController = new AbortController();
        relatedAbortRef.current = relatedController;
        fetchArticles({ categoryId: data.category_id }, { signal: relatedController.signal })
          .then((list) => {
            if (relatedController.signal.aborted) return;
            setRelatedArticles(list.filter((a) => a.id !== data.id).slice(0, 3));
          })
          .catch(() => {})
          .finally(() => {
            if (relatedAbortRef.current === relatedController) relatedAbortRef.current = null;
          });
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setArticle(null);
      setLoadError(
        err instanceof Error && err.message ? err.message : 'Không tải được khóa học từ máy chủ KnowledgeHub.'
      );
    } finally {
      // Only the current load may clear the loading state (an aborted one was superseded or unmounted).
      if (loadAbortRef.current === controller) {
        loadAbortRef.current = null;
        setLoading(false);
        setWakingUp(false);
      }
    }
  }, [idOrSlug]);

  useEffect(() => {
    loadCourse();
    return () => {
      loadAbortRef.current?.abort();
      loadAbortRef.current = null;
      relatedAbortRef.current?.abort();
      relatedAbortRef.current = null;
    };
  }, [loadCourse]);


  // Extract dynamic table of contents from markdown with unique IDs
  const tocItems = useMemo(() => {
    if (!article) return [];
    const v = article.published_version || article.latest_version;
    const raw = v?.content || '';
    const lines = raw.split('\n');
    const items: { id: string; text: string; level: number }[] = [];
    const seenIds = new Set<string>();
    let inCode = false;

    lines.forEach((line, idx) => {
      if (line.startsWith('```')) {
        inCode = !inCode;
        return;
      }
      if (inCode) return;

      if (line.startsWith('## ') || line.startsWith('### ')) {
        const isH2 = line.startsWith('## ');
        const text = line.replace(/^#{2,3}\s+/, '').trim();
        const id = getHeadingSlug(text, idx, seenIds);

        items.push({ id, text, level: isH2 ? 2 : 3 });
        return;
      }
    });

    return items;
  }, [article]);

  useEffect(() => {
    if (tocItems.length === 0) return;

    // Mục đang đọc: tiêu đề cuối cùng đã chạm vạch cách đầu màn hình 120px (tiêu đề gần đầu màn hình nhất);
    // chưa tới tiêu đề nào thì lấy mục đầu; cuộn hết trang thì lấy mục cuối.
    const handleScroll = () => {
      const present = tocItems.filter((item) => document.getElementById(item.id));
      if (present.length === 0) return;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let currentId = present[0].id;
      if (atBottom) {
        currentId = present[present.length - 1].id;
      } else {
        for (const item of present) {
          if ((document.getElementById(item.id) as HTMLElement).getBoundingClientRect().top <= 120) currentId = item.id;
        }
      }
      setActiveHeadingId(currentId);
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
    } else if (isGuest) {
      const gateEl = document.getElementById('curriculum-access-gate');
      if (gateEl) {
        gateEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const toggleBookmark = async () => {
    if (!article || isBookmarkPending) return;

    const authBearer = getAccessToken();

    if (!authBearer) {
      setBookmarkNotice('Hãy đăng nhập để lưu khóa học vào thư viện của bạn.');
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
      setBookmarkNotice('Không đồng bộ được mục đã lưu với máy chủ. Vui lòng thử lại.');
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

  const version = article?.published_version || article?.latest_version;
  const content = version?.content || 'Phiên bản này chưa có nội dung.';
  const isGuest = !currentUser && !(mounted && getAccessToken());

  const { introContent, remainingContent } = useMemo(() => {
    if (!content || !article) return { introContent: '', remainingContent: '' };
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
        if (nonEmpties >= 3) {
          splitIdx = i + 1;
          break;
        }
      }
    }

    if (splitIdx > 0 && splitIdx < lines.length) {
      const candidateIntro = lines.slice(0, splitIdx).join('\n');
      if (candidateIntro.length <= 1600) {
        return {
          introContent: candidateIntro,
          remainingContent: lines.slice(splitIdx).join('\n'),
        };
      }
    }

    if (content.length > 300) {
      const cutPoint = content.indexOf('\n\n', 200);
      const safeCut = cutPoint !== -1 && cutPoint < 450 ? cutPoint : 300;
      return {
        introContent: content.slice(0, safeCut).trim(),
        remainingContent: content.slice(safeCut).trim(),
      };
    }

    const fallbackCut = Math.max(1, Math.min(4, Math.floor(lines.length / 2)));
    return {
      introContent: lines.slice(0, fallbackCut).join('\n'),
      remainingContent: lines.slice(fallbackCut).join('\n') || 'Đăng nhập để xem toàn bộ nội dung khóa học.',
    };
  }, [content, article]);

  if (loading) {
    // The live region stays mounted for the whole loading phase; only its content toggles,
    // so screen readers announce the wake-up notice when it appears.
    return (
      <div className={s.wrap}>
        <div role="status" aria-live="polite" className={wakingUp ? s.waking : undefined}>
          {wakingUp ? SERVER_WAKING_MESSAGE : null}
        </div>
        {!wakingUp && <div className={s.loading}>Đang tải khóa học...</div>}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={s.wrap}>
        <div role="alert" className={s.state}>
          <div className={s.stateIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2>Không tải được khóa học</h2>
          <p>{loadError}</p>
          <p>Hãy kiểm tra kết nối hoặc thử lại.</p>
          <div className={s.stateActions}>
            <button type="button" onClick={() => loadCourse()} disabled={loading} aria-busy={loading} className={s.btn}>
              Thử lại
            </button>
            <Link href="/courses" className={`${s.btn} ${s.btnGhost}`}>
              Về danh sách khóa học
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className={s.wrap}>
        <div className={s.state}>
          <h2>Không tìm thấy khóa học</h2>
          <p>Khóa học này không tồn tại hoặc đã được lưu trữ.</p>
          <div className={s.stateActions}>
            <Link href="/courses" className={s.btn}>
              Về danh sách khóa học
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Advanced parser for technical long-form reading with code blocks and alert callouts
  const renderFormattedContent = (raw: string, headingTracker?: Set<string>) => {
    const lines = raw.split('\n');
    const elements: React.ReactNode[] = [];
    const seenHeadingIds = headingTracker || new Set<string>();

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Khối "Mục tiêu": dòng "# Mục tiêu" ở đầu nội dung, kèm đoạn văn ngay sau đó
      if (elements.length === 0 && /^#\s+Mục tiêu\s*$/i.test(line.trim())) {
        i++;
        while (i < lines.length && lines[i].trim() === '') i++;
        const goalLines: string[] = [];
        while (i < lines.length && lines[i].trim() !== '' && !/^(#|```|>|[*-]\s)/.test(lines[i])) {
          goalLines.push(lines[i].trim());
          i++;
        }
        elements.push(
          <div key="goal" className={s.goal}>
            <h4>Mục tiêu</h4>
            {goalLines.length > 0 && <p>{renderInlineFormatting(goalLines.join(' '))}</p>}
          </div>
        );
        continue;
      }

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
        const headingId = getHeadingSlug(text, i, seenHeadingIds);
        elements.push(
          <h2 key={`h2-${i}`} id={headingId}>
            {text}
          </h2>
        );
        i++;
        continue;
      }

      if (line.startsWith('### ')) {
        const text = line.replace('### ', '').trim();
        const headingId = getHeadingSlug(text, i, seenHeadingIds);
        elements.push(
          <h3 key={`h3-${i}`} id={headingId}>
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
          calloutTitle = 'Ghi chú';
          const rest = firstClean.replace(/^\[!(NOTE|IMPORTANT)\]\s*/i, '').trim();
          if (rest) quoteContents.push(rest);
        } else if (/^\[!TIP\]/i.test(firstClean)) {
          calloutKind = 'tip';
          calloutTitle = 'Mẹo hay';
          const rest = firstClean.replace(/^\[!TIP\]\s*/i, '').trim();
          if (rest) quoteContents.push(rest);
        } else if (/^\[!(WARNING|CAUTION)\]/i.test(firstClean)) {
          calloutKind = 'warning';
          calloutTitle = 'Cảnh báo';
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
              <p key={qIdx}>{renderInlineFormatting(qc)}</p>
            ))}
          </Callout>
        );
        continue;
      }

      // List Items
      if (line.startsWith('* ') || line.startsWith('- ')) {
        elements.push(<li key={`li-${i}`}>{renderInlineFormatting(line.replace(/^[*-]\s+/, ''))}</li>);
        i++;
        continue;
      }

      // Horizontal Rule
      if (line.trim() === '---') {
        elements.push(<hr key={`hr-${i}`} />);
        i++;
        continue;
      }

      // YouTube Video Embed (@[youtube](...) or standalone YouTube URL)
      const trimmedLine = line.trim();
      const ytSyntaxMatch = trimmedLine.match(/^@\[youtube\]\((.+?)\)$/i);
      const isStandaloneUrl =
        !ytSyntaxMatch &&
        /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtube-nocookie\.com|youtu\.be)\/[^\s]+$/i.test(trimmedLine);

      if (ytSyntaxMatch || isStandaloneUrl) {
        let rawTarget = trimmedLine;
        let customTitle: string | undefined = undefined;

        if (ytSyntaxMatch) {
          const inner = ytSyntaxMatch[1].trim();
          const titleMatch = inner.match(/^(\S+)(?:\s+["'](.+?)["'])?$/);
          if (titleMatch) {
            rawTarget = titleMatch[1];
            customTitle = titleMatch[2];
          } else {
            rawTarget = inner;
          }
        }

        const videoId = extractYouTubeVideoId(rawTarget);
        if (videoId) {
          elements.push(
            <YouTubeEmbed
              key={`yt-${i}`}
              videoId={videoId}
              title={customTitle}
            />
          );
          i++;
          continue;
        } else if (ytSyntaxMatch) {
          // Explicit @[youtube](...) syntax with invalid ID or spoofed URL -> render error box
          elements.push(
            <YouTubeEmbed
              key={`yt-invalid-${i}`}
              videoId={rawTarget}
              title={customTitle}
            />
          );
          i++;
          continue;
        }
      }

      // Paragraph
      if (line.trim().length > 0) {
        elements.push(<p key={`p-${i}`}>{renderInlineFormatting(line)}</p>);
      }

      i++;
    }

    return elements;
  };

  const { kicker, main: mainTitle } = splitCourseTitle(version?.title ?? '', courseLevel(article.tags));
  const isAuthor = Boolean(
    currentUser && (article.author_id === currentUser.id || article.author?.id === currentUser.id)
  );
  const canEdit = isAuthor || Boolean(currentUser?.roles?.includes('admin'));
  const dateLabel =
    article.status === 'draft'
      ? 'Bản nháp chưa xuất bản'
      : article.status === 'archived'
      ? 'Khóa học đã lưu trữ'
      : `Xuất bản ${article.published_at ? new Date(article.published_at).toLocaleDateString('vi-VN') : 'gần đây'}`;

  return (
    <div>
      {/* Thanh tiến độ đọc */}
      <div
        role="progressbar"
        aria-label="Tiến độ đọc"
        aria-valuenow={readingProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        className={s.progress}
      >
        <b style={{ width: `${readingProgress}%` }} />
      </div>

      <div className={`${s.wrap} ${s.lesson}`}>
        <article id="course-article-content" className={s.article}>
          <nav className={s.crumb} aria-label="Đường dẫn">
            <Link href="/courses">Khóa học</Link>
            {article.category && (
              <>
                <span aria-hidden="true">/</span>
                <Link href={`/courses?category=${article.category.id}`}>{article.category.name}</Link>
              </>
            )}
          </nav>

          {article.status === 'draft' && (
            <div className={s.banner}>
              <span>
                <b>Xem trước bản nháp.</b> Khóa học chưa xuất bản, chỉ tác giả và quản trị viên nhìn thấy.
              </span>
              <Link href={`/courses/create?parent_id=${article.id}`}>Sửa trong Studio →</Link>
            </div>
          )}
          {article.status === 'archived' && (
            <div className={s.banner}>
              <span>
                <b>Khóa học đã lưu trữ.</b> Quản trị viên đã lưu trữ khóa học này để tham khảo.
              </span>
            </div>
          )}

          {kicker && <span className={s.kicker}>{kicker}</span>}
          <h1>{mainTitle}</h1>

          <div className={s.meta}>
            <span className={s.by}>
              <span className={s.avatar} aria-hidden="true">{article.author?.name ? article.author.name[0] : 'C'}</span>
              {article.author?.name || 'Contributor'}
            </span>
            <span>{dateLabel}</span>
            <Link className={s.ver} href={`/courses/${encodeURIComponent(idOrSlug)}/versions`}>
              Phiên bản {version?.version_no || 1}, xem lịch sử
            </Link>
            <span className={s.acts}>
              <span className={s.saveWrap}>
                <button
                  type="button"
                  onClick={toggleBookmark}
                  disabled={isBookmarkPending}
                  aria-pressed={bookmarked}
                  className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16l-6-4-6 4z" /></svg>
                  <span>{bookmarked ? 'Đã lưu' : 'Lưu'}</span>
                </button>
                {bookmarkNotice && (
                  <div role="status" className={s.notice}>
                    {bookmarkNotice}
                  </div>
                )}
              </span>
              <button type="button" onClick={handleShare} className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4m0 0L8 8m4-4 4 4M5 13v6h14v-6" /></svg>
                {copied ? 'Đã chép liên kết' : 'Chia sẻ'}
              </button>
            </span>
          </div>

          {/* Prose Content */}
          <div className={s.prose}>
            {isGuest ? (
              (() => {
                const guestTracker = new Set<string>();
                return (
                  <>
                    {renderFormattedContent(introContent, guestTracker)}

                    {/* Blurred preview teaser with full inert focus isolation */}
                    {remainingContent && (
                      <div
                        aria-hidden="true"
                        tabIndex={-1}
                        inert={true as any}
                        className={s.teaser}
                      >
                        {renderFormattedContent(
                          remainingContent.length > 800
                            ? remainingContent.slice(0, 800).replace(/\n[^\n]*$/, '')
                            : remainingContent,
                          guestTracker
                        )}
                      </div>
                    )}

                    {/* Curriculum Access Gate */}
                    <div id="curriculum-access-gate" className={s.gate}>
                      <div className={s.stateIcon} aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <rect x="5" y="11" width="14" height="9" rx="2" />
                          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                        </svg>
                      </div>
                      <h3>Nội dung dành cho thành viên</h3>
                      <p>
                        Hãy đăng nhập tài khoản KnowledgeHub để xem toàn bộ nội dung khóa học, khối mã và theo dõi tiến độ.
                      </p>
                      <div className={s.stateActions}>
                        <Link href={`/login?redirect=/courses/${encodeURIComponent(idOrSlug)}`} className={s.btn}>
                          Đăng nhập
                        </Link>
                        <Link
                          href={`/register?redirect=/courses/${encodeURIComponent(idOrSlug)}`}
                          className={`${s.btn} ${s.btnGhost}`}
                        >
                          Tạo tài khoản miễn phí
                        </Link>
                      </div>
                    </div>
                  </>
                );
              })()
            ) : (
              renderFormattedContent(content)
            )}
          </div>

          {/* Completion Footer Action */}
          {!isGuest && (
            <div className={`${s.complete} ${isCompleted ? s.completeDone : ''}`}>
              <div>
                <h4>{isCompleted ? 'Đã hoàn thành bài học' : 'Hoàn thành bài học'}</h4>
                <p>
                  {isCompleted
                    ? 'Bạn đã hoàn thành bài này trên trình duyệt này. Tiến độ chỉ được lưu cục bộ trên thiết bị.'
                    : 'Đánh dấu hoàn thành để lưu lịch sử học trên trình duyệt này.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleCompleted}
                className={`${s.btn} ${isCompleted ? s.btnGhost : ''}`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
                {isCompleted ? 'Đã hoàn thành (bấm để hủy)' : 'Đánh dấu hoàn thành'}
              </button>
            </div>
          )}
        </article>

        {/* Mục lục và khóa học liên quan */}
        <aside className={s.side}>
          {tocItems.length > 0 && (
            <div>
              <h4>Mục lục</h4>
              <nav className={s.toc} aria-label="Mục lục">
                {tocItems.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => scrollToSection(e, item.id)}
                    className={`${activeHeadingId === item.id ? s.tocOn : ''} ${item.level === 3 ? s.tocSub : ''}`}
                    aria-current={activeHeadingId === item.id ? 'location' : undefined}
                  >
                    <span>{item.text}</span>
                  </a>
                ))}
              </nav>
            </div>
          )}

          {canEdit ? (
            <div>
              <h4>Cập nhật khóa học</h4>
              <div className={s.panel}>
                <p>
                  Cần thêm phần hoặc sửa chi tiết kỹ thuật? Tạo phiên bản {(version?.version_no || 1) + 1}, các phiên bản cũ vẫn được giữ.
                </p>
                <Link
                  href={`/courses/create?parent_id=${article.id}&slug=${article.slug}`}
                  className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                >
                  Soạn bản sửa &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <h4>Khóa học liên quan</h4>
              {relatedArticles.length > 0 ? (
                <div className={s.rel}>
                  {relatedArticles.map((rel) => {
                    const relVersion = rel.published_version || rel.latest_version;
                    const relLevel = courseLevel(rel.tags);
                    const relTitle = splitCourseTitle(relVersion?.title || rel.slug, relLevel).main;
                    return (
                      <Link key={rel.id} href={`/courses/${rel.slug || rel.id}`}>
                        <span className={s.sw} style={{ background: THEME_COLOR[coverTheme(rel.category ?? article.category)] }} aria-hidden="true" />
                        <span>
                          <b>{relTitle}</b>
                          <small>
                            {relLevel ? `${relLevel}, ` : ''}phiên bản {relVersion?.version_no || 1}.0
                          </small>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className={s.muted}>Các khóa khác cùng lĩnh vực đang được chuẩn bị.</p>
              )}
              <p className={s.more}>
                <Link href="/learning/roadmaps">Xem lộ trình học &rarr;</Link>
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
