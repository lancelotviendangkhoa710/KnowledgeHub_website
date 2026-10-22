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
      <h1>Learning Roadmaps</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Plan private learning goals and ordered next steps.</p>
      <form onSubmit={create} style={{ display: 'grid', gap: '0.75rem', marginBottom: '2rem' }}>
        <input aria-label="Roadmap title" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Roadmap title" />
        <textarea aria-label="Learning goal" required value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="What do you want to achieve?" rows={3} />
        <button className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create roadmap'}</button>
      </form>
      {error && <p role="alert" style={{ color: 'var(--accent-red)' }}>{error} <button className="btn btn-secondary" onClick={() => void load()}>Retry</button></p>}
      {loading ? <p>Loading roadmaps…</p> : roadmaps.length === 0 ? <p>No roadmaps yet. Create one to start planning.</p> : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {roadmaps.map((roadmap) => (
            <article key={roadmap.id} style={{ padding: '1.25rem', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div><h2>{roadmap.title}</h2><p>{roadmap.goal}</p><small>{roadmap.items.length} items · {roadmap.status}</small></div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={deletingIds.includes(roadmap.id)}
                  onClick={() => void remove(roadmap.id)}
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