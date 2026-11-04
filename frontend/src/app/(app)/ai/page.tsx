'use client';

import { FormEvent, useState } from 'react';
import { aiRoadmapClient, RoadmapDraft } from '@/lib/aiRoadmapClient';

type Message = { role: 'user' | 'assistant'; text: string };

export default function AiRoadmapPage() {
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [weeks, setWeeks] = useState(24);
  const [hours, setHours] = useState(8);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState<RoadmapDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setDraft(null);
    setMessages((current) => [...current, { role: 'user', text: goal }]);

    try {
      const response = await aiRoadmapClient.preview({ goal, level, weeks, hours_per_week: hours });
      setDraft(response.data);
      setMessages((current) => [...current, { role: 'assistant', text: response.data.summary }]);
    } catch (requestError) {
      const message = typeof requestError === 'object' && requestError && 'message' in requestError
        ? String(requestError.message)
        : 'Không thể tạo roadmap. Hãy kiểm tra API và thử lại.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 980, paddingTop: '2.5rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <span className="badge" style={{ color: 'var(--color-primary)' }}>AI ROADMAP ASSISTANT</span>
        <h1 style={{ color: 'var(--color-charcoal)', fontSize: '2.25rem', fontWeight: 800, margin: '0.6rem 0' }}>
          Chat với AI để tạo lộ trình học
        </h1>
        <p style={{ color: 'var(--color-gray)', lineHeight: 1.6, margin: 0 }}>
          Mô tả mục tiêu của bạn. AI sẽ tạo bản nháp để bạn xem lại; chưa lưu vào roadmap.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1.15fr)', gap: '1.5rem' }}>
        <form onSubmit={submit} style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', height: 'fit-content' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>Mục tiêu học tập</label>
          <textarea required minLength={3} maxLength={500} value={goal} onChange={(event) => setGoal(event.target.value)}
            placeholder="Ví dụ: Tôi muốn trở thành Data Engineer" rows={5}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', resize: 'vertical' }} />

          <label style={{ display: 'block', fontWeight: 600, margin: '1rem 0 0.4rem' }}>Trình độ hiện tại</label>
          <select value={level} onChange={(event) => setLevel(event.target.value as typeof level)}
            style={{ width: '100%', padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <option value="beginner">Mới bắt đầu</option>
            <option value="intermediate">Đã có nền tảng</option>
            <option value="advanced">Nâng cao</option>
          </select>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
            <label style={{ fontWeight: 600 }}>Số tuần
              <input type="number" min={1} max={104} value={weeks} onChange={(event) => setWeeks(Number(event.target.value))}
                style={{ display: 'block', width: '100%', marginTop: '0.4rem', padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
            </label>
            <label style={{ fontWeight: 600 }}>Giờ / tuần
              <input type="number" min={1} max={80} value={hours} onChange={(event) => setHours(Number(event.target.value))}
                style={{ display: 'block', width: '100%', marginTop: '0.4rem', padding: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
            </label>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1.25rem' }}>
            {loading ? 'AI đang suy nghĩ…' : 'Tạo roadmap nháp'}
          </button>
          {error && <p role="alert" style={{ color: '#b42318', lineHeight: 1.5, marginBottom: 0 }}>{error}</p>}
        </form>

        <section aria-live="polite">
          <div style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', minHeight: 220 }}>
            <h2 style={{ marginTop: 0, color: 'var(--color-charcoal)', fontSize: '1.2rem' }}>Cuộc trò chuyện</h2>
            {messages.length === 0 ? <p style={{ color: 'var(--color-gray)' }}>Hãy nhập mục tiêu để bắt đầu.</p> : messages.map((message, index) => (
              <div key={index} style={{ marginBottom: '0.85rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: message.role === 'user' ? 'var(--color-primary-faint)' : 'var(--color-off-white)' }}>
                <strong>{message.role === 'user' ? 'Bạn' : 'AI'}</strong>
                <p style={{ margin: '0.3rem 0 0', lineHeight: 1.55 }}>{message.text}</p>
              </div>
            ))}
          </div>

          {draft && <div style={{ marginTop: '1.25rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h2 style={{ marginTop: 0, color: 'var(--color-charcoal)' }}>{draft.title}</h2>
            <ol style={{ paddingLeft: '1.25rem' }}>{draft.items.map((item) => (
              <li key={item.position} style={{ marginBottom: '1rem' }}>
                <strong>{item.title}</strong>
                <p style={{ margin: '0.25rem 0', color: 'var(--color-gray)', lineHeight: 1.5 }}>{item.description}</p>
                <small style={{ color: 'var(--color-primary)' }}>{item.skills.join(' · ')}</small>
              </li>
            ))}</ol>
            <p style={{ color: 'var(--color-gray)', fontSize: '0.85rem', marginBottom: 0 }}>
              Đây là bản nháp. Chưa có khóa học gắn với các bước và chưa lưu vào roadmap.
            </p>
          </div>}
        </section>
      </div>
    </div>
  );
}
