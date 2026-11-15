'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CourseCard from '@/components/content/CourseCard';
import { Article } from '@/types/content';
import { api } from '@/lib/api';
import { setCurrentUser } from '@/lib/auth';
import { getAccessToken, setAccessToken } from '@/lib/authToken';
import styles from './bookmarks.module.css';

const LOGIN_URL = '/login?redirect=%2Fbookmarks';

// The API answers with a Laravel paginator; only the fields used here are typed.
type BookmarkPage = { data: Article[]; last_page?: number };

export default function BookmarksPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const requestRef = useRef(0);
  const listTopRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async (target: number) => {
    const session = getAccessToken();
    if (!session) {
      setRedirecting(true);
      router.replace(LOGIN_URL);
      return;
    }
    const request = ++requestRef.current;
    setLoading(true);
    setFailed(false);
    try {
      const result = await api.get<BookmarkPage>(`/v1/bookmarks?page=${target}`);
      if (request !== requestRef.current) return; // a newer request owns the page
      if (getAccessToken() !== session) {
        setRedirecting(true);
        router.replace(LOGIN_URL);
        return;
      }
      const pages = Math.max(1, Number(result.last_page) || 1);
      if (target > pages) { // the last page emptied meanwhile: go back to the new last page
        setPage(pages);
        return;
      }
      setArticles(Array.isArray(result.data) ? result.data.map((a) => ({ ...a, is_bookmarked: true })) : []);
      setLastPage(pages);
    } catch (caught) {
      if (request !== requestRef.current) return;
      if ((caught as { status?: number }).status === 401) {
        // The 401 belongs to the session that sent the request; a different user signed in meanwhile must stay signed in.
        if (getAccessToken() !== session) { void load(target); return; } // reload for the user who is signed in now
        setAccessToken(null);
        setCurrentUser(null);
        setRedirecting(true);
        router.replace(LOGIN_URL);
        return;
      }
      setFailed(true); // never fall through to the empty state: an error is not "nothing saved"
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load(page);
    // Unmount (or a new page number) invalidates the request in flight so its answer cannot redirect or overwrite anything.
    return () => { requestRef.current += 1; };
  }, [load, page]);

  if (redirecting) return null;

  const goToPage = (target: number) => {
    setPage(Math.min(Math.max(1, target), lastPage));
    listTopRef.current?.scrollIntoView({ block: 'start' });
    listTopRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h1>Đã lưu</h1>
        <p>Các khóa học bạn đánh dấu để học sau.</p>
      </header>

      <div ref={listTopRef} tabIndex={-1} style={{ outline: 'none' }}>
        {failed ? (
          <div role="alert" className={styles.state}>
            <div className={styles.stateIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h2>Không tải được danh sách đã lưu</h2>
            <p>Hãy kiểm tra kết nối hoặc thử lại.</p>
            <button type="button" className={styles.btn} onClick={() => void load(page)} disabled={loading} aria-busy={loading}>
              {loading ? 'Đang thử lại...' : 'Thử lại'}
            </button>
          </div>
        ) : loading && articles.length === 0 ? (
          <p role="status" className={styles.loading}>Đang tải khóa học đã lưu…</p>
        ) : articles.length === 0 ? (
          <div className={styles.state}>
            <div className={styles.stateIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
            </div>
            <h2>Bạn chưa lưu khóa học nào</h2>
            <p>Bấm biểu tượng đánh dấu trên thẻ khóa học để lưu lại và học sau.</p>
            <Link className={styles.btn} href="/courses">Khám phá khóa học</Link>
          </div>
        ) : (
          <>
            {/* Unsaving here keeps the card in place (it can be saved again); it is gone on the next load. */}
            <div className={styles.grid} aria-busy={loading}>
              {articles.map((article) => <CourseCard key={article.id} article={article} />)}
            </div>
            {lastPage > 1 && <Pagination currentPage={page} lastPage={lastPage} onChange={goToPage} />}
          </>
        )}
      </div>
    </div>
  );
}

type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

// Same page list as the Courses page pager.
function getPageItems(current: number, last: number): PageItem[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  let start = Math.max(2, current - 1);
  let end = Math.min(last - 1, current + 1);
  if (current <= 3) { start = 2; end = 4; } else if (current >= last - 2) { start = last - 3; end = last - 1; }
  if (start === 3) start = 2;
  if (end === last - 2) end = last - 1;
  const items: PageItem[] = [1];
  if (start > 2) items.push('ellipsis-start');
  for (let p = start; p <= end; p++) items.push(p);
  if (end < last - 1) items.push('ellipsis-end');
  items.push(last);
  return items;
}

function Pagination({ currentPage, lastPage, onChange }: { currentPage: number; lastPage: number; onChange: (page: number) => void }) {
  return (
    <nav aria-label="Phân trang">
      <ul className={styles.pager}>
        <li><button type="button" onClick={() => onChange(currentPage - 1)} disabled={currentPage <= 1} aria-label="Trang trước">Trước</button></li>
        {getPageItems(currentPage, lastPage).map((item) => typeof item === 'number' ? (
          <li key={item}>
            <button type="button" onClick={() => onChange(item)} aria-label={`Trang ${item}`} aria-current={item === currentPage ? 'page' : undefined}>{item}</button>
          </li>
        ) : (
          <li key={item} aria-hidden="true" className={styles.gap}>&hellip;</li>
        ))}
        <li><button type="button" onClick={() => onChange(currentPage + 1)} disabled={currentPage >= lastPage} aria-label="Trang sau">Sau</button></li>
      </ul>
    </nav>
  );
}
