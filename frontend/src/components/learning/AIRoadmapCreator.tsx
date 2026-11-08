'use client';

import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { aiRoadmapClient, RoadmapDraft } from '@/lib/aiRoadmapClient';

type Message = { role: 'user' | 'assistant'; text: string };

type Props = { onSaved: () => void; authRequired: boolean };

export default function AIRoadmapCreator({ onSaved, authRequired }: Props) {
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [weeks, setWeeks] = useState('24');
  const [hours, setHours] = useState('8');
  const [jobPostings, setJobPostings] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState<RoadmapDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewedGoal, setPreviewedGoal] = useState('');
  const [saveOutcomeUnknown, setSaveOutcomeUnknown] = useState(false);
  const [retryableError, setRetryableError] = useState(false);
  const [authExpired, setAuthExpired] = useState(false);
  const draftVersion = useRef(0);

  const clearDraft = () => {
    draftVersion.current += 1;
    setDraft(null);
    setSaved(false);
    setError(null);
    setRetryableError(false);
    setAuthExpired(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const requestVersion = ++draftVersion.current;
    setLoading(true);
    setError(null);
    setRetryableError(false);
    setAuthExpired(false);
    setSaveOutcomeUnknown(false);

    try {
      const response = await aiRoadmapClient.preview({ goal, level, weeks: Number(weeks), hours_per_week: Number(hours),
        job_postings: jobPostings.split(/\n---\s*\n/).map((posting) => posting.trim()).filter(Boolean) });
      if (requestVersion !== draftVersion.current) return;
      setDraft(response.data);
      setPreviewedGoal(goal);
      setSaved(false);
      setMessages((current) => [...current, { role: 'user', text: goal }, { role: 'assistant', text: response.data.summary }]);
    } catch (requestError) {
      if (requestVersion !== draftVersion.current) return;
      const status = (requestError as { status?: number }).status;
      if (status === 401) {
        setAuthExpired(true);
        setError('Your session has expired. Sign in again to create a roadmap.');
      } else if (status === 502 || status === 503 || status === 504) {
        setError('The AI service is unavailable or responding slowly. Please try again.');
        setRetryableError(true);
      } else if (status === 422) {
        setError('Some details are invalid. Check your goal and limits, then try again.');
      } else {
        setError('Couldn\'t create a roadmap right now. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!draft || saving || saved) return;
    const draftBeingSaved = draft;
    const versionBeingSaved = draftVersion.current;
    setSaving(true);
    setError(null);
    setSaveOutcomeUnknown(false);
    setAuthExpired(false);
    try {
      await aiRoadmapClient.confirm({ ...draftBeingSaved, goal: previewedGoal });
      if (draftVersion.current === versionBeingSaved) {
        setSaved(true);
        onSaved();
      }
    } catch (caught) {
      const status = (caught as { status?: number }).status;
      if (status === 401) {
        setAuthExpired(true);
        setError('Your session expired. Sign in again to save your roadmap.');
      } else if (status === 422) {
        setError('Some steps are invalid; nothing was saved.');
      } else {
        // Network failure or 5xx: the roadmap may or may not exist server-side.
        setSaveOutcomeUnknown(true);
        setError('We couldn\'t confirm whether your roadmap was saved. Check My roadmaps before retrying; retrying may create a duplicate.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <span className="badge" style={{ color: 'var(--color-primary)' }}>AI ROADMAP ASSISTANT</span>
        <h2 style={{ color: 'var(--color-charcoal)', fontSize: '1.6rem', fontWeight: 800, margin: '0.6rem 0' }}>
          Create a learning roadmap with AI
        </h2>
        <p style={{ color: 'var(--color-gray)', lineHeight: 1.6, margin: 0 }}>
          Describe your goal. AI will draft an outline for you to review; nothing is saved to your roadmaps yet.
        </p>
      </header>

      {authRequired ? (
        <p role="alert">You need to <Link href="/login?redirect=/learning/roadmaps%3Fmode%3Dai">sign in</Link> to create a roadmap with AI.</p>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
        <form onSubmit={submit} style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', height: 'fit-content' }}>
          <label htmlFor="roadmap-goal" style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>Learning goal</label>
          <textarea id="roadmap-goal" aria-label="Learning goal" required minLength={3} maxLength={500} value={goal} disabled={loading} onChange={(event) => { setGoal(event.target.value); clearDraft(); }}
            placeholder="e.g., I want to become a Data Engineer" rows={5}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', resize: 'vertical' }} />

          <label htmlFor="roadmap-level" style={{ display: 'block', fontWeight: 600, margin: '1rem 0 0.4rem' }}>Current level</label>
          <select id="roadmap-level" aria-label="Current level" value={level} disabled={loading} onChange={(event) => { setLevel(event.target.value as typeof level); clearDraft(); }}
            style={{ width: '100%', padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <label htmlFor="roadmap-postings" style={{ display: 'block', fontWeight: 600, margin: '1rem 0 0.4rem' }}>Job postings (optional)</label>
          <textarea id="roadmap-postings" value={jobPostings} maxLength={15000} disabled={loading} onChange={(event) => { setJobPostings(event.target.value); clearDraft(); }}
            placeholder="Paste multiple postings, separated by a line containing only ---" rows={6}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', resize: 'vertical' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
            <label style={{ fontWeight: 600 }}>Weeks
              <input type="number" min={1} max={104} required value={weeks} disabled={loading} onChange={(event) => { setWeeks(event.target.value); clearDraft(); }}
                style={{ display: 'block', width: '100%', marginTop: '0.4rem', padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
            </label>
            <label style={{ fontWeight: 600 }}>Hours per week
              <input type="number" min={1} max={80} required value={hours} disabled={loading} onChange={(event) => { setHours(event.target.value); clearDraft(); }}
                style={{ display: 'block', width: '100%', marginTop: '0.4rem', padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
            </label>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1.25rem' }}>
            {loading ? 'AI is thinking…' : retryableError ? 'Try generating again' : 'Generate draft roadmap'}
          </button>
          {error && <p role="alert" style={{ color: '#b42318', lineHeight: 1.5, marginBottom: 0 }}>
            {error}
            {authExpired && <> <Link href="/login?redirect=/learning/roadmaps%3Fmode%3Dai">Sign in</Link></>}
            {saveOutcomeUnknown && <> <Link href="/learning/roadmaps">Open My roadmaps</Link></>}
          </p>}
        </form>

        <section aria-live="polite">
          <div style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', minHeight: 220 }}>
            <h2 style={{ marginTop: 0, color: 'var(--color-charcoal)', fontSize: '1.2rem' }}>Conversation</h2>
            {messages.length === 0 ? <p style={{ color: 'var(--color-gray)' }}>Enter a goal to get started.</p> : messages.map((message, index) => (
              <div key={index} style={{ marginBottom: '0.85rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: message.role === 'user' ? 'var(--color-primary-faint)' : 'var(--color-off-white)' }}>
                <strong>{message.role === 'user' ? 'You' : 'AI'}</strong>
                <p style={{ margin: '0.3rem 0 0', lineHeight: 1.55 }}>{message.text}</p>
              </div>
            ))}
          </div>

          {draft && <div style={{ marginTop: '1.25rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h2 style={{ marginTop: 0, color: 'var(--color-charcoal)' }}>{draft.title}</h2>
            {draft.meta && <p style={{ color: 'var(--color-gray)', fontSize: '0.8rem' }}>
              Provider: {draft.meta.provider} · Configured model: {draft.meta.configured_model}
              {draft.meta.model_version ? ` · Runtime model: ${draft.meta.model_version}` : ''}
            </p>}
            <ol style={{ paddingLeft: '1.25rem' }}>{draft.items.map((item) => (
              <li key={item.position} style={{ marginBottom: '1rem' }}>
                <strong>{item.title}</strong>
                <p style={{ margin: '0.25rem 0', color: 'var(--color-gray)', lineHeight: 1.5 }}>{item.description}</p>
                <small style={{ color: 'var(--color-primary)' }}>{item.skills.join(' · ')}</small>
              </li>
            ))}</ol>
            <p style={{ color: 'var(--color-gray)', fontSize: '0.85rem', marginBottom: 0 }}>
              This is a draft. No courses are attached to these steps yet, and nothing has been saved to your roadmaps.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => void confirm()} disabled={saving || saved}
              style={{ width: '100%', marginTop: '1rem' }}>
              {saved ? 'Roadmap saved' : saving ? 'Saving…' : 'Confirm and save roadmap'}
            </button>
            {saved && <p style={{ marginBottom: 0 }}><Link href="/learning/roadmaps">View your saved roadmaps</Link></p>}
          </div>}
        </section>
      </div>
      )}
    </div>
  );
}
