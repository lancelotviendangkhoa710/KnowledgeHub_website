'use client';

import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import Select from '@/components/ui/Select';
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
        setError('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tạo lộ trình.');
      } else if (status === 502 || status === 503 || status === 504) {
        setError('Dịch vụ AI đang không khả dụng hoặc phản hồi chậm. Vui lòng thử lại.');
        setRetryableError(true);
      } else if (status === 422) {
        setError('Một số thông tin chưa hợp lệ. Kiểm tra mục tiêu và giới hạn rồi thử lại.');
      } else {
        setError('Chưa tạo được lộ trình lúc này. Vui lòng thử lại.');
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
        setError('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để lưu lộ trình.');
      } else if (status === 422) {
        setError('Một số bước chưa hợp lệ, chưa có gì được lưu.');
      } else {
        // Network failure or 5xx: the roadmap may or may not exist server-side.
        setSaveOutcomeUnknown(true);
        setError('Chưa xác nhận được lộ trình đã được lưu hay chưa. Hãy kiểm tra Lộ trình của tôi trước khi thử lại, vì thử lại có thể tạo bản trùng.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <span className="badge" style={{ color: 'var(--color-primary)' }}>TRỢ LÝ LỘ TRÌNH AI</span>
        <h2 style={{ color: 'var(--color-charcoal)', fontSize: '1.6rem', fontWeight: 800, margin: '0.6rem 0' }}>
          Tạo lộ trình học bằng AI
        </h2>
        <p style={{ color: 'var(--color-gray)', lineHeight: 1.6, margin: 0 }}>
          Mô tả mục tiêu của bạn. AI sẽ soạn bản nháp để bạn xem lại; chưa có gì được lưu vào lộ trình của bạn.
        </p>
      </header>

      {authRequired ? (
        <p role="alert">Bạn cần <Link href="/login?redirect=/learning/roadmaps%3Fmode%3Dai">đăng nhập</Link> để tạo lộ trình bằng AI.</p>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
        <form onSubmit={submit} style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', height: 'fit-content' }}>
          <label htmlFor="roadmap-goal" style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>Mục tiêu học tập</label>
          <textarea id="roadmap-goal" aria-label="Mục tiêu học tập" required minLength={3} maxLength={500} value={goal} disabled={loading} onChange={(event) => { setGoal(event.target.value); clearDraft(); }}
            placeholder="Ví dụ: Tôi muốn trở thành Data Engineer" rows={5}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', resize: 'vertical' }} />

          <span style={{ display: 'block', fontWeight: 600, margin: '1rem 0 0.4rem' }}>Trình độ hiện tại</span>
          <Select
            ariaLabel="Trình độ hiện tại"
            value={level}
            disabled={loading}
            onChange={(value) => { setLevel(value as typeof level); clearDraft(); }}
            options={[
              { value: 'beginner', label: 'Mới bắt đầu' },
              { value: 'intermediate', label: 'Trung cấp' },
              { value: 'advanced', label: 'Nâng cao' },
            ]}
          />

          <label htmlFor="roadmap-postings" style={{ display: 'block', fontWeight: 600, margin: '1rem 0 0.4rem' }}>Tin tuyển dụng (không bắt buộc)</label>
          <textarea id="roadmap-postings" value={jobPostings} maxLength={15000} disabled={loading} onChange={(event) => { setJobPostings(event.target.value); clearDraft(); }}
            placeholder="Dán nhiều tin tuyển dụng, ngăn cách nhau bằng một dòng chỉ có ---" rows={6}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', resize: 'vertical' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
            <label style={{ fontWeight: 600 }}>Số tuần
              <input type="number" min={1} max={104} required value={weeks} disabled={loading} onChange={(event) => { setWeeks(event.target.value); clearDraft(); }}
                style={{ display: 'block', width: '100%', marginTop: '0.4rem', padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
            </label>
            <label style={{ fontWeight: 600 }}>Số giờ mỗi tuần
              <input type="number" min={1} max={80} required value={hours} disabled={loading} onChange={(event) => { setHours(event.target.value); clearDraft(); }}
                style={{ display: 'block', width: '100%', marginTop: '0.4rem', padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
            </label>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1.25rem' }}>
            {loading ? 'AI đang soạn…' : retryableError ? 'Thử tạo lại' : 'Tạo lộ trình nháp'}
          </button>
          {error && <p role="alert" style={{ color: '#b42318', lineHeight: 1.5, marginBottom: 0 }}>
            {error}
            {authExpired && <> <Link href="/login?redirect=/learning/roadmaps%3Fmode%3Dai">Đăng nhập</Link></>}
            {saveOutcomeUnknown && <> <Link href="/learning/roadmaps">Mở Lộ trình của tôi</Link></>}
          </p>}
        </form>

        <section aria-live="polite">
          <div style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', minHeight: 220 }}>
            <h2 style={{ marginTop: 0, color: 'var(--color-charcoal)', fontSize: '1.2rem' }}>Hội thoại</h2>
            {messages.length === 0 ? <p style={{ color: 'var(--color-gray)' }}>Nhập mục tiêu để bắt đầu.</p> : messages.map((message, index) => (
              <div key={index} style={{ marginBottom: '0.85rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: message.role === 'user' ? 'var(--color-primary-faint)' : 'var(--color-off-white)' }}>
                <strong>{message.role === 'user' ? 'Bạn' : 'AI'}</strong>
                <p style={{ margin: '0.3rem 0 0', lineHeight: 1.55 }}>{message.text}</p>
              </div>
            ))}
          </div>

          {draft && <div style={{ marginTop: '1.25rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h2 style={{ marginTop: 0, color: 'var(--color-charcoal)' }}>{draft.title}</h2>
            {draft.meta && <p style={{ color: 'var(--color-gray)', fontSize: '0.8rem' }}>
              Nhà cung cấp: {draft.meta.provider} · Mô hình cấu hình: {draft.meta.configured_model}
              {draft.meta.model_version ? ` · Mô hình chạy: ${draft.meta.model_version}` : ''}
            </p>}
            <ol style={{ paddingLeft: '1.25rem' }}>{draft.items.map((item) => (
              <li key={item.position} style={{ marginBottom: '1rem' }}>
                <strong>{item.title}</strong>
                <p style={{ margin: '0.25rem 0', color: 'var(--color-gray)', lineHeight: 1.5 }}>{item.description}</p>
                <small style={{ color: 'var(--color-primary)' }}>{item.skills.join(' · ')}</small>
              </li>
            ))}</ol>
            <p style={{ color: 'var(--color-gray)', fontSize: '0.85rem', marginBottom: 0 }}>
              Đây là bản nháp. Các bước chưa gắn khóa học nào và chưa có gì được lưu vào lộ trình của bạn.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => void confirm()} disabled={saving || saved}
              style={{ width: '100%', marginTop: '1rem' }}>
              {saved ? 'Đã lưu lộ trình' : saving ? 'Đang lưu…' : 'Xác nhận và lưu lộ trình'}
            </button>
            {saved && <p style={{ marginBottom: 0 }}><Link href="/learning/roadmaps">Xem các lộ trình đã lưu</Link></p>}
          </div>}
        </section>
      </div>
      )}
    </div>
  );
}
