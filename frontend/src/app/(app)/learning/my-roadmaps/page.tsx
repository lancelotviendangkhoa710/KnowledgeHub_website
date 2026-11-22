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

  const aiRoadmaps = roadmaps.filter((roadmap) => roadmap.origin === 'ai');
  const previous = roadmaps.filter((roadmap) => roadmap.origin !== 'ai');

  function renderList(entries: LearningRoadmap[]) {
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
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div className={styles.row}>
          <div>
            <h1>Lộ trình của tôi</h1>
            <p>Tiếp tục kế hoạch học đã tạo và theo dõi từng bước.</p>
          </div>
          <div className={styles.btns}>
            <Link className={styles.btn} href="/learning/my-roadmaps/new">＋ Tạo lộ trình</Link>
            <Link className={`${styles.btn} ${styles.btnGhost}`} href="/ai/companion">Tạo bằng AI</Link>
            <Link className={`${styles.btn} ${styles.btnGhost}`} href="/learning/roadmaps">Xem lộ trình mẫu</Link>
          </div>
        </div>
      </header>

      {error && <div className={styles.error} role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Thử lại</button></div>}
      {loading ? <p role="status" className={styles.state}>Đang tải lộ trình của bạn…</p> : (
        <div className={styles.mine}>
          <section aria-label="Lộ trình do trợ lý AI tạo">
            {aiRoadmaps.length === 0
              ? (
                <p className={styles.emptyMain}>
                  Chưa có lộ trình AI nào. <Link href="/learning/my-roadmaps/new">Tự tạo lộ trình</Link>,{' '}
                  <Link href="/learning/roadmaps">dùng một lộ trình mẫu</Link> hoặc <Link href="/ai/companion">nhờ trợ lý AI</Link>.
                </p>
              )
              : renderList(aiRoadmaps)}
          </section>
          <aside className={styles.aside} aria-labelledby="previous-roadmaps-heading">
            <h2 id="previous-roadmaps-heading">Lộ trình tự tạo</h2>
            {previous.length === 0
              ? <p className={styles.empty}>Chưa có lộ trình tự tạo. Bấm “＋ Tạo lộ trình” để bắt đầu từ trang trống hoặc từ một lộ trình mẫu.</p>
              : <>
                  <p className={styles.hint}>Lộ trình bạn tự tạo, kể cả những lộ trình lưu trước khi có trợ lý AI.</p>
                  {renderList(previous)}
                </>}
          </aside>
        </div>
      )}
    </div>
  );
}
