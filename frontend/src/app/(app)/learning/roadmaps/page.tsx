'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LearningRoadmap } from '@/types/learning';
import { roadmapClient } from '@/lib/roadmapClient';
import RoadmapCard from '@/components/learning/RoadmapCard';

export default function RoadmapsPage() {
  const [roadmaps, setRoadmaps] = useState<LearningRoadmap[]>([]);
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  // Guards against a double click sending two DELETE requests: the ref blocks
  // re-entry synchronously, the state drives the disabled attribute.
  const deletingRef = useRef<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    setAuthRequired(false);
    try {
      setRoadmaps((await roadmapClient.list()).data);
    } catch (caught) {
      setRoadmaps([]);
      if ((caught as { status?: number }).status === 401) {
        setAuthRequired(true);
        setError('Sign in to view and manage your roadmaps.');
      } else {
        setError('Unable to load your roadmaps. Check your connection, then retry.');
      }
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
      {!authRequired && <div
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
      </div>}

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
          {authRequired ? (
            <Link className="btn btn-secondary" href="/login?redirect=/learning/roadmaps">Sign in</Link>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void load()}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-gray)' }}>
          Loading roadmaps…
        </div>
      ) : authRequired ? null : roadmaps.length === 0 ? (
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
            <RoadmapCard
              key={roadmap.id}
              roadmap={roadmap}
              onChange={(updated) => setRoadmaps((current) => current.map((entry) => entry.id === updated.id ? updated : entry))}
              onDelete={() => void remove(roadmap.id)}
              deleting={deletingIds.includes(roadmap.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
