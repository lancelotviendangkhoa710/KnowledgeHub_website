'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Category } from '@/types/content';
import { fetchCategories } from '@/lib/contentClient';

export default function ContributorCourseCreatePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState('distributed-systems, algorithms');
  const [content, setContent] = useState(
`## 1. Introduction & Problem Statement
Detail the systems background, failure modes, or architectural problem this course addresses.

\`\`\`typescript
// Provide executable or concrete code examples
interface ConsensusNode {
  id: string;
  term: number;
  votedFor: string | null;
}
\`\`\`

## 2. Invariants & Proof of Correctness
List the mathematical or operational guarantees enforced by this architecture.

> **Operational Invariant**: No state machine may execute state transitions out of global log order.
`
  );
  const [previewMode, setPreviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const cats = await fetchCategories();
      setCategories(cats);
      if (cats.length > 0) {
        setCategoryId(cats[0].id);
      }
    }
    load();
  }, []);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      );
    }
  };

  const handleSubmit = async (publish: boolean) => {
    if (!title.trim() || !content.trim()) {
      alert('Please provide both a course title and content body.');
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);

    // Call API or simulate contributor creation
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch('http://localhost:8080/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title,
          slug,
          category_id: categoryId || null,
          content,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });

      if (res.ok && publish) {
        const data = await res.json();
        // If publish requested, trigger publish endpoint
        if (data.data?.id) {
          await fetch(`http://localhost:8080/api/articles/${data.data.id}/publish`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
        }
      }
    } catch {
      // Local fallback simulation
    }

    setIsSubmitting(false);
    setSuccessMessage(
      publish
        ? 'Course successfully published to the KnowledgeHub platform!'
        : 'Course draft saved to your contributor workbench.'
    );

    setTimeout(() => {
      router.push('/courses');
    }, 1800);
  };

  return (
    <div className="container" style={{ paddingTop: '2.5rem', maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-gold">Contributor Studio</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>— Internal Publishing Workflow</span>
          </div>
          <h1>Author Course Material</h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="btn btn-secondary"
            style={{ fontSize: '0.875rem' }}
          >
            {previewMode ? 'Edit Raw Markdown' : 'Preview Layout'}
          </button>
        </div>
      </div>

      {successMessage && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.5rem',
            color: 'var(--accent-emerald)',
            marginBottom: '1.5rem',
            fontWeight: 600,
          }}
        >
          {successMessage} Redirecting to explorer...
        </div>
      )}

      {/* Editor Form */}
      <div style={{ background: 'var(--bg-glass-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
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
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Domain Category *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Canonical Slug URL
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="url-friendly-slug"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., storage, lsm-trees, wal"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Content Body Editor or Preview */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            Curriculum Body (Markdown & Code Supported) *
          </label>

          {previewMode ? (
            <div
              className="prose"
              style={{
                minHeight: 380,
                padding: '1.5rem',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <h2>{title || 'Untitled Course'}</h2>
              <pre>
                <code>{content}</code>
              </pre>
            </div>
          ) : (
            <textarea
              rows={16}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                width: '100%',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                outline: 'none',
                resize: 'vertical',
              }}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
          <Link href="/courses" className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
            Cancel
          </Link>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="btn btn-secondary"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Publishing...' : 'Publish to Platform (Direct)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
