import type { Article } from '@/types/content';

export type StatusFilter = 'all' | 'published' | 'draft' | 'archived';

/** Tên hiển thị của khóa học: ưu tiên bản đang xuất bản, rồi bản mới nhất, cuối cùng là slug. */
export function courseTitle(article: Article): string {
  return article.published_version?.title || article.latest_version?.title || article.slug;
}

/** Bỏ dấu và chữ hoa để tìm không phân biệt dấu (đ thành d). */
export function normalizeText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}

export function matchesQuery(article: Article, query: string): boolean {
  const q = normalizeText(query.trim());
  if (!q) return true;
  return normalizeText(courseTitle(article)).includes(q) || normalizeText(article.slug || '').includes(q);
}

/** dd/mm/yyyy theo giờ máy, hoặc dấu gạch khi không có ngày hợp lệ. */
export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
