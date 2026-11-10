'use client';

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Category, Tag } from '@/types/content';
import { fetchCategories, fetchArticle, fetchTags } from '@/lib/contentClient';
import { api } from '@/lib/api';
import { getCurrentUser, setCurrentUser, subscribeCurrentUser, AuthUser } from '@/lib/auth';
import { getAccessToken } from '@/lib/authToken';
import { accountClient } from '@/lib/accountClient';
import { extractYouTubeVideoId } from '@/lib/videoUtils';
import YouTubeEmbed from '@/components/content/YouTubeEmbed';

const DRAFT_STORAGE_KEY = 'kh_course_editor_draft';
const LOCAL_STUDIO_DRAFT_KEY = 'kh_studio_course_draft_v2';

interface StoredDraft {
  title: string;
  slug: string;
  categoryId: string;
  tags: string[];
  content: string;
  isSlugLocked: boolean;
  savedAt: number;
}


function CodeBlockPreview({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard permission fallback
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

function CalloutPreview({
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
      title: title || 'Tip & Best Practice',
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
      <div style={{ color: styles.text, fontSize: '0.95rem', lineHeight: 1.65 }}>
        {children}
      </div>
    </div>
  );
}

function renderPreviewInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const matched = match[0];
    if (matched.startsWith('`') && matched.endsWith('`')) {
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
          {matched.slice(1, -1)}
        </code>
      );
    } else if (matched.startsWith('**') && matched.endsWith('**')) {
      parts.push(<strong key={`bold-${match.index}`}>{matched.slice(2, -2)}</strong>);
    } else if (matched.startsWith('*') && matched.endsWith('*')) {
      parts.push(<em key={`italic-${match.index}`}>{matched.slice(1, -1)}</em>);
    } else if (matched.startsWith('~~') && matched.endsWith('~~')) {
      parts.push(<del key={`del-${match.index}`}>{matched.slice(2, -2)}</del>);
    } else if (matched.startsWith('[') && matched.includes('](')) {
      const closingBracket = matched.indexOf('](');
      const linkText = matched.slice(1, closingBracket);
      const linkHref = matched.slice(closingBracket + 2, -1).trim();

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
            target="_blank"
            rel="noopener noreferrer"
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

function renderLivePreview(raw: string): React.ReactNode[] {
  const lines = raw.split('\n');
  const elements: React.ReactNode[] = [];

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
        <CodeBlockPreview
          key={`code-${i}`}
          code={codeBuffer.join('\n')}
          language={codeLanguage}
        />
      );
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('## ')) {
      const text = line.replace('## ', '').trim();
      const hId = getHeadingSlug(text, i, new Set());
      elements.push(
        <h2
          key={`h2-${i}`}
          id={hId}
          style={{
            color: 'var(--color-charcoal)',
            marginTop: '2.5rem',
            marginBottom: '1rem',
            borderBottom: '1.5px solid var(--color-border)',
            paddingBottom: '0.5rem',
            fontSize: '1.65rem',
            fontWeight: 800,
            scrollMarginTop: '1rem',
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
      const hId = getHeadingSlug(text, i, new Set());
      elements.push(
        <h3
          key={`h3-${i}`}
          id={hId}
          style={{
            color: 'var(--color-charcoal)',
            marginTop: '1.75rem',
            marginBottom: '0.75rem',
            fontSize: '1.3rem',
            fontWeight: 700,
            scrollMarginTop: '1rem',
          }}
        >
          {text}
        </h3>
      );
      i++;
      continue;
    }

    // Callout / Blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      let isNote = false;
      let isTip = false;
      let isWarning = false;

      const firstClean = line.replace(/^>\s*/, '');
      if (/^\[!(NOTE|IMPORTANT)\]/i.test(firstClean)) {
        isNote = true;
        const rest = firstClean.replace(/^\[!(NOTE|IMPORTANT)\]\s*/i, '').trim();
        if (rest) quoteLines.push(rest);
      } else if (/^\[!TIP\]/i.test(firstClean)) {
        isTip = true;
        const rest = firstClean.replace(/^\[!TIP\]\s*/i, '').trim();
        if (rest) quoteLines.push(rest);
      } else if (/^\[!(WARNING|CAUTION)\]/i.test(firstClean)) {
        isWarning = true;
        const rest = firstClean.replace(/^\[!(WARNING|CAUTION)\]\s*/i, '').trim();
        if (rest) quoteLines.push(rest);
      } else {
        quoteLines.push(firstClean);
      }

      i++;
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s*/, ''));
        i++;
      }

      const kind: 'note' | 'tip' | 'warning' | 'default' = isTip ? 'tip' : isWarning ? 'warning' : isNote ? 'note' : 'default';
      const titleText = isTip ? 'Tip & Best Practice' : isWarning ? 'Warning' : isNote ? 'Note' : undefined;

      elements.push(
        <CalloutPreview key={`quote-${i}`} kind={kind} title={titleText}>
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx} style={{ margin: qIdx > 0 ? '0.4rem 0 0 0' : 0, fontSize: '0.95rem', lineHeight: 1.65 }}>
              {renderPreviewInline(ql)}
            </p>
          ))}
        </CalloutPreview>
      );
      continue;
    }

    // Lists
    if (line.startsWith('* ') || line.startsWith('- ')) {
      elements.push(
        <li
          key={`li-${i}`}
          style={{
            marginLeft: '1.5rem',
            color: 'var(--color-charcoal)',
            marginBottom: '0.5rem',
            lineHeight: 1.65,
            fontSize: '1rem',
          }}
        >
          {renderPreviewInline(line.replace(/^[*-]\s+/, ''))}
        </li>
      );
      i++;
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---') {
      elements.push(<hr key={`hr-${i}`} style={{ borderColor: 'var(--color-border)', margin: '2rem 0' }} />);
      i++;
      continue;
    }

    // YouTube Embed (@[youtube](...) or standalone URL)
    const trimmed = line.trim();
    const ytSyntaxMatch = trimmed.match(/^@\[youtube\]\((.+?)\)$/i);
    const isStandaloneYt =
      !ytSyntaxMatch &&
      /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtube-nocookie\.com|youtu\.be)\/[^\s]+$/i.test(trimmed);

    if (ytSyntaxMatch || isStandaloneYt) {
      let rawTarget = trimmed;
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
    if (trimmed.length > 0) {
      elements.push(
        <p
          key={`p-${i}`}
          style={{
            color: 'var(--color-charcoal)',
            marginBottom: '1.25rem',
            lineHeight: 1.75,
            fontSize: '1.025rem',
          }}
        >
          {renderPreviewInline(line)}
        </p>
      );
    }

    i++;
  }

  return elements;
}

export default function ContributorCourseCreatePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser);
  const [authChecked, setAuthChecked] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugLocked, setIsSlugLocked] = useState(true);
  const [categoryId, setCategoryId] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['distributed-systems', 'algorithms']);
  const [tagInput, setTagInput] = useState('');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [taxonomyLoading, setTaxonomyLoading] = useState<boolean>(false);
  const [parentLoadError, setParentLoadError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [parentLoading, setParentLoading] = useState<boolean>(false);

  // Category hierarchy grouping (Domains and Sub-categories)
  const groupedCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    const topLevel = categories.filter((c) => !c.parent_id);
    const subCats = categories.filter((c) => !!c.parent_id);

    if (subCats.length > 0) {
      return topLevel.map((parent) => ({
        domainName: parent.name,
        parentId: parent.id,
        items: [
          parent,
          ...subCats.filter((s) => s.parent_id === parent.id),
        ],
      }));
    }

    // Flat categories: Group by domain discipline
    const domainMap: Record<string, Category[]> = {
      'Systems & Distributed Infrastructure': [],
      'Database Engineering & Storage Engines': [],
      'AI & Intelligent Learning Systems': [],
      'Architecture & General Engineering': [],
    };

    categories.forEach((cat) => {
      const lower = (cat.slug + ' ' + cat.name).toLowerCase();
      if (lower.includes('distribut') || lower.includes('system') || lower.includes('infra') || lower.includes('network')) {
        domainMap['Systems & Distributed Infrastructure'].push(cat);
      } else if (lower.includes('data') || lower.includes('db') || lower.includes('storage') || lower.includes('postgres')) {
        domainMap['Database Engineering & Storage Engines'].push(cat);
      } else if (lower.includes('ai') || lower.includes('learn') || lower.includes('companion') || lower.includes('model')) {
        domainMap['AI & Intelligent Learning Systems'].push(cat);
      } else {
        domainMap['Architecture & General Engineering'].push(cat);
      }
    });

    return Object.entries(domainMap)
      .filter(([_, list]) => list.length > 0)
      .map(([domainName, items]) => ({
        domainName,
        items,
      }));
  }, [categories]);



  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === categoryId) || null;
  }, [categories, categoryId]);
  const [content, setContent] = useState(
`## 1. Introduction & Video Lecture
Detail the systems background, failure modes, or architectural problem this course addresses.

@[youtube](https://www.youtube.com/watch?v=dQw4w9WgXcQ "Lecture 1: Distributed Systems Overview")

\`\`\`typescript
// Provide executable or concrete code examples
interface ConsensusNode {
  id: string;
  term: number;
  votedFor: string | null;
}
\`\`\`

## 2. Invariants & Operational Guarantees
List the mathematical or operational guarantees enforced by this architecture.

> [!NOTE]
> Operational Invariant: No state machine may execute state transitions out of global log order.
`
  );
  // Dynamic live Table of Contents tree extracted in real-time from markdown content
  const tocItems = useMemo(() => {
    if (!content) return [];
    const lines = content.split('\n');
    const items: { id: string; text: string; level: number; hasVideo?: boolean }[] = [];
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

        let hasVideo = /video|lecture|bài giảng/i.test(text);
        if (!hasVideo) {
          let inCodeFence = false;
          for (let j = idx + 1; j < lines.length; j++) {
            const next = lines[j].trim();
            if (next.startsWith('```')) {
              inCodeFence = !inCodeFence;
              continue;
            }
            if (inCodeFence) continue;
            if (next.startsWith('## ') || next.startsWith('### ')) break;
            if (
              next.match(/^@\[youtube\]\((.+?)\)$/i) ||
              /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtube-nocookie\.com|youtu\.be)\/[^\s]+$/i.test(next)
            ) {
              hasVideo = true;
              break;
            }
          }
        }

        items.push({ id, text, level: isH2 ? 2 : 3, hasVideo });
      }
    });

    return items;
  }, [content]);

  // Pre-flight Quality Standards Criteria
  const contentWordCount = useMemo(() => {
    return content.trim().split(/\s+/).filter(Boolean).length;
  }, [content]);

  const qualityChecks = useMemo(() => {
    const titleValid = title.trim().length >= 5 && title.trim().length <= 120;
    const categoryValid = Boolean(categoryId && categoryId.trim().length > 0);
    const tagsValid = selectedTags.length >= 1;
    const contentValid = contentWordCount >= 50;

    const items = [
      {
        id: 'title',
        label: 'Course title is between 5 and 120 characters',
        valid: titleValid,
        detail: `${title.trim().length}/120 characters`,
      },
      {
        id: 'category',
        label: 'Domain category is selected',
        valid: categoryValid,
        detail: selectedCategory ? selectedCategory.name : 'None selected',
      },
      {
        id: 'tags',
        label: 'At least 1 curriculum tag attached',
        valid: tagsValid,
        detail: `${selectedTags.length} tag(s)`,
      },
      {
        id: 'content',
        label: 'Substantive curriculum material (minimum 50 words)',
        valid: contentValid,
        detail: `${contentWordCount} words / 50 min`,
      },
    ];

    const passedCount = items.filter((i) => i.valid).length;
    const isAllPassed = passedCount === items.length;

    return { items, passedCount, totalCount: items.length, isAllPassed };
  }, [title, categoryId, selectedCategory, selectedTags, contentWordCount]);


    type ViewMode = 'split' | 'editor' | 'preview';
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [showCalloutDropdown, setShowCalloutDropdown] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<StoredDraft | null>(null);
  const [lastSavedNotice, setLastSavedNotice] = useState<string | null>(null);
  const [videoInputUrl, setVideoInputUrl] = useState('');
  const [videoCustomTitle, setVideoCustomTitle] = useState('');
  const [videoInsertNotice, setVideoInsertNotice] = useState<string | null>(null);

  const detectedVideoId = extractYouTubeVideoId(videoInputUrl);

  const CODE_TEMPLATES: Record<string, string> = {
    typescript: `// Provide executable TypeScript types or logic\ninterface ExampleNode {\n  id: string;\n  active: boolean;\n}`,
    python: `# Write Python implementation or algorithms\ndef process_node(node_id: str) -> bool:\n    return True`,
    sql: `-- Write transactional or analytical SQL query\nSELECT id, created_at, status\nFROM records\nWHERE status = 'active';`,
    bash: `# Run infrastructure or execution command\ndocker compose exec app php artisan migrate`,
    rust: `// Write concurrent or systems logic\nfn main() {\n    println!("KnowledgeHub Engine");\n}`,
    json: `{\n  "version": "1.0",\n  "status": "success"\n}`,
  };

  const handleInsertCallout = (kind: 'NOTE' | 'TIP' | 'WARNING') => {
    let snippet = '';
    if (kind === 'NOTE') {
      snippet = `\n\n> [!NOTE]\n> Note: Detail essential context, architecture invariants, or prerequisites here.\n\n`;
    } else if (kind === 'TIP') {
      snippet = `\n\n> [!TIP]\n> Best Practice: Recommended production setup, performance optimizations, or benchmarks.\n\n`;
    } else if (kind === 'WARNING') {
      snippet = `\n\n> [!WARNING]\n> Warning: High-risk operational caveats, breaking changes, or concurrency pitfalls.\n\n`;
    }
    insertMarkdown(snippet, '', '');
    setShowCalloutDropdown(false);
  };

  const handleInsertCodeBlock = (lang: string) => {
    const template = CODE_TEMPLATES[lang.toLowerCase()] || '// Write code here';
    insertMarkdown(`\n\n\`\`\`${lang.toLowerCase()}\n${template}\n\`\`\`\n\n`, '', '');
    setShowCodeDropdown(false);
  };

  const insertMarkdown = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => `${prev}\n\n${prefix}${defaultText}${suffix}\n\n`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || defaultText;
    const before = content.substring(0, start);
    const after = content.substring(end);
    const replacement = `${prefix}${selected}${suffix}`;
    const nextContent = before + replacement + after;
    setContent(nextContent);
    setTimeout(() => {
      textarea.focus();
      const newStart = start + prefix.length;
      const newEnd = newStart + selected.length;
      textarea.setSelectionRange(newStart, newEnd);
    }, 25);
  };

  const handleInsertVideo = () => {
    if (!detectedVideoId) return;
    const cleanUrl = videoInputUrl.trim();
    const cleanTitle = videoCustomTitle.trim();
    const snippet = cleanTitle
      ? `\n\n@[youtube](${cleanUrl || detectedVideoId} "${cleanTitle}")\n\n`
      : `\n\n@[youtube](${cleanUrl || detectedVideoId})\n\n`;

    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = content.substring(0, start);
      const after = content.substring(end);
      const nextContent = before + snippet + after;
      setContent(nextContent);
      setTimeout(() => {
        textarea.focus();
        const newPos = start + snippet.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 50);
    } else {
      setContent((prev) => `${prev.trim()}${snippet}`);
    }

    setVideoInputUrl('');
    setVideoCustomTitle('');
    setShowVideoModal(false);
    setVideoInsertNotice(`Embedded YouTube video (${detectedVideoId}) added to lecture content.`);
    setTimeout(() => setVideoInsertNotice(null), 4000);
  };

  useEffect(() => {
    return subscribeCurrentUser(() => setUser(getCurrentUser()));
  }, []);

  useEffect(() => {
    const authBearer = getAccessToken();
    const currentUser = getCurrentUser();

    if (!authBearer && !currentUser) {
      router.push('/login?redirect=/courses/create');
      return;
    }

    if (!currentUser && authBearer) {
      accountClient
        .me()
        .then((res) => {
          setCurrentUser(res.data.user);
          setUser(res.data.user);
          setAuthChecked(true);
        })
        .catch(() => {
          router.push('/login?redirect=/courses/create');
        });
    } else {
      setUser(currentUser);
      setAuthChecked(true);
    }
  }, [router]);

  const loadTaxonomy = useCallback(async () => {
    setTaxonomyLoading(true);
    setTaxonomyError(null);
    try {
      const [cats, tagsList] = await Promise.all([fetchCategories(), fetchTags()]);
      setCategories(cats);
      if (cats.length > 0) {
        // Keep a category restored from a saved draft; otherwise default to the first one.
        setCategoryId((prev) => prev || cats[0].id);
      }
      setAvailableTags(tagsList || []);
    } catch (err: unknown) {
      setTaxonomyError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to load categories and tags from KnowledgeHub API.'
      );
    } finally {
      setTaxonomyLoading(false);
    }
  }, []);

  /**
   * Prefills the editor from the parent course in revision mode (`?parent_id=`).
   * Failures are surfaced so a revision is never silently written from scratch.
   */
  const loadParentCourse = useCallback(async (pid: string) => {
    setParentLoading(true);
    setParentLoadError(null);
    try {
      const art = await fetchArticle(pid);
      if (!art) {
        setParentLoadError({
          message: 'Parent course not found. It may have been deleted or the link is incorrect.',
          retryable: false,
        });
        return;
      }
      const v = art.published_version || art.latest_version;
      if (v) {
        // Prefill only empty fields so a late response never overwrites what the author already typed or restored.
        setTitle((prev) => (prev.trim() ? prev : `Revision: ${v.title}`));
        setContent((prev) => (prev.trim() ? prev : v.content));
      }
      if (art.category_id) {
        setCategoryId(art.category_id);
      }
    } catch (err: unknown) {
      const detail = err instanceof Error && err.message ? err.message : 'Unknown error.';
      setParentLoadError({
        message: `Could not load the course being revised: ${detail}`,
        retryable: true,
      });
    } finally {
      setParentLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTaxonomy();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // Restore draft if saved before sign-in redirect
      const savedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed.title) setTitle(parsed.title);
          if (parsed.slug) setSlug(parsed.slug);
          if (parsed.categoryId) setCategoryId(parsed.categoryId);
          if (parsed.tags) {
            if (Array.isArray(parsed.tags)) {
              setSelectedTags(parsed.tags);
            } else if (typeof parsed.tags === 'string') {
              setSelectedTags(parsed.tags.split(',').map((t: string) => t.trim()).filter(Boolean));
            }
          }
          if (parsed.content) setContent(parsed.content);
        } catch {
          // ignore corrupted draft
        }
      }

      // Check for local auto-saved draft
      try {
        const rawLocal = localStorage.getItem(LOCAL_STUDIO_DRAFT_KEY);
        if (rawLocal) {
          const parsedLocal: StoredDraft = JSON.parse(rawLocal);
          if (parsedLocal && (parsedLocal.title || parsedLocal.content?.length > 100)) {
            setPendingDraft(parsedLocal);
          }
        }
      } catch {
        // ignore storage parse error
      }

      const pid = params.get('parent_id');
      if (pid) {
        setParentId(pid);
        loadParentCourse(pid);
      }
    }
  }, [loadTaxonomy, loadParentCourse]);

  // Auto-save draft every 20 seconds if title or content exists and no draft restore prompt is pending
  useEffect(() => {
    // Keep pending restore draft safe from being overwritten while prompt is open
    if (pendingDraft !== null) {
      return;
    }

    const timer = setInterval(() => {
      // Re-verify pendingDraft is null before writing
      if (pendingDraft !== null) {
        return;
      }
      if ((title.trim().length > 0 || content.trim().length > 50) && typeof window !== 'undefined') {
        const draftData: StoredDraft = {
          title,
          slug,
          categoryId,
          tags: selectedTags,
          content,
          isSlugLocked,
          savedAt: Date.now(),
        };
        try {
          localStorage.setItem(LOCAL_STUDIO_DRAFT_KEY, JSON.stringify(draftData));
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastSavedNotice(`Draft auto-saved at ${timeStr}`);
        } catch {
          // ignore localStorage quota error
        }
      }
    }, 20000);

    return () => clearInterval(timer);
  }, [pendingDraft, title, slug, categoryId, selectedTags, content, isSlugLocked]);

  const handleRestoreDraft = () => {
    if (!pendingDraft) return;
    if (pendingDraft.title) setTitle(pendingDraft.title);
    if (pendingDraft.slug) setSlug(pendingDraft.slug);
    if (pendingDraft.categoryId) setCategoryId(pendingDraft.categoryId);
    if (pendingDraft.tags && Array.isArray(pendingDraft.tags)) setSelectedTags(pendingDraft.tags);
    if (pendingDraft.content) setContent(pendingDraft.content);
    if (typeof pendingDraft.isSlugLocked === 'boolean') setIsSlugLocked(pendingDraft.isSlugLocked);
    setPendingDraft(null);
    setLastSavedNotice('Draft recovered successfully from local storage.');
    setTimeout(() => setLastSavedNotice(null), 4000);
  };

  const handleDiscardDraft = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STUDIO_DRAFT_KEY);
    }
    setPendingDraft(null);
  };

    const handleAddTag = (raw: string) => {
    const clean = raw
      .trim()
      .toLowerCase()
      .replace(/^#+/, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '');
    if (clean && !selectedTags.includes(clean)) {
      setSelectedTags((prev) => [...prev, clean]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const generateSlug = (val: string): string => {
    return val
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (isSlugLocked) {
      setSlug(generateSlug(val));
    }
  };

  /** True while revision mode cannot safely save (parent still loading or failed to load). */
  const isRevisionBlocked = Boolean(parentId && (parentLoading || parentLoadError));

  const resetToNewCourse = () => {
    setParentId(null);
    setParentLoadError(null);
    setParentLoading(false);
    setErrorMessage(null);
    setTitle('');
    setSlug('');
    setContent('');
    router.replace('/courses/create');
  };

  const handleSubmit = async (publish: boolean) => {
    if (parentId && parentLoading) {
      setErrorMessage('The course being revised is still loading. Please wait a moment before saving.');
      return;
    }

    if (parentId && parentLoadError) {
      setErrorMessage(
        'The course being revised could not be loaded, so this revision cannot be saved. Retry loading it or start a new course instead.'
      );
      return;
    }

    if (!title.trim() || !content.trim()) {
      setErrorMessage('Please provide both a course title and curriculum content body.');
      return;
    }

    if (publish && !qualityChecks.isAllPassed) {
      const confirmPublish = window.confirm(
        'Some pre-flight quality checks are not yet complete (title length, domain category, tags, or word count). Do you still wish to publish immediately?'
      );
      if (!confirmPublish) return;
    }

    const bearerSession = getAccessToken();
    if (!bearerSession) {
      setErrorMessage('Authentication session expired. Please sign in again to author course material.');
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    let redirectTarget = '/courses';

    try {
      if (parentId) {
        type VersionCreateResponse = {
          status: string;
          message: string;
          data?: { id: string; article_id: string; version_no: number };
        };
        const verRes = await api.post<VersionCreateResponse>(`/v1/articles/${parentId}/versions`, {
          title,
          content,
        });

        if (publish && verRes?.data?.id) {
          await api.post(`/v1/articles/${parentId}/publish`, {
            version_id: verRes.data.id,
          });
        }
        redirectTarget = `/courses/${parentId}`;
      } else {
        type ArticleCreateResponse = {
          status: string;
          message: string;
          data?: { id: string; slug: string; status: string };
        };

        const payload = {
          title,
          slug,
          category_id: categoryId || null,
          content,
          tags: selectedTags,
          status: publish ? undefined : 'draft',
        };

        const res = await api.post<ArticleCreateResponse>('/v1/articles', payload);

        const createdId = res?.data?.id;
        const finalSlug = res?.data?.slug || slug;

        if (publish && createdId) {
          await api.post(`/v1/articles/${createdId}/publish`, {});
        }

        if (finalSlug) {
          redirectTarget = `/courses/${finalSlug}`;
        } else if (createdId) {
          redirectTarget = `/courses/${createdId}`;
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string; errors?: Record<string, string[]> };
      if (errorObj?.status === 401 || errorObj?.message === 'Unauthenticated.') {
        setErrorMessage('Authentication session expired or unauthorized. Please sign in to your contributor account.');
      } else if (errorObj?.status && errorObj.status >= 400) {
        const firstErr = errorObj.errors ? Object.values(errorObj.errors)[0]?.[0] : undefined;
        setErrorMessage(firstErr || errorObj.message || 'Failed to save course. Please check your inputs.');
      } else {
        setErrorMessage(
          errorObj?.message || 'Network error or unable to reach API service. Your course draft has been preserved locally.'
        );
      }
      setIsSubmitting(false);
      return;
    }

    // Clear saved drafts ONLY upon confirmed successful save or publish
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STUDIO_DRAFT_KEY);
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    }

    setIsSubmitting(false);
    setSuccessMessage(
      parentId
        ? (publish ? 'New course version published successfully! Redirecting to course reader...' : 'Draft revision saved successfully! Redirecting to course reader...')
        : (publish ? 'Course successfully published to the KnowledgeHub platform! Redirecting to course reader...' : 'Course draft saved successfully! Redirecting to course reader...')
    );

    setTimeout(() => {
      router.push(redirectTarget);
    }, 1500);
  };

  const isContributorOrAdmin =
    user?.roles?.some((role) => role === 'contributor' || role === 'admin') ?? false;

  if (!authChecked) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--color-gray)' }}>
        Verifying contributor access...
      </div>
    );
  }

  if (!isContributorOrAdmin) {
    return (
      <div className="container" style={{ paddingTop: '5rem', maxWidth: 640, textAlign: 'center' }}>
        <div
          style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '3.5rem 2.5rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-charcoal)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Contributor & Administrator Access Required</h2>
          <p style={{ color: 'var(--color-gray)', lineHeight: 1.7, marginBottom: '2.25rem', fontSize: '1.025rem' }}>
            Your account currently has the standard User role. To maintain internal curriculum quality, only domain specialists (Contributors) or Administrators may author new courses. Please contact an Administrator to request Contributor privileges.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/courses" className="btn btn-primary" style={{ padding: '0.75rem 1.6rem', fontWeight: 600 }}>Back to Courses</Link>
            <Link href="/account" className="btn btn-secondary" style={{ padding: '0.75rem 1.6rem', fontWeight: 600 }}>View Account Privileges</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem', maxWidth: 1600, width: '100%' }}>
      <style>{`
        .studio-split-container {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 1.5rem;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .studio-split-container {
            grid-template-columns: 1fr;
          }
        }
        .studio-pane {
          max-height: calc(100vh - 120px);
          overflow-y: auto;
          scrollbar-width: thin;
        }
        @media (max-width: 1024px) {
          .studio-pane {
            max-height: none;
          }
        }
      `}</style>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
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
              Contributor Studio
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-gray)' }}>— Side-by-Side Live Course Studio</span>
          </div>
          <h1 style={{ color: 'var(--color-charcoal)', fontSize: '2rem', fontWeight: 800, margin: 0 }}>Course Authoring Studio</h1>
        </div>

        {/* View Mode Switcher: Split View | Focus Editor | Full Preview */}
        <div
          role="tablist"
          aria-label="Studio View Mode"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#F1F5F9',
            padding: '3px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            gap: '2px',
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'split'}
            onClick={() => setViewMode('split')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'calc(var(--radius-md) - 2px)',
              border: 'none',
              backgroundColor: viewMode === 'split' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'split' ? '#FFFFFF' : 'var(--color-charcoal)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: viewMode === 'split' ? 'var(--shadow-xs)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            <span>Split View</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'editor'}
            onClick={() => setViewMode('editor')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'calc(var(--radius-md) - 2px)',
              border: 'none',
              backgroundColor: viewMode === 'editor' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'editor' ? '#FFFFFF' : 'var(--color-charcoal)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: viewMode === 'editor' ? 'var(--shadow-xs)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span>Focus Editor</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'preview'}
            onClick={() => setViewMode('preview')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'calc(var(--radius-md) - 2px)',
              border: 'none',
              backgroundColor: viewMode === 'preview' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'preview' ? '#FFFFFF' : 'var(--color-charcoal)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: viewMode === 'preview' ? 'var(--shadow-xs)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Full Preview</span>
          </button>
        </div>
      </div>

      {/* Auto-Save Draft Recovery Banner */}
      {pendingDraft && (
        <div
          role="region"
          aria-label="Draft Recovery"
          style={{
            marginBottom: '1.25rem',
            padding: '1rem 1.25rem',
            background: '#EFF6FF',
            border: '1.5px solid #93C5FD',
            borderRadius: 'var(--radius-md)',
            color: '#1E40AF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <div>
              <span style={{ fontWeight: 700 }}>Unsaved Draft Found:</span>{' '}
              <span>&ldquo;{pendingDraft.title || 'Untitled Draft'}&rdquo; (auto-saved on {new Date(pendingDraft.savedAt).toLocaleTimeString()}). Would you like to recover your work?</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="btn btn-primary"
              style={{ padding: '0.4rem 0.95rem', fontSize: '0.82rem' }}
            >
              Restore Draft
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.82rem',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-white)',
                color: 'var(--color-charcoal)',
                borderRadius: 'var(--radius-sm, 6px)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {lastSavedNotice && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.45rem 0.85rem',
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 'var(--radius-md)',
            color: '#166534',
            fontSize: '0.8rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{lastSavedNotice}</span>
        </div>
      )}

      {parentId && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '0.85rem 1.25rem',
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
            borderRadius: 'var(--radius-md)',
            color: '#0369A1',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontWeight: 700 }}>Draft Revision Mode:</span> Creating a new version snapshot for parent course ID: <code>{parentId}</code>
        </div>
      )}

      {parentId && parentLoadError && (
        <div
          role="alert"
          style={{
            background: 'var(--color-primary-faint)',
            border: '1px solid var(--color-primary-pale)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.5rem',
            color: 'var(--color-charcoal)',
            marginBottom: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <span>
            <strong style={{ color: 'var(--color-primary)' }}>{parentLoadError.message}</strong>
            <span style={{ display: 'block', color: 'var(--color-gray)', marginTop: '0.25rem' }}>
              {parentLoadError.retryable
                ? 'Please check your connection or try again. Saving is disabled until the course loads.'
                : 'Saving is disabled for this revision. Start a new course instead.'}
            </span>
          </span>
          {parentLoadError.retryable ? (
            <button
              type="button"
              onClick={() => loadParentCourse(parentId)}
              disabled={parentLoading}
              aria-busy={parentLoading}
              className="btn btn-primary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              {parentLoading ? 'Retrying...' : 'Retry'}
            </button>
          ) : (
            <button
              type="button"
              onClick={resetToNewCourse}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              Start a New Course
            </button>
          )}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.5rem',
            color: '#B91C1C',
            marginBottom: '1.5rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <span>{errorMessage}</span>
          {(errorMessage.toLowerCase().includes('sign in') || errorMessage.toLowerCase().includes('authenticat')) && (
            <Link
              href={`/login?redirect=${encodeURIComponent(parentId ? `/courses/create?parent_id=${parentId}` : '/courses/create')}`}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem(
                    DRAFT_STORAGE_KEY,
                    JSON.stringify({ title, slug, categoryId, tags: selectedTags, content })
                  );
                }
              }}
              className="btn btn-primary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              Sign In
            </Link>
          )}
        </div>
      )}

      {taxonomyError && (
        <div
          role="alert"
          style={{
            background: 'var(--color-primary-faint)',
            border: '1px solid var(--color-primary-pale)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.5rem',
            color: 'var(--color-charcoal)',
            marginBottom: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <span>
            <strong style={{ color: 'var(--color-primary)' }}>Categories and tags could not be loaded.</strong>{' '}
            {taxonomyError}
            <span style={{ display: 'block', color: 'var(--color-gray)', marginTop: '0.25rem' }}>
              Please check your connection or try again. You need a category before you can publish.
            </span>
          </span>
          <button
            type="button"
            onClick={() => loadTaxonomy()}
            disabled={taxonomyLoading}
            aria-busy={taxonomyLoading}
            className="btn btn-primary"
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          >
            {taxonomyLoading ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      )}

      {successMessage && (
        <div
          style={{
            background: '#EBF5EE',
            border: '1px solid #D2EBD9',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.5rem',
            color: '#1B6E34',
            marginBottom: '1.5rem',
            fontWeight: 600,
          }}
        >
          {successMessage} Redirecting to explorer...
        </div>
      )}

      {/* Main Studio Dynamic Layout */}
      <div
        className={viewMode === 'split' ? 'studio-split-container' : undefined}
        style={{
          display: viewMode === 'split' ? undefined : 'flex',
          justifyContent: 'center',
          maxWidth: viewMode === 'split' ? '100%' : viewMode === 'editor' ? '1080px' : '960px',
          margin: '0 auto',
        }}
      >
        {/* Left Column: Builder Controls & Form */}
        <div
          className="studio-pane"
          style={{
            display: viewMode === 'preview' ? 'none' : 'block',
            width: viewMode === 'editor' ? '100%' : undefined,
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-charcoal)' }}>
                Course Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g., Foundations of Database Storage Engines"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-white)',
                  border: '1.5px solid var(--color-border)',
                  color: 'var(--color-charcoal)',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-charcoal)', margin: 0 }}>
                  Domain Category *
                </label>
                {selectedCategory && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                    #{selectedCategory.slug}
                  </span>
                )}
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-white)',
                  border: '1.5px solid var(--color-border)',
                  color: 'var(--color-charcoal)',
                  fontSize: '0.925rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="" disabled>-- Select curriculum domain --</option>
                {groupedCategories.map((group) => (
                  <optgroup key={group.domainName} label={`Domain: ${group.domainName}`}>
                    {group.items.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.parent_id ? `  ↳ ${cat.name}` : `• ${cat.name}`}
                        {cat.articles_count ? ` (${cat.articles_count} courses)` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-charcoal)', margin: 0 }}>
                  Canonical Slug URL *
                </label>
                <button
                  type="button"
                  onClick={() => setIsSlugLocked((prev) => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0.1rem 0.35rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: isSlugLocked ? 'var(--color-primary)' : '#059669',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                  title={isSlugLocked ? "Slug is locked and synchronized with title. Click to edit manually." : "Slug is unlocked. Click to re-lock to title."}
                >
                  {isSlugLocked ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span>Auto-locked</span>
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                      </svg>
                      <span>Custom override</span>
                    </>
                  )}
                </button>
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={slug}
                  readOnly={isSlugLocked}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
                  placeholder="e.g. database-storage-engines"
                  style={{
                    width: '100%',
                    padding: '0.75rem 2.5rem 0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: isSlugLocked ? '#F8FAFC' : 'var(--color-white)',
                    border: isSlugLocked ? '1.5px solid var(--color-border)' : '1.5px solid var(--color-primary)',
                    color: isSlugLocked ? 'var(--color-gray)' : 'var(--color-charcoal)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all var(--transition-fast)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setIsSlugLocked((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: isSlugLocked ? 'var(--color-primary)' : '#059669',
                    padding: '0.2rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={isSlugLocked ? "Unlock to manually customize slug URL" : "Lock to auto-generate from title"}
                >
                  {isSlugLocked ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-charcoal)', margin: 0 }}>
                  Curriculum Tags ({selectedTags.length}) *
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-gray)' }}>Type & press Enter or comma</span>
              </div>

              {/* Tag Chips Box */}
              <div
                style={{
                  minHeight: '44px',
                  padding: '0.4rem 0.6rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-white)',
                  border: '1.5px solid var(--color-border)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {selectedTags.map((t) => (
                  <span
                    key={t}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: 'var(--color-primary-pale, #F3E5E5)',
                      color: 'var(--color-primary, #8B0000)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-full, 9999px)',
                      padding: '0.2rem 0.6rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    <span>#{t}</span>
                    <button
                      type="button"
                      aria-label={`Remove tag ${t}`}
                      onClick={() => handleRemoveTag(t)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-primary)',
                        padding: '0 0.1rem',
                        fontSize: '0.95rem',
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      &times;
                    </button>
                  </span>
                ))}

                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                  onBlur={() => {
                    if (tagInput.trim()) {
                      handleAddTag(tagInput);
                    }
                  }}
                  placeholder={selectedTags.length === 0 ? "Type tag and press Enter (e.g. consensus)..." : "Add tag..."}
                  style={{
                    flex: '1 1 120px',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.875rem',
                    color: 'var(--color-charcoal)',
                    background: 'transparent',
                    padding: '0.25rem 0.35rem',
                  }}
                />
              </div>

              {/* Tag Suggestions from DB */}
              {availableTags.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-gray)', fontWeight: 600 }}>Suggestions:</span>
                  {availableTags
                    .filter((at) => !selectedTags.includes(at.slug || at.name.toLowerCase()))
                    .slice(0, 6)
                    .map((at) => {
                      const tagSlug = at.slug || at.name.toLowerCase();
                      return (
                        <button
                          key={at.id || tagSlug}
                          type="button"
                          onClick={() => handleAddTag(tagSlug)}
                          style={{
                            background: '#F8FAFC',
                            border: '1px dashed var(--color-border)',
                            borderRadius: 'var(--radius-full, 9999px)',
                            padding: '0.15rem 0.5rem',
                            fontSize: '0.72rem',
                            color: 'var(--color-charcoal)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            transition: 'all var(--transition-fast)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                            e.currentTarget.style.color = 'var(--color-primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                            e.currentTarget.style.color = 'var(--color-charcoal)';
                          }}
                        >
                          <span>+</span>
                          <span>#{at.name}</span>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Content Body Editor */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-charcoal)', margin: 0 }}>
                Curriculum Body (Markdown & Code Supported) *
              </label>

              <div style={{ fontSize: '0.78rem', color: 'var(--color-gray)' }}>
                <span>Markdown + Dracula Code + Alerts + YouTube Embed</span>
              </div>
            </div>

            {videoInsertNotice && (
              <div
                style={{
                  marginBottom: '0.75rem',
                  padding: '0.55rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#065F46',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{videoInsertNotice}</span>
              </div>
            )}

            {showVideoModal && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-off-white, #FAF7F5)',
                  border: '1.5px solid #FECACA',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#E11D48">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                      <polygon points="9.545 15.568 15.818 12 9.545 8.432" fill="white" />
                    </svg>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-charcoal)' }}>
                      Embed YouTube Lecture Video
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVideoModal(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-gray)',
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      padding: '0.2rem 0.4rem',
                      lineHeight: 1,
                    }}
                  >
                    &times;
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '0.35rem' }}>
                      YouTube URL or Video ID *
                    </label>
                    <input
                      type="text"
                      value={videoInputUrl}
                      onChange={(e) => setVideoInputUrl(e.target.value)}
                      placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/dQw4w9WgXcQ"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: 'var(--radius-sm, 6px)',
                        border: '1.5px solid var(--color-border)',
                        background: 'var(--color-white)',
                        fontSize: '0.875rem',
                        outline: 'none',
                        color: 'var(--color-charcoal)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '0.35rem' }}>
                      Lecture Video Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={videoCustomTitle}
                      onChange={(e) => setVideoCustomTitle(e.target.value)}
                      placeholder="e.g. Lecture 1: Distributed Consensus Introduction"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: 'var(--radius-sm, 6px)',
                        border: '1.5px solid var(--color-border)',
                        background: 'var(--color-white)',
                        fontSize: '0.875rem',
                        outline: 'none',
                        color: 'var(--color-charcoal)',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {detectedVideoId ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <img
                          src={`https://img.youtube.com/vi/${detectedVideoId}/mqdefault.jpg`}
                          alt="Video thumbnail preview"
                          style={{ width: '48px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                        />
                        <div style={{ fontSize: '0.8rem', color: '#059669' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Valid Video: <code>{detectedVideoId}</code>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: videoInputUrl.trim() ? '#DC2626' : 'var(--color-gray)' }}>
                        {videoInputUrl.trim() ? 'Invalid YouTube URL or ID format' : 'Paste YouTube URL or ID'}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowVideoModal(false)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: 'var(--radius-sm, 6px)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-white)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: 'var(--color-charcoal)',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!detectedVideoId}
                      onClick={handleInsertVideo}
                      style={{
                        padding: '0.45rem 0.95rem',
                        borderRadius: 'var(--radius-sm, 6px)',
                        border: 'none',
                        backgroundColor: detectedVideoId ? '#E11D48' : 'var(--color-border)',
                        color: 'white',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: detectedVideoId ? 'pointer' : 'not-allowed',
                        transition: 'background-color var(--transition-fast)',
                      }}
                    >
                      Insert into Lecture
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Curriculum Quick Actions Toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.25rem',
                padding: '0.45rem 0.65rem',
                backgroundColor: '#F8FAFC',
                border: '1.5px solid var(--color-border)',
                borderBottom: 'none',
                borderTopLeftRadius: 'var(--radius-md)',
                borderTopRightRadius: 'var(--radius-md)',
              }}
            >
              <button
                type="button"
                title="Major Section (H2)"
                onClick={() => insertMarkdown('\n\n## ', '\n', 'Major Section Title')}
                style={{
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-white)',
                  color: 'var(--color-charcoal)',
                  cursor: 'pointer',
                }}
              >
                H2
              </button>

              <button
                type="button"
                title="Sub-section (H3)"
                onClick={() => insertMarkdown('\n\n### ', '\n', 'Sub-section Title')}
                style={{
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-white)',
                  color: 'var(--color-charcoal)',
                  cursor: 'pointer',
                }}
              >
                H3
              </button>

              <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--color-border)', margin: '0 0.25rem' }} />

              <button
                type="button"
                title="Bold (**text**)"
                onClick={() => insertMarkdown('**', '**', 'bold text')}
                style={{
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-white)',
                  color: 'var(--color-charcoal)',
                  cursor: 'pointer',
                  minWidth: '28px',
                }}
              >
                B
              </button>

              <button
                type="button"
                title="Italic (*text*)"
                onClick={() => insertMarkdown('*', '*', 'italic text')}
                style={{
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.82rem',
                  fontStyle: 'italic',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-white)',
                  color: 'var(--color-charcoal)',
                  cursor: 'pointer',
                  minWidth: '28px',
                }}
              >
                I
              </button>

              <button
                type="button"
                title="Strikethrough (~~text~~)"
                onClick={() => insertMarkdown('~~', '~~', 'strikethrough text')}
                style={{
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.82rem',
                  textDecoration: 'line-through',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-white)',
                  color: 'var(--color-charcoal)',
                  cursor: 'pointer',
                  minWidth: '28px',
                }}
              >
                S
              </button>

              <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--color-border)', margin: '0 0.25rem' }} />

              <button
                type="button"
                title="Bullet List (- item)"
                onClick={() => insertMarkdown('\n- ', '\n- Item 2\n', 'Item 1')}
                style={{
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-white)',
                  color: 'var(--color-charcoal)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <circle cx="3.5" cy="6" r="1.5" fill="currentColor" />
                  <circle cx="3.5" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="3.5" cy="18" r="1.5" fill="currentColor" />
                </svg>
                <span>List</span>
              </button>

              <button
                type="button"
                title="Blockquote (> text)"
                onClick={() => insertMarkdown('\n> ', '\n', 'Key invariant or operational quote')}
                style={{
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-white)',
                  color: 'var(--color-charcoal)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                  <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                </svg>
                <span>Quote</span>
              </button>

              <button
                type="button"
                title="Divider line (---)"
                onClick={() => insertMarkdown('\n\n---\n\n', '', '')}
                style={{
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-white)',
                  color: 'var(--color-charcoal)',
                  cursor: 'pointer',
                }}
              >
                ---
              </button>

              <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--color-border)', margin: '0 0.25rem' }} />

              {/* Code Block Inserter with Multi-Language Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  title="Insert Multi-Language Code Block"
                  onClick={() => setShowCodeDropdown((prev) => !prev)}
                  style={{
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: showCodeDropdown ? '#E2E8F0' : 'var(--color-white)',
                    color: 'var(--color-charcoal)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  <span>Code Block</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showCodeDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      backgroundColor: 'var(--color-white)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.1))',
                      zIndex: 100,
                      minWidth: '150px',
                      overflow: 'hidden',
                      padding: '0.3rem 0',
                    }}
                  >
                    {[
                      { lang: 'typescript', label: 'TypeScript' },
                      { lang: 'python', label: 'Python' },
                      { lang: 'sql', label: 'SQL' },
                      { lang: 'bash', label: 'Bash' },
                      { lang: 'rust', label: 'Rust' },
                      { lang: 'json', label: 'JSON' },
                    ].map((item) => (
                      <button
                        key={item.lang}
                        type="button"
                        onClick={() => handleInsertCodeBlock(item.lang)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.45rem 0.85rem',
                          background: 'none',
                          border: 'none',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          color: 'var(--color-charcoal)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <span>{item.label}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-gray)', fontFamily: 'var(--font-mono)' }}>
                          .{item.lang === 'typescript' ? 'ts' : item.lang === 'python' ? 'py' : item.lang}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Callout Box Inserter with Alert Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  title="Insert Callout or Alert Box"
                  onClick={() => setShowCalloutDropdown((prev) => !prev)}
                  style={{
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: showCalloutDropdown ? '#E2E8F0' : 'var(--color-white)',
                    color: 'var(--color-charcoal)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>Callout Box</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showCalloutDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      backgroundColor: 'var(--color-white)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.1))',
                      zIndex: 100,
                      minWidth: '180px',
                      overflow: 'hidden',
                      padding: '0.3rem 0',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleInsertCallout('NOTE')}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem 0.85rem',
                        background: 'none',
                        border: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#1E40AF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
                      <span>Note ([!NOTE])</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInsertCallout('TIP')}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem 0.85rem',
                        background: 'none',
                        border: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#065F46',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ECFDF5')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                      <span>Tip & Best Practice</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInsertCallout('WARNING')}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem 0.85rem',
                        background: 'none',
                        border: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#92400E',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFFBEB')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                      <span>Warning ([!WARNING])</span>
                    </button>
                  </div>
                )}
              </div>

              <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--color-border)', margin: '0 0.25rem' }} />

              {/* YouTube Video Inserter Button */}
              <button
                type="button"
                title="Embed YouTube Lecture Video"
                onClick={() => setShowVideoModal((prev) => !prev)}
                style={{
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: '1px solid #FECACA',
                  backgroundColor: showVideoModal ? '#FEE2E2' : '#FFF1F2',
                  color: '#BE123C',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                  <polygon points="9.545 15.568 15.818 12 9.545 8.432" fill="white" />
                </svg>
                <span>YouTube Video</span>
              </button>
            </div>

            <textarea
              ref={textareaRef}
              rows={18}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your curriculum in markdown..."
              style={{
                width: '100%',
                padding: '1.25rem',
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderBottomLeftRadius: 'var(--radius-md)',
                borderBottomRightRadius: 'var(--radius-md)',
                background: 'var(--color-white)',
                border: '1.5px solid var(--color-border)',
                borderTop: 'none',
                color: 'var(--color-charcoal)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.925rem',
                lineHeight: 1.6,
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Pre-flight Quality Standards Checklist */}
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '1.25rem',
              backgroundColor: '#F8FAFC',
              border: qualityChecks.isAllPassed ? '1.5px solid #86EFAC' : '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              transition: 'all var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={qualityChecks.isAllPassed ? '#16A34A' : 'var(--color-primary)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-charcoal)' }}>
                  Pre-flight Quality Checklist
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: qualityChecks.isAllPassed ? '#DCFCE7' : '#FEF3C7',
                  color: qualityChecks.isAllPassed ? '#15803D' : '#B45309',
                  border: qualityChecks.isAllPassed ? '1px solid #BBF7D0' : '1px solid #FDE68A',
                }}
              >
                {qualityChecks.passedCount}/{qualityChecks.totalCount} Standards Met{qualityChecks.isAllPassed ? ' · Ready to Publish' : ''}
              </span>
            </div>

            {/* Quality Progress Meter */}
            <div
              style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#E2E8F0',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  width: `${(qualityChecks.passedCount / qualityChecks.totalCount) * 100}%`,
                  height: '100%',
                  backgroundColor: qualityChecks.isAllPassed ? '#22C55E' : '#EAB308',
                  transition: 'width 300ms ease-out',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
              {qualityChecks.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                    color: item.valid ? 'var(--color-charcoal)' : 'var(--color-gray)',
                  }}
                >
                  <div style={{ marginTop: '2px' }}>
                    {item.valid ? (
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: '#22C55E',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    ) : (
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          border: '1.5px solid #CBD5E1',
                          backgroundColor: 'var(--color-white)',
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: item.valid ? 600 : 500 }}>{item.label}</div>
                    <div style={{ fontSize: '0.72rem', color: item.valid ? '#16A34A' : 'var(--color-gray-light)' }}>
                      {item.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border-light)', paddingTop: '1.25rem' }}>
            <Link href="/courses" className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
              Cancel
            </Link>

            <div style={{ display: 'flex', gap: '0.85rem' }}>
              <button
                type="button"
                disabled={isSubmitting || isRevisionBlocked}
                onClick={() => handleSubmit(false)}
                className="btn btn-secondary"
                style={{ fontSize: '0.875rem' }}
              >
                Save as Draft
              </button>

              <button
                type="button"
                disabled={isSubmitting || isRevisionBlocked}
                onClick={() => handleSubmit(true)}
                className="btn btn-primary"
                style={{ fontSize: '0.875rem' }}
              >
                {isSubmitting ? 'Publishing...' : 'Publish to Platform (Direct)'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Student Reader Preview */}
        <div
          className="studio-pane"
          style={{
            display: viewMode === 'editor' ? 'none' : 'block',
            width: viewMode === 'preview' ? '100%' : undefined,
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Breadcrumbs matching Student Reader */}
          <nav aria-label="Student Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-gray)', marginBottom: '1.25rem' }}>
            <span style={{ color: 'var(--color-gray)' }}>Courses</span>
            <span style={{ color: 'var(--color-gray-light)' }}>/</span>
            <span style={{ color: 'var(--color-charcoal)', fontWeight: 500 }}>
              {selectedCategory ? selectedCategory.name : 'Curriculum Domain'}
            </span>
            <span style={{ color: 'var(--color-gray-light)' }}>/</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
              {title || 'Current Course'}
            </span>
          </nav>

          {/* Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
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
              Version {parentId ? 'Revision' : '1.0'}
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
            <span
              style={{
                backgroundColor: '#F1F5F9',
                color: '#475569',
                border: '1px solid var(--color-border)',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.15rem 0.55rem',
                borderRadius: 'var(--radius-full)',
              }}
            >
              Live Student Preview
            </span>
          </div>

          {/* Course Title H1 */}
          <h1 style={{ color: 'var(--color-charcoal)', fontSize: 'clamp(1.75rem, 2.5vw, 2.25rem)', fontWeight: 800, marginBottom: '1.25rem', lineHeight: 1.25, letterSpacing: '-0.02em' }}>
            {title || 'Untitled Course Material'}
          </h1>

          {/* Contributor Author Block & Sync Info */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              color: 'var(--color-gray)',
              fontSize: '0.875rem',
              paddingBottom: '1.5rem',
              marginBottom: '1.75rem',
              borderBottom: '1px solid var(--color-border-light)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'var(--color-primary-pale)',
                  border: '1.5px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                {user?.name ? user.name[0].toUpperCase() : 'C'}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>
                  {user?.name || 'Contributor / Domain Lead'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-gray)' }}>
                  Draft Preview · Synchronized live
                </div>
              </div>
            </div>

            {selectedTags.length > 0 && (
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {selectedTags.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-gray)',
                      backgroundColor: '#F8FAFC',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic Live Table of Contents Preview */}
          {tocItems.length > 0 ? (
            <div
              style={{
                marginBottom: '2rem',
                padding: '1.25rem 1.5rem',
                backgroundColor: '#F8FAFC',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.85rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-charcoal)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                  <span>Curriculum Table of Contents ({tocItems.length})</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-gray)' }}>Live outline sync</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {tocItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      paddingLeft: item.level === 3 ? '1.25rem' : '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontSize: item.level === 2 ? '0.85rem' : '0.8rem',
                    }}
                  >
                    <span style={{ color: item.level === 2 ? 'var(--color-primary)' : 'var(--color-gray)' }}>
                      {item.level === 2 ? '•' : '↳'}
                    </span>
                    <a
                      href={`#${item.id}`}
                      style={{
                        color: 'var(--color-charcoal)',
                        textDecoration: 'none',
                        fontWeight: item.level === 2 ? 600 : 400,
                        transition: 'color var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-charcoal)')}
                    >
                      {item.text}
                    </a>
                    {item.hasVideo && (
                      <span
                        style={{
                          backgroundColor: '#FEE2E2',
                          color: '#BE123C',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        Lecture Video
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#F8FAFC',
                border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-gray)',
                fontSize: '0.8rem',
                textAlign: 'center',
              }}
            >
              Tip: Add <code>## Major Section</code> and <code>### Sub-section</code> headings to automatically build the lecture Table of Contents.
            </div>
          )}

          <div>{renderLivePreview(content)}</div>
        </div>
      </div>
    </div>
  );
}
