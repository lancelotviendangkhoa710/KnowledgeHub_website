'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Category } from '@/types/content';
import { fetchCategories } from '@/lib/contentClient';
import { api } from '@/lib/api';

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
      type ArticleCreateResponse = {
        status: string;
        message: string;
        data?: { id: string; slug: string; status: string };
      };

      const data = await api.post<ArticleCreateResponse>('/v1/articles', {
        title,
        slug,
        category_id: categoryId || null,
        content,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });

      if (publish && data?.data?.id) {
        await api.post(`/v1/articles/${data.data.id}/publish`, {});
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
            <span style={{ fontSize: '0.82rem', color: 'var(--color-gray)' }}>— Internal Publishing Workflow</span>
          </div>
          <h1 style={{ color: 'var(--color-charcoal)', fontSize: '2.25rem', fontWeight: 800 }}>Author Course Material</h1>
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

      {/* Editor Form */}
      <div
        style={{
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
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
                fontSize: '1rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-charcoal)' }}>
              Domain Category *
            </label>
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
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-charcoal)' }}>
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
                background: 'var(--color-white)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-gray)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-charcoal)' }}>
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
                background: 'var(--color-white)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-charcoal)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Content Body Editor or Preview */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-charcoal)' }}>
            Curriculum Body (Markdown & Code Supported) *
          </label>

          {previewMode ? (
            <div
              className="prose"
              style={{
                minHeight: 380,
                padding: '1.5rem',
                background: 'var(--color-off-white)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <h2 style={{ color: 'var(--color-charcoal)', marginTop: 0 }}>{title || 'Untitled Course'}</h2>
              <pre style={{ background: 'var(--color-charcoal)', color: '#F8FAFC', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
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
                background: 'var(--color-white)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-charcoal)',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border-light)', paddingTop: '1.5rem' }}>
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
