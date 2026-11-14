import type { Category } from '@/types/content';

export type CoverTheme = 'sys' | 'prog' | 'data' | 'career';

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/** Chủ đề màu của một danh mục; danh mục lạ được chia đều theo hash để vẫn nhất quán. */
export function coverTheme(category: Category | null | undefined): CoverTheme {
  if (!category) return 'sys';
  const key = normalize(`${category.name} ${category.slug}`);
  if (/system|he thong|distributed|architect/.test(key)) return 'sys';
  if (/data|du lieu/.test(key)) return 'data';
  if (/career|soft|nghe nghiep|ky nang/.test(key)) return 'career';
  if (/program|coding|software|lap trinh|code/.test(key)) return 'prog';
  return (['sys', 'prog', 'data', 'career'] as const)[hash(category.id) % 4];
}
