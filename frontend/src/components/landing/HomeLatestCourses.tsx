'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CourseCard from '@/components/content/CourseCard';
import { fetchArticlesPage } from '@/lib/contentClient';
import { getAccessToken } from '@/lib/authToken';
import { api } from '@/lib/api';
import type { Article } from '@/types/content';
import s from './home.module.css';

const LATEST_COUNT = 6;

/** "Khóa học mới cập nhật": các khóa xuất bản gần nhất (API trả mới nhất trước), kèm tổng số khóa. */
export default function HomeLatestCourses() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const result = await fetchArticlesPage({ page: 1, perPage: LATEST_COUNT }, { signal: controller.signal });
        let items = result.items;
        if (getAccessToken()) {
          try {
            const res = await api.get<{ data: Article[] }>('/v1/bookmarks');
            if (res?.data && Array.isArray(res.data)) {
              const ids = new Set(res.data.map((b) => b.id));
              items = items.map((a) => ({ ...a, is_bookmarked: ids.has(a.id) }));
            }
          } catch {
            // Không lấy được mục đã lưu thì vẫn hiện khóa học bình thường.
          }
        }
        if (controller.signal.aborted) return;
        setArticles(items);
        setTotal(result.meta.total);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    })();
    return () => controller.abort();
  }, []);

  return (
    <section className={s.sec}>
      <div className={s.secHead}>
        <h2>Khóa học mới cập nhật</h2>
        <Link href="/courses">{total !== null ? `Xem tất cả ${total} khóa` : 'Xem tất cả khóa học'}</Link>
      </div>
      {failed ? (
        <p className={s.muted}>Chưa tải được danh sách khóa học. Bạn vẫn có thể <Link href="/courses">mở thư viện khóa học</Link>.</p>
      ) : (
        <div className={s.grid}>
          {articles.map((article) => (
            <CourseCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </section>
  );
}
