'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { learningProgressClient } from '@/lib/learningProgressClient';
import { roadmapClient } from '@/lib/roadmapClient';
import { getCurrentUser } from '@/lib/auth';
import { LearningRoadmap, RoadmapItem, RoadmapItemStatus, RoadmapStatus } from '@/types/learning';
import s from './roadmapCard.module.css';

type Props = {
  roadmap: LearningRoadmap;
  onChange: (roadmap: LearningRoadmap) => void;
  onDelete: () => void;
  deleting: boolean;
};

const progressOptions: { value: RoadmapItemStatus; label: string }[] = [
  { value: 'pending', label: 'Chưa bắt đầu' },
  { value: 'in_progress', label: 'Đang học' },
  { value: 'completed', label: 'Đã xong' },
  { value: 'skipped', label: 'Đã bỏ qua' },
];

const roadmapStatuses: RoadmapStatus[] = ['active', 'paused', 'completed', 'archived'];

const statusLabels: Record<RoadmapStatus, string> = {
  active: 'Đang theo dõi',
  paused: 'Tạm dừng',
  completed: 'Hoàn thành',
  archived: 'Lưu trữ',
};

export default function RoadmapCard({ roadmap, onChange, onDelete, deleting }: Props) {
  const isAiRoadmap = roadmap.origin === 'ai';
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
      setError('Không lưu được lộ trình này. Vui lòng thử lại.');
    } finally {
      setBusy(null);
    }
  };

  const addItem = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const position = roadmap.items.reduce((max, item) => Math.max(max, item.position), -1) + 1;
    if (position > 65535) {
      setError('Lộ trình này đã đạt số bước tối đa.');
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
      setError('Không thêm được bước. Vui lòng thử lại.');
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
      setError('Không cập nhật được tiến độ. Vui lòng thử lại.');
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
      setError('Không lưu được bước. Vui lòng thử lại.');
    } finally {
      setBusy(null);
    }
  };

  const removeItem = async (item: RoadmapItem) => {
    if (busy || !window.confirm(`Xóa bước “${item.title}”?`)) return;
    setBusy(item.id);
    setError(null);
    try {
      await roadmapClient.removeItem(roadmap.id, item.id);
      onChange({ ...roadmap, items: roadmap.items.filter((entry) => entry.id !== item.id) });
      if (editingItemId === item.id) setEditingItemId(null);
    } catch {
      setError('Không xóa được bước. Vui lòng thử lại.');
    } finally {
      setBusy(null);
    }
  };

  const dotClass = (status: RoadmapItemStatus) =>
    status === 'completed' ? s.done : status === 'in_progress' ? s.now : status === 'skipped' ? s.skipped : '';
  const percent = roadmap.items.length ? Math.round((completedCount / roadmap.items.length) * 100) : 0;

  return (
    <article id={roadmap.id} className={s.panel}>
      <div className={s.top}>
        <div className={s.info}>
          <h2>{roadmap.title}</h2>
          <p className={s.muted}>{roadmap.goal}</p>
          {isAiRoadmap && roadmap.ai_summary && <p className={s.muted}>{roadmap.ai_summary}</p>}
          {isAiRoadmap && roadmap.coverage && (
            <p className={s.match}>
              Độ phù hợp {Math.round(roadmap.coverage.overall_percent)}% · Khóa học trong hệ thống {Math.round(roadmap.coverage.internal_percent)}% · Tài nguyên bên ngoài {Math.round(roadmap.coverage.external_percent)}% · Còn thiếu {roadmap.coverage.gaps.length} kỹ năng
            </p>
          )}
          <div className={s.bar} aria-hidden="true"><b style={{ width: `${percent}%` }} /></div>
          <p className={s.count}>
            {completedCount} trên {roadmap.items.length} bước đã xong · {statusLabels[roadmap.status]}
          </p>
          {roadmap.user_id !== getCurrentUser()?.id && (
            <p className={s.small}>Thuộc tài khoản khác · ID {roadmap.user_id}</p>
          )}
        </div>
        <div className={s.actions}>
          <button type="button" className={s.btn} aria-expanded={open} aria-controls={`roadmap-${roadmap.id}`} onClick={() => setOpen((value) => !value)}>
            {open ? 'Đóng lộ trình' : 'Mở lộ trình'}
          </button>
          <button type="button" className={`${s.btn} ${s.btnGhost}`} disabled={deleting || busy !== null} onClick={onDelete}>
            {deleting ? 'Đang xóa…' : 'Xóa'}
          </button>
        </div>
      </div>

      {open && (
        <div id={`roadmap-${roadmap.id}`} className={s.body}>
          {error && <p role="alert" className={s.alert}>{error}</p>}
          {!isAiRoadmap && editing ? (
            <form onSubmit={saveRoadmap} className={s.form}>
              <label className={s.field}>Tên lộ trình<input className={s.input} aria-label="Sửa tên lộ trình" required maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <label className={s.field}>Mục tiêu học tập<textarea className={s.input} aria-label="Sửa mục tiêu học tập" required value={goal} onChange={(event) => setGoal(event.target.value)} rows={2} /></label>
              <label className={s.field}>Trạng thái<select className={s.select} aria-label="Trạng thái lộ trình" value={status} onChange={(event) => setStatus(event.target.value as RoadmapStatus)}>
                {roadmapStatuses.map((option) => <option key={option} value={option}>{statusLabels[option]}</option>)}
              </select></label>
              <div className={s.formActions}>
                <button className={s.btn} disabled={busy !== null}>Lưu lộ trình</button>
                <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setEditing(false)} disabled={busy !== null}>Hủy</button>
              </div>
            </form>
          ) : !isAiRoadmap ? (
            <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} style={{ marginBottom: 20 }} onClick={() => { setTitle(roadmap.title); setGoal(roadmap.goal); setStatus(roadmap.status); setEditing(true); }}>
              Sửa lộ trình
            </button>
          ) : null}

          {isAiRoadmap && roadmap.coverage && (
            <div className={s.coverage}>
              <strong>Độ phủ tài nguyên khi tạo: {Math.round(roadmap.coverage.overall_percent)}%</strong>
              <p>Đây là ảnh chụp mức phù hợp của tài nguyên lúc tạo lộ trình, không phải thước đo mức thành thạo.</p>
              {roadmap.coverage.gaps.length > 0 && <p className={s.warn}>Kỹ năng còn thiếu: {roadmap.coverage.gaps.join(', ')}</p>}
              {roadmap.coverage.resource_status === 'unavailable' && <p className={s.warn}>Lúc tạo lộ trình, không tìm kiếm được tài nguyên bên ngoài.</p>}
              {roadmap.coverage.cv_analysis && <div className={s.cv}>
                <strong>Phân tích CV</strong>
                {roadmap.coverage.cv_analysis.cv_match_percent !== null && <p>Độ khớp với vai trò mục tiêu: {Math.round(roadmap.coverage.cv_analysis.cv_match_percent)}%</p>}
                {roadmap.coverage.cv_analysis.strengths.length > 0 && <p>Điểm mạnh: {roadmap.coverage.cv_analysis.strengths.map((entry) => `${entry.skill} (${entry.evidence})`).join('; ')}</p>}
                {roadmap.coverage.cv_analysis.gaps.length > 0 && <p>Kỹ năng cần phát triển: {roadmap.coverage.cv_analysis.gaps.join(', ')}</p>}
                {roadmap.coverage.cv_analysis.recommendations.length > 0 && <p>Gợi ý: {roadmap.coverage.cv_analysis.recommendations.join('; ')}</p>}
              </div>}
            </div>
          )}

          <h3>Các bước học</h3>
          {sortedItems.length === 0 && <p className={s.muted}>Chưa có bước nào. Thêm bước đầu tiên bên dưới.</p>}
          <ol className={s.steps}>
            {sortedItems.map((item) => (
              <li key={item.id} className={s.step}>
                <span className={`${s.dot} ${dotClass(item.status)}`} aria-hidden="true">
                  {item.status === 'completed' && <svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></svg>}
                </span>
                {editingItemId === item.id ? (
                  <form onSubmit={(event) => void saveItem(event, item)} className={s.stepBody}>
                    <input className={s.input} aria-label="Sửa tên bước" required maxLength={255} value={itemTitle} onChange={(event) => setItemTitle(event.target.value)} />
                    <textarea className={s.input} aria-label="Sửa mô tả bước" value={itemDescription} onChange={(event) => setItemDescription(event.target.value)} rows={2} />
                    <div className={s.formActions}>
                      <button className={`${s.btn} ${s.btnSm}`} disabled={busy !== null}>Lưu bước</button>
                      <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} disabled={busy !== null} onClick={() => setEditingItemId(null)}>Hủy</button>
                    </div>
                  </form>
                ) : (
                  <div className={s.stepBody}>
                    <strong>{item.title}</strong>
                    {isAiRoadmap && item.ai_details?.stage_title && <span className={s.small}>{item.ai_details.stage_title}</span>}
                    {isAiRoadmap && item.ai_details?.week_start && item.ai_details?.week_end && <span className={s.small}>Tuần {item.ai_details.week_start}{item.ai_details.week_end > item.ai_details.week_start ? `–${item.ai_details.week_end}` : ''}</span>}
                    {isAiRoadmap && item.ai_details?.estimated_minutes && <span className={s.small}>Thời gian ước tính: {Math.round(item.ai_details.estimated_minutes / 60 * 10) / 10} giờ</span>}
                    {item.description && <p>{item.description}</p>}
                    {isAiRoadmap && item.ai_details?.skills && item.ai_details.skills.length > 0 && <p><strong>Kỹ năng:</strong> {item.ai_details.skills.join(', ')}</p>}
                    {item.article_id && (!isAiRoadmap || item.ai_details?.course) && <Link href={`/courses/${encodeURIComponent(item.article_id)}`}>Khóa học trong hệ thống: {item.ai_details?.course?.title ?? 'Mở khóa học'}</Link>}
                    {isAiRoadmap && item.ai_details?.course?.reason && <span className={s.small}>Vì sao chọn khóa này: {item.ai_details.course.reason}</span>}
                    {isAiRoadmap && item.article_id && !item.ai_details?.course && <span className={s.small}>Khóa học đã liên kết không còn khả dụng.</span>}
                    {isAiRoadmap && (item.ai_details?.external_resources ?? []).filter((resource) => resource.url.startsWith('https://')).map((resource) => (
                      <a key={resource.url} href={resource.url} target="_blank" rel="noopener noreferrer">
                        Tài nguyên bên ngoài: {resource.title} ↗ <span className={s.small}>· {resource.reason}</span>
                      </a>
                    ))}
                    <div className={s.row}>
                      <label htmlFor={`progress-${item.id}`}>Tiến độ</label>
                      <select className={s.select} id={`progress-${item.id}`} aria-label={`Tiến độ của ${item.title}`} value={item.status} disabled={busy !== null} onChange={(event) => void changeProgress(item, event.target.value as RoadmapItemStatus)}>
                        {progressOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      {!isAiRoadmap && <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} disabled={busy !== null} onClick={() => startEditingItem(item)}>Sửa bước</button>}
                      {!isAiRoadmap && <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} disabled={busy !== null} onClick={() => void removeItem(item)}>Xóa bước</button>}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>

          {!isAiRoadmap && <form onSubmit={addItem} className={s.add}>
            <h4>Thêm bước</h4>
            <input className={s.input} aria-label="Tên bước mới" required maxLength={255} placeholder="Tên bước" value={newItemTitle} onChange={(event) => setNewItemTitle(event.target.value)} />
            <textarea className={s.input} aria-label="Mô tả bước mới" placeholder="Mô tả (không bắt buộc)" rows={2} value={newItemDescription} onChange={(event) => setNewItemDescription(event.target.value)} />
            <button className={s.btn} disabled={busy !== null} style={{ justifySelf: 'start' }}>{busy === 'new-item' ? 'Đang thêm…' : 'Thêm bước'}</button>
          </form>}
        </div>
      )}
    </article>
  );
}
