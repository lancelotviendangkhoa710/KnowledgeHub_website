'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { learningProgressClient } from '@/lib/learningProgressClient';
import { roadmapClient } from '@/lib/roadmapClient';
import { LearningRoadmap, RoadmapItem, RoadmapItemStatus, RoadmapStatus } from '@/types/learning';

type Props = {
  roadmap: LearningRoadmap;
  onChange: (roadmap: LearningRoadmap) => void;
  onDelete: () => void;
  deleting: boolean;
};

const progressOptions: { value: RoadmapItemStatus; label: string }[] = [
  { value: 'pending', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'skipped', label: 'Skipped' },
];

const roadmapStatuses: RoadmapStatus[] = ['active', 'paused', 'completed', 'archived'];

export default function RoadmapCard({ roadmap, onChange, onDelete, deleting }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(roadmap.title);
  const [goal, setGoal] = useState(roadmap.goal);
  const [status, setStatus] = useState<RoadmapStatus>(roadmap.status);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedItems = [...roadmap.items].sort((a, b) => a.position - b.position);
  const completedCount = roadmap.items.filter((item) => item.status === 'completed').length;

  const saveRoadmap = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy('roadmap');
    setError(null);
    try {
      const updated = (await roadmapClient.update(roadmap.id, {
        title: title.trim(), goal: goal.trim(), status,
      })).data;
      onChange(updated);
      setEditing(false);
    } catch {
      setError('Could not save this roadmap. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const addItem = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const position = roadmap.items.reduce((max, item) => Math.max(max, item.position), -1) + 1;
    if (position > 65535) {
      setError('This roadmap has reached the maximum number of steps.');
      return;
    }
    setBusy('new-item');
    setError(null);
    try {
      const item = (await roadmapClient.createItem(roadmap.id, {
        title: newItemTitle.trim(),
        description: newItemDescription.trim() || undefined,
        position,
      })).data;
      onChange({ ...roadmap, items: [...roadmap.items, item] });
      setNewItemTitle('');
      setNewItemDescription('');
    } catch {
      setError('Could not add the step. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const changeProgress = async (item: RoadmapItem, next: RoadmapItemStatus) => {
    if (busy || next === item.status) return;
    setBusy(item.id);
    setError(null);
    try {
      const result = await learningProgressClient.update(item.id, next);
      onChange({
        ...roadmap,
        items: roadmap.items.map((entry) => entry.id === item.id
          ? { ...entry, status: result.data?.status ?? next }
          : entry),
      });
    } catch {
      setError('Could not update progress. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const startEditingItem = (item: RoadmapItem) => {
    setEditingItemId(item.id);
    setItemTitle(item.title);
    setItemDescription(item.description ?? '');
    setError(null);
  };

  const saveItem = async (event: FormEvent, item: RoadmapItem) => {
    event.preventDefault();
    if (busy) return;
    setBusy(item.id);
    setError(null);
    try {
      const updated = (await roadmapClient.updateItem(roadmap.id, item.id, {
        title: itemTitle.trim(), description: itemDescription.trim() || null,
      })).data;
      onChange({ ...roadmap, items: roadmap.items.map((entry) => entry.id === item.id ? updated : entry) });
      setEditingItemId(null);
    } catch {
      setError('Could not save the step. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const removeItem = async (item: RoadmapItem) => {
    if (busy || !window.confirm(`Delete step "${item.title}"?`)) return;
    setBusy(item.id);
    setError(null);
    try {
      await roadmapClient.removeItem(roadmap.id, item.id);
      onChange({ ...roadmap, items: roadmap.items.filter((entry) => entry.id !== item.id) });
      if (editingItemId === item.id) setEditingItemId(null);
    } catch {
      setError('Could not delete the step. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <article style={{ padding: '1.75rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-charcoal)', marginBottom: '0.5rem' }}>{roadmap.title}</h2>
          <p style={{ color: 'var(--color-gray)', marginBottom: '0.75rem', lineHeight: 1.6 }}>{roadmap.goal}</p>
          <p style={{ color: 'var(--color-gray)', margin: 0 }}>
            {completedCount} of {roadmap.items.length} steps completed · {roadmap.status}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" aria-expanded={open} aria-controls={`roadmap-${roadmap.id}`} onClick={() => setOpen((value) => !value)}>
            {open ? 'Close roadmap' : 'Open roadmap'}
          </button>
          <button type="button" className="btn btn-secondary" disabled={deleting || busy !== null} onClick={onDelete}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {open && (
        <div id={`roadmap-${roadmap.id}`} style={{ borderTop: '1px solid var(--color-border)', marginTop: '1.5rem', paddingTop: '1.5rem' }}>
          {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
          {editing ? (
            <form onSubmit={saveRoadmap} style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.75rem' }}>
              <label>Roadmap title<input aria-label="Edit roadmap title" required maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.6rem' }} /></label>
              <label>Learning goal<textarea aria-label="Edit learning goal" required value={goal} onChange={(event) => setGoal(event.target.value)} rows={2} style={{ display: 'block', width: '100%', padding: '0.6rem' }} /></label>
              <label>Status<select aria-label="Roadmap status" value={status} onChange={(event) => setStatus(event.target.value as RoadmapStatus)} style={{ display: 'block', padding: '0.6rem' }}>
                {roadmapStatuses.map((option) => <option key={option} value={option}>{option}</option>)}
              </select></label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" disabled={busy !== null}>Save roadmap</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)} disabled={busy !== null}>Cancel</button>
              </div>
            </form>
          ) : (
            <button type="button" className="btn btn-secondary" style={{ marginBottom: '1.5rem' }} onClick={() => { setTitle(roadmap.title); setGoal(roadmap.goal); setStatus(roadmap.status); setEditing(true); }}>
              Edit roadmap
            </button>
          )}

          <h3 style={{ color: 'var(--color-charcoal)', marginBottom: '1rem' }}>Learning steps</h3>
          {sortedItems.length === 0 && <p style={{ color: 'var(--color-gray)' }}>No steps yet. Add the first step below.</p>}
          <ol style={{ display: 'grid', gap: '0.9rem', paddingLeft: '1.5rem' }}>
            {sortedItems.map((item) => (
              <li key={item.id} style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                {editingItemId === item.id ? (
                  <form onSubmit={(event) => void saveItem(event, item)} style={{ display: 'grid', gap: '0.65rem' }}>
                    <input aria-label="Edit step title" required maxLength={255} value={itemTitle} onChange={(event) => setItemTitle(event.target.value)} style={{ width: '100%', padding: '0.6rem' }} />
                    <textarea aria-label="Edit step description" value={itemDescription} onChange={(event) => setItemDescription(event.target.value)} rows={2} style={{ width: '100%', padding: '0.6rem' }} />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary" disabled={busy !== null}>Save step</button>
                      <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => setEditingItemId(null)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'grid', gap: '0.55rem' }}>
                    <strong>{item.title}</strong>
                    {item.description && <p style={{ margin: 0, color: 'var(--color-gray)' }}>{item.description}</p>}
                    {item.article_id && <Link href={`/courses/${encodeURIComponent(item.article_id)}`}>Open course</Link>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <label htmlFor={`progress-${item.id}`}>Progress</label>
                      <select id={`progress-${item.id}`} value={item.status} disabled={busy !== null} onChange={(event) => void changeProgress(item, event.target.value as RoadmapItemStatus)} style={{ padding: '0.45rem' }}>
                        {progressOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => startEditingItem(item)}>Edit step</button>
                      <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => void removeItem(item)}>Delete step</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>

          <form onSubmit={addItem} style={{ display: 'grid', gap: '0.65rem', marginTop: '1.5rem' }}>
            <h4 style={{ margin: 0 }}>Add a step</h4>
            <input aria-label="New step title" required maxLength={255} placeholder="Step title" value={newItemTitle} onChange={(event) => setNewItemTitle(event.target.value)} style={{ padding: '0.6rem' }} />
            <textarea aria-label="New step description" placeholder="Description (optional)" rows={2} value={newItemDescription} onChange={(event) => setNewItemDescription(event.target.value)} style={{ padding: '0.6rem' }} />
            <button className="btn btn-primary" disabled={busy !== null} style={{ justifySelf: 'start' }}>{busy === 'new-item' ? 'Adding…' : 'Add step'}</button>
          </form>
        </div>
      )}
    </article>
  );
}
