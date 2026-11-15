import type { Category } from '@/types/content';
import { getHeadingSlug } from './preview/getHeadingSlug';

export function groupCategories(categories: Category[]) {
  if (!categories || categories.length === 0) return [];

  const topLevel = categories.filter((c) => !c.parent_id);
  const subCats = categories.filter((c) => !!c.parent_id);

  if (subCats.length > 0) {
    return topLevel.map((parent) => ({
      domainName: parent.name,
      parentId: parent.id,
      items: [
        parent,
        ...subCats.filter((s) => s.parent_id === parent.id),
      ],
    }));
  }

  // Flat categories: Group by domain discipline
  const domainMap: Record<string, Category[]> = {
    'Hệ thống và hạ tầng phân tán': [],
    'Cơ sở dữ liệu và lưu trữ': [],
    'AI và học tập thông minh': [],
    'Kiến trúc và kỹ thuật chung': [],
  };

  categories.forEach((cat) => {
    const lower = (cat.slug + ' ' + cat.name).toLowerCase();
    if (lower.includes('distribut') || lower.includes('system') || lower.includes('infra') || lower.includes('network')) {
      domainMap['Hệ thống và hạ tầng phân tán'].push(cat);
    } else if (lower.includes('data') || lower.includes('db') || lower.includes('storage') || lower.includes('postgres')) {
      domainMap['Cơ sở dữ liệu và lưu trữ'].push(cat);
    } else if (lower.includes('ai') || lower.includes('learn') || lower.includes('companion') || lower.includes('model')) {
      domainMap['AI và học tập thông minh'].push(cat);
    } else {
      domainMap['Kiến trúc và kỹ thuật chung'].push(cat);
    }
  });

  return Object.entries(domainMap)
    .filter(([_, list]) => list.length > 0)
    .map(([domainName, items]) => ({
      domainName,
      items,
    }));
}

export function buildTocItems(content: string) {
  if (!content) return [];
  const lines = content.split('\n');
  const items: { id: string; text: string; level: number; hasVideo?: boolean }[] = [];
  const seenIds = new Set<string>();
  let inCode = false;

  lines.forEach((line, idx) => {
    if (line.startsWith('```')) {
      inCode = !inCode;
      return;
    }
    if (inCode) return;

    if (line.startsWith('## ') || line.startsWith('### ')) {
      const isH2 = line.startsWith('## ');
      const text = line.replace(/^#{2,3}\s+/, '').trim();
      const id = getHeadingSlug(text, idx, seenIds);

      let hasVideo = /video|lecture|bài giảng/i.test(text);
      if (!hasVideo) {
        let inCodeFence = false;
        for (let j = idx + 1; j < lines.length; j++) {
          const next = lines[j].trim();
          if (next.startsWith('```')) {
            inCodeFence = !inCodeFence;
            continue;
          }
          if (inCodeFence) continue;
          if (next.startsWith('## ') || next.startsWith('### ')) break;
          if (
            next.match(/^@\[youtube\]\((.+?)\)$/i) ||
            /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtube-nocookie\.com|youtu\.be)\/[^\s]+$/i.test(next)
          ) {
            hasVideo = true;
            break;
          }
        }
      }

      items.push({ id, text, level: isH2 ? 2 : 3, hasVideo });
    }
  });

  return items;
}

export function countWords(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

export function buildQualityChecks(
  title: string,
  categoryId: string,
  selectedCategory: Category | null,
  selectedTags: string[],
  contentWordCount: number
) {
  const titleValid = title.trim().length >= 5 && title.trim().length <= 120;
  const categoryValid = Boolean(categoryId && categoryId.trim().length > 0);
  const tagsValid = selectedTags.length >= 1;
  const contentValid = contentWordCount >= 50;

  const items = [
    {
      id: 'title',
      label: 'Tên khóa học dài 5 đến 120 ký tự',
      valid: titleValid,
      detail: `${title.trim().length}/120 ký tự`,
    },
    {
      id: 'category',
      label: 'Đã chọn danh mục',
      valid: categoryValid,
      detail: selectedCategory ? selectedCategory.name : 'Chưa chọn',
    },
    {
      id: 'tags',
      label: 'Có ít nhất 1 thẻ',
      valid: tagsValid,
      detail: `${selectedTags.length} thẻ`,
    },
    {
      id: 'content',
      label: 'Nội dung từ 50 từ trở lên',
      valid: contentValid,
      detail: `${contentWordCount} từ / tối thiểu 50`,
    },
  ];

  const passedCount = items.filter((i) => i.valid).length;
  const isAllPassed = passedCount === items.length;

  return { items, passedCount, totalCount: items.length, isAllPassed };
}

export function generateSlug(val: string): string {
  return val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Giờ HH:mm theo kiểu Việt Nam (24 giờ) cho bản nháp tự lưu. */
export function formatClock(time: number | Date): string {
  return new Date(time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}
