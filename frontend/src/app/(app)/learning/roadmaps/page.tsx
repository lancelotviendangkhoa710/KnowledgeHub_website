'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { LearningRoadmap } from '@/types/learning';
import { roadmapClient } from '@/lib/roadmapClient';

export default function RoadmapsPage() {
  const [roadmaps, setRoadmaps] = useState<LearningRoadmap[]>([]);
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards against a double click sending two DELETE requests: the ref blocks
  // re-entry synchronously, the state drives the disabled attribute.
  const deletingRef = useRef<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRoadmaps((await roadmapClient.list()).data);
    } catch {
      setError('Unable to load your roadmaps. Check your session, then retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const roadmap = (await roadmapClient.create({ title, goal })).data;
      setRoadmaps((current) => [roadmap, ...current]);
      setTitle('');
      setGoal('');
    } catch {
      setError('Unable to create roadmap. Review required fields, then retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (deletingRef.current.has(id)) return;
    deletingRef.current.add(id);
    setDeletingIds([...deletingRef.current]);
    setError(null);
    try {
      await roadmapClient.remove(id);
      setRoadmaps((current) => current.filter((roadmap) => roadmap.id !== id));
    } catch {
      setError('Unable to delete roadmap. Retry after reloading.');
    } finally {
      deletingRef.current.delete(id);
      setDeletingIds([...deletingRef.current]);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '2.5rem', maxWidth: 900 }}>
      {/* Header */}
      <header style={{ marginBottom: '2.5rem' }}>
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
            marginBottom: '0.75rem',
            display: 'inline-flex',
          }}
        >
          Curated Learning Paths
        </span>
        <h1 style={{ color: 'var(--color-charcoal)', fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Learning Roadmaps
        </h1>
        <p style={{ color: 'var(--color-gray)', fontSize: '1.05rem', lineHeight: 1.6 }}>
          Plan private learning goals and ordered next steps.
        </p>
      </header>

      {/* Create Roadmap Form */}
      <div
        style={{
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          boxShadow: 'var(--shadow-xs)',
          marginBottom: '2.5rem',
        }}
      >
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-charcoal)', marginBottom: '1.25rem' }}>
          Create New Roadmap
        </h3>
        <form onSubmit={create} style={{ display: 'grid', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '0.4rem' }}>
              Roadmap Title *
            </label>
            <input
              aria-label="Roadmap title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g., Senior Distributed Systems Engineer"
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
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '0.4rem' }}>
              Learning Goal *
            </label>
            <textarea
              aria-label="Learning goal"
              required
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="What core competencies or milestones do you want to achieve?"
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-white)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-charcoal)',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                outline: 'none',
              }}
            />
          </div>

          <div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ padding: '0.65rem 1.35rem', fontWeight: 600 }}
            >
              {submitting ? 'Creating…' : 'Create Roadmap'}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: 'var(--color-primary-faint)',
            border: '1px solid var(--color-primary-pale)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            color: 'var(--color-primary-light)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void load()}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-gray)' }}>
          Loading roadmaps…
        </div>
      ) : roadmaps.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3.5rem 2rem',
            background: 'var(--color-white)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <h3 style={{ color: 'var(--color-charcoal)', marginBottom: '0.5rem', fontSize: '1.15rem', fontWeight: 600 }}>
            No roadmaps yet
          </h3>
          <p style={{ color: 'var(--color-gray)', margin: 0 }}>
            Define a roadmap above to organize your progression and curriculum milestones.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {roadmaps.map((roadmap) => (
            <article
              key={roadmap.id}
              style={{
                padding: '1.75rem',
                background: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-xs)',
                transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-charcoal)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                    {roadmap.title}
                  </h2>
                  <p style={{ color: 'var(--color-gray)', marginBottom: '1rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    {roadmap.goal}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: 'var(--color-primary-pale)',
                        color: 'var(--color-primary)',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-full)',
                      }}
                    >
                      {roadmap.items.length} items
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-gray-light)', textTransform: 'capitalize' }}>
                      Status: <strong style={{ color: 'var(--color-charcoal)' }}>{roadmap.status}</strong>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={deletingIds.includes(roadmap.id)}
                  onClick={() => void remove(roadmap.id)}
                  style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem' }}
                >
                  {deletingIds.includes(roadmap.id) ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
