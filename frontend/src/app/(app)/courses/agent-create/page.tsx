'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { agentWorkflowClient, GeneratedCourse } from '@/lib/agentWorkflowClient';
import { errorMessage } from '@/lib/accountClient';
import { useAgentAccess } from '@/lib/useAgentAccess';
import styles from '@/components/agent/agentTools.module.css';

export default function AgentCoursePage() {
  const { user, checking } = useAgentAccess();
  const [topic, setTopic] = useState('');
  const [maxVideos, setMaxVideos] = useState(4);
  const [course, setCourse] = useState<GeneratedCourse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowed = user?.roles?.includes('contributor') && !user?.roles?.includes('admin') || false;

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowed || busy) return;
    setBusy(true);
    setError(null);
    setCourse(null);
    try {
      const response = await agentWorkflowClient.createCourse(topic.trim(), maxVideos);
      setCourse(response.data);
    } catch (caught) {
      setError(errorMessage(caught, 'Không tạo được khóa học. Vui lòng thử lại.'));
    } finally {
      setBusy(false);
    }
  }

  return <main className={styles.page}>
    <p className={styles.eyebrow}>Contributor Studio</p>
    <h1>Tạo khóa học từ video YouTube</h1>
    <p className={styles.lead}>AI tìm một playlist YouTube công khai phù hợp, soạn nội dung học tập và đăng playlist đó thành một khóa học KnowledgeHub.</p>
    {checking ? <p role="status">Đang kiểm tra quyền truy cập...</p> : !user ? <div className={styles.card}><p>Hãy đăng nhập để tạo khóa học.</p><Link className="btn btn-primary" href="/login?redirect=/courses/agent-create">Đăng nhập</Link></div> : !allowed ? <div className={styles.card} role="alert">Chức năng này dành cho Contributor.</div> : <>
      <form className={`${styles.card} ${styles.form}`} onSubmit={(event) => void create(event)}>
        <label className={styles.field}>Chủ đề khóa học
          <input required minLength={3} maxLength={200} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Ví dụ: Python cho người mới bắt đầu" disabled={busy} />
        </label>
        <label className={styles.field}>Số video tối đa
          <select value={maxVideos} onChange={(event) => setMaxVideos(Number(event.target.value))} disabled={busy}>
            {[2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count} video</option>)}
          </select>
        </label>
        <p className={styles.hint}>Khi bạn chọn “Tạo và đăng”, khóa học sẽ được xuất bản ngay sau khi hệ thống kiểm tra video và nội dung. Bạn có thể quản lý khóa học trong Studio.</p>
        <div className={styles.actions}>
          <button className="btn btn-primary" type="submit" disabled={busy || topic.trim().length < 3}>{busy ? 'Đang tìm video và tạo khóa học...' : 'Tạo và đăng khóa học'}</button>
          <Link className="btn btn-secondary" href="/courses/manage">Về Studio</Link>
        </div>
      </form>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {course && <section className={styles.card} aria-live="polite">
        <p className={styles.success} role="status">Đã đăng khóa học thành công.</p>
        <h2>{course.title}</h2>
        <p className={styles.hint}>{course.lessons.length} video trong khóa học.</p>
        {course.source_playlist_id && <p><a href={`https://www.youtube.com/playlist?list=${encodeURIComponent(course.source_playlist_id)}`} target="_blank" rel="noopener noreferrer">Playlist gốc: {course.source_playlist_title || course.source_playlist_id}</a></p>}
        <ol className={styles.list}>{course.lessons.map((lesson) => <li key={lesson.video_id}>
          <strong>{lesson.title}</strong>
          <p>{lesson.learning_objective}</p>
          <a href={`https://www.youtube.com/watch?v=${encodeURIComponent(lesson.video_id)}`} target="_blank" rel="noopener noreferrer">Xem video gốc</a>
        </li>)}</ol>
        <Link className="btn btn-primary" href={`/courses/${encodeURIComponent(course.slug)}`}>Xem khóa học</Link>
      </section>}
    </>}
  </main>;
}
