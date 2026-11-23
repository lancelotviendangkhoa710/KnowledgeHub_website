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
  // Chỉ báo "chưa có lộ trình" sau khi đã tải thành công ít nhất một lần.
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
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
      setLoaded(true);
    } catch (caught) {
      if ((caught as { status?: number }).status === 401) {
        setRoadmaps([]);
        router.replace('/login?redirect=%2Flearning%2Fmy-roadmaps');
      } else {
        setError('Không tải được lộ trình của bạn. Hãy kiểm tra kết nối rồi thử lại.');
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
    if (deletingRef.current.has(roadmap.id) || !window.confirm(`Xóa lộ trình “${roadmap.title}” cùng toàn bộ các bước?`)) return;
    deletingRef.current.add(roadmap.id);
    setDeletingIds([...deletingRef.current]);
    setError(null);
    try {
      await roadmapClient.remove(roadmap.id);
      setRoadmaps((current) => current.filter((entry) => entry.id !== roadmap.id));
    } catch {
      setError('Không xóa được lộ trình này. Hãy tải lại trang rồi thử lại.');
    } finally {
      deletingRef.current.delete(roadmap.id);
      setDeletingIds([...deletingRef.current]);
    }
  }

  // Một danh sách chung cho mọi lộ trình của tài khoản (tự tạo, từ mẫu, AI), mới cập nhật lên trước;
  // lộ trình AI được đánh dấu bằng nhãn AI ở góc phải thẻ (RoadmapCard).
  const term = query.trim().toLowerCase();
  const sorted = [...roadmaps].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const shown = sorted.filter((roadmap) => !term || roadmap.title.toLowerCase().includes(term) || roadmap.goal.toLowerCase().includes(term));
  const aiCount = roadmaps.filter((roadmap) => roadmap.origin === 'ai').length;

  function renderList(entries: LearningRoadmap[]) {
    return <div className={styles.list}>{entries.map((roadmap) => (
      <RoadmapCard
        key={roadmap.id}
        roadmap={roadmap}
        onDelete={() => void remove(roadmap)}
        deleting={deletingIds.includes(roadmap.id)}
      />
    ))}</div>;
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div className={styles.titleRow}>
          <h1>Lộ trình của tôi</h1>
          <Link href="/learning/roadmaps" className={styles.subLink}>Xem lộ trình mẫu →</Link>
        </div>
        <p>Mọi lộ trình bạn đã tạo, tự tạo hay nhờ trợ lý AI, ở cùng một chỗ.</p>
      </header>

      {/* Thanh công cụ như trang Repositories của GitHub: tìm kiếm bên trái, hành động chính bên phải. */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setQuery(''); }} placeholder="Tìm lộ trình theo tên hoặc mục tiêu…" aria-label="Tìm lộ trình của tôi" />
        </div>
        <div className={styles.btns}>
          <Link className={`${styles.btn} ${styles.btnGhost}`} href="/ai/companion">Tạo bằng AI</Link>
          <Link className={styles.btn} href="/learning/my-roadmaps/new">＋ Tạo lộ trình</Link>
        </div>
      </div>

      {error && <div className={styles.error} role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Thử lại</button></div>}
      {loading ? <p role="status" className={styles.state}>Đang tải lộ trình của bạn…</p> : (
        <section aria-label="Danh sách lộ trình của tôi">
          {!loaded ? null : roadmaps.length === 0 ? (
            <p className={styles.emptyMain}>
              Chưa có lộ trình nào. <Link href="/learning/my-roadmaps/new">Tự tạo lộ trình</Link>,{' '}
              <Link href="/learning/roadmaps">dùng một lộ trình mẫu</Link> hoặc <Link href="/ai/companion">nhờ trợ lý AI</Link>.
            </p>
          ) : (
            <>
              <p className={styles.count} aria-live="polite">
                {term ? `${shown.length} / ${roadmaps.length} lộ trình` : `${roadmaps.length} lộ trình`}
                {aiCount > 0 && !term && <> · {aiCount} do trợ lý AI tạo</>}
              </p>
              {shown.length === 0
                ? <p className={styles.emptyMain}>Không có lộ trình nào khớp với “{query.trim()}”.</p>
                : renderList(shown)}
            </>
          )}
        </section>
      )}
    </div>
  );
}
