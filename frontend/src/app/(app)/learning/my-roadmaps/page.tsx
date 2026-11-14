'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RoadmapCard from '@/components/learning/RoadmapCard';
import { roadmapClient } from '@/lib/roadmapClient';
import { getAccessToken } from '@/lib/authToken';
import type { LearningRoadmap } from '@/types/learning';
import styles from './myRoadmaps.module.css';

export default function MyRoadmapsPage() {
  const router = useRouter();
  const [roadmaps, setRoadmaps] = useState<LearningRoadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const deletingRef = useRef<Set<string>>(new Set());

  async function load(): Promise<void> {
    const session = getAccessToken();
    if (!session) {
      setRoadmaps([]);
      setLoading(false);
      router.replace('/login?redirect=%2Flearning%2Fmy-roadmaps');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await roadmapClient.list(true);
      if (getAccessToken() !== session) {
        setRoadmaps([]);
        router.replace('/login?redirect=%2Flearning%2Fmy-roadmaps');
        return;
      }
      setRoadmaps(result.data);
    } catch (caught) {
      if ((caught as { status?: number }).status === 401) {
        setRoadmaps([]);
        router.replace('/login?redirect=%2Flearning%2Fmy-roadmaps');
      } else {
        setError('Could not load your roadmaps. Check your connection and retry.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const clearOnSessionChange = () => {
      if (!getAccessToken()) setRoadmaps([]);
    };
    window.addEventListener('focus', clearOnSessionChange);
    return () => window.removeEventListener('focus', clearOnSessionChange);
  }, []);

  async function remove(roadmap: LearningRoadmap): Promise<void> {
    if (deletingRef.current.has(roadmap.id) || !window.confirm(`Delete roadmap "${roadmap.title}" and all its steps?`)) return;
    deletingRef.current.add(roadmap.id);
    setDeletingIds([...deletingRef.current]);
    setError(null);
    try {
      await roadmapClient.remove(roadmap.id);
      setRoadmaps((current) => current.filter((entry) => entry.id !== roadmap.id));
    } catch {
      setError('Could not delete this roadmap. Reload and retry.');
    } finally {
      deletingRef.current.delete(roadmap.id);
      setDeletingIds([...deletingRef.current]);
    }
  }

  const aiRoadmaps = roadmaps.filter((roadmap) => roadmap.origin === 'ai');
  const previous = roadmaps.filter((roadmap) => roadmap.origin !== 'ai');

  function renderList(entries: LearningRoadmap[], empty: string) {
    if (entries.length === 0) return <p className={styles.empty}>{empty}</p>;
    return <div className={styles.list}>{entries.map((roadmap) => (
      <RoadmapCard
        key={roadmap.id}
        roadmap={roadmap}
        onChange={(updated) => setRoadmaps((current) => current.map((entry) => entry.id === updated.id ? updated : entry))}
        onDelete={() => void remove(roadmap)}
        deleting={deletingIds.includes(roadmap.id)}
      />
    ))}</div>;
  }

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.header}>
        <div><span className="badge">Your learning paths</span><h1>My AI Roadmaps</h1><p>Continue your personalized plans and track each step as you learn.</p></div>
        <div className={styles.actions}><Link className="btn btn-primary" href="/ai/companion">Create Roadmap with AI</Link><Link className="btn btn-secondary" href="/learning/roadmaps">Browse templates</Link></div>
      </header>

      {error && <div className={styles.error} role="alert">{error} <button type="button" onClick={() => void load()}>Retry</button></div>}
      {loading ? <p role="status">Loading your roadmaps…</p> : <>
        <section aria-labelledby="ai-roadmaps-heading" className={styles.section}>
          <h2 id="ai-roadmaps-heading">My AI Roadmaps <span>{aiRoadmaps.length}</span></h2>
          {renderList(aiRoadmaps, 'No AI roadmaps yet. Open AI Companion and create your first plan.')}
        </section>
        <section aria-labelledby="previous-roadmaps-heading" className={styles.section}>
          <h2 id="previous-roadmaps-heading">Previously saved <span>{previous.length}</span></h2>
          <p className={styles.sectionHint}>Older roadmaps are preserved here because their creation method was not recorded.</p>
          {renderList(previous, 'No previously saved roadmaps.')}
        </section>
      </>}
    </div>
  );
}
