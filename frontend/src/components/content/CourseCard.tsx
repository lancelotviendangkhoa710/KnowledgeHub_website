'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Article, Category } from '@/types/content';
import { getAccessToken } from '@/lib/authToken';
import { api } from '@/lib/api';
import { courseLevel, splitCourseTitle } from '@/lib/courseDisplay';
import styles from './CourseCard.module.css';

interface CourseCardProps {
  article: Article;
}

type CoverTheme = 'sys' | 'prog' | 'data' | 'career';

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}

/** Hash ổn định của một chuỗi, dùng để chọn màu/hình bìa khi không đoán được từ tên danh mục. */
function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/** Chọn chủ đề màu của ảnh bìa theo tên danh mục; danh mục lạ được chia đều theo hash để vẫn nhất quán. */
function coverTheme(category: Category | null | undefined): CoverTheme {
  if (!category) return 'sys';
  const key = normalize(`${category.name} ${category.slug}`);
  if (/system|he thong|distributed|architect/.test(key)) return 'sys';
  if (/data|du lieu/.test(key)) return 'data';
  if (/career|soft|nghe nghiep|ky nang/.test(key)) return 'career';
  if (/program|coding|software|lap trinh|code/.test(key)) return 'prog';
  return (['sys', 'prog', 'data', 'career'] as const)[hash(category.id) % 4];
}

/** Mô tả ngắn từ nội dung Markdown: bỏ cú pháp thô như @[youtube](...), ảnh, liên kết, khối mã, tiêu đề và bảng. */
function buildExcerpt(content: string | undefined) {
  if (!content) return '';
  const text = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/@\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^[#>|-].*$/gm, '')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 140 ? `${text.slice(0, 140).trimEnd()}...` : text;
}

export default function CourseCard({ article }: CourseCardProps) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(article.is_bookmarked ?? false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const authBearer = getAccessToken();
    if (!authBearer) {
      setNotice('Hãy đăng nhập để lưu khóa học');
      router.push('/login?redirect=/courses');
      return;
    }

    if (isPending) return;
    const nextState = !bookmarked;
    setIsPending(true);
    setBookmarked(nextState);
    setNotice(null);

    try {
      if (nextState) {
        await api.post(`/v1/articles/${article.id}/bookmark`, {});
      } else {
        await api.delete(`/v1/articles/${article.id}/bookmark`);
      }
    } catch {
      setBookmarked(!nextState);
      setNotice('Không cập nhật được mục đã lưu. Vui lòng thử lại.');
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setIsPending(false);
    }
  };

  const version = article.published_version || article.latest_version;
  const level = courseLevel(article.tags);
  const { kicker, main: title } = splitCourseTitle(version?.title || 'Khóa học chưa có tiêu đề', level);
  const excerpt = buildExcerpt(version?.content) || 'Nội dung khóa học đã được biên tập.';
  const theme = coverTheme(article.category);
  const art = ['', styles.v1, styles.v2][hash(article.id) % 3];
  const authorName = article.author?.name || 'Contributor';

  return (
    <article className={styles.card}>
      <div className={`${styles.cover} ${styles[theme]}`}>
        <span className={styles.pills}>
          <span className={styles.pill}>{article.category?.name ?? 'Khóa học'}</span>
          {article.status === 'draft' && <span className={styles.pill}>Bản nháp</span>}
        </span>
        {level && <span className={styles.pill}>{level}</span>}
        <span className={`${styles.art} ${art}`} aria-hidden="true"><i /><i /><i /></span>
      </div>
      <div className={styles.body}>
        {kicker && <span className={styles.role}>{kicker}</span>}
        <h3 className={styles.title}>
          <Link href={`/courses/${article.slug || article.id}`}>{title}</Link>
        </h3>
        <p className={styles.desc}>{excerpt}</p>
        <div className={styles.foot}>
          <span className={styles.avatar} aria-hidden="true">{authorName[0]}</span>
          <span className={styles.author}>{authorName}</span>
          <div className={styles.saveWrap}>
            <button
              type="button"
              className={styles.save}
              onClick={toggleBookmark}
              disabled={isPending}
              aria-pressed={bookmarked}
              aria-label={bookmarked ? 'Bỏ lưu khóa học' : 'Lưu khóa học'}
              title={bookmarked ? 'Bỏ khỏi mục đã lưu' : 'Lưu vào thư viện của bạn'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16l-6-4-6 4z" /></svg>
            </button>
            {notice && <div role="status" className={styles.notice}>{notice}</div>}
          </div>
        </div>
      </div>
    </article>
  );
}
