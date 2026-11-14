import type { Tag } from '@/types/content';

/** Tên thẻ được coi là cấp độ; chỉ dùng để hiển thị nhãn trên thẻ khóa học. */
export const LEVEL_TAGS = ['Foundation', 'Intermediate', 'Senior'];

const isLevel = (name: string) => LEVEL_TAGS.some((l) => l.toLowerCase() === name.trim().toLowerCase());

/** Cấp độ của khóa học: tên thẻ trùng một cấp độ (không phân biệt hoa thường), hoặc null. */
export function courseLevel(tags: Tag[] | undefined): string | null {
  const tag = tags?.find((t) => isLevel(t.name));
  return tag ? LEVEL_TAGS.find((l) => l.toLowerCase() === tag.name.trim().toLowerCase()) ?? tag.name : null;
}

/**
 * Tách tiêu đề dạng "A — B — C" thành dòng nhỏ A và tiêu đề chính "B — C".
 * Đoạn trùng cấp độ bị bỏ khỏi tiêu đề chính vì nhãn cấp độ đã hiện trên ảnh bìa.
 * Tiêu đề không có dấu "—" (hoặc tách xong không còn gì) được giữ nguyên.
 */
export function splitCourseTitle(title: string, level: string | null): { kicker: string | null; main: string } {
  const parts = title.split(/\s+—\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return { kicker: null, main: title };
  const [kicker, ...rest] = parts;
  const main = rest.filter((p) => !(level && p.toLowerCase() === level.toLowerCase())).join(' — ');
  return main ? { kicker, main } : { kicker: null, main: title };
}

/** Tên thẻ phổ biến nhất (theo articles_count), bỏ các thẻ cấp độ, dùng làm gợi ý tìm kiếm. */
export function popularTagNames(tags: Tag[], limit = 4): string[] {
  return tags
    .filter((t) => !isLevel(t.name) && (t.articles_count ?? 0) > 0)
    .sort((a, b) => (b.articles_count ?? 0) - (a.articles_count ?? 0))
    .slice(0, limit)
    .map((t) => t.name);
}
