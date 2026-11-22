import type { LearningRoadmap, RoadmapLevel, RoadmapStatus, RoadmapTopic } from '@/types/learning';

export type TopicTone = 'sys' | 'prog' | 'data' | 'career' | 'other';

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}

/**
 * Màu chủ đề theo tài liệu bàn giao (mục 3): Hệ thống, Lập trình, Dữ liệu, Nghề nghiệp.
 * Khác với ảnh bìa khóa học, chủ đề lạ dùng màu trung tính thay vì chia theo hash.
 */
/**
 * LRN-DATA-02: danh mục đang có trên KnowledgeHub gán thẳng vào 4 chủ đề, để Python, JavaScript,
 * PHP, Machine Learning, Statistics, API Design không còn rơi vào "Khác". Danh mục mới chưa có
 * trong bảng vẫn đi qua quy tắc theo từ khóa bên dưới.
 */
const TONE_BY_CATEGORY: Record<string, TopicTone> = {
  'system-design': 'sys',
  'api-design': 'prog',
  programming: 'prog',
  python: 'prog',
  javascript: 'prog',
  php: 'prog',
  databases: 'data',
  'data-science': 'data',
  statistics: 'data',
  'machine-learning': 'data',
  'career-soft-skills': 'career',
};

/**
 * Màu riêng cho từng danh mục (8 màu categorical đã kiểm bằng validator của skill dataviz, xem
 * profile.module.css .c1–.c8). Màu theo danh mục, không theo thứ hạng và không ngẫu nhiên: cùng một
 * danh mục luôn cùng màu ở mọi thẻ. Các danh mục hay đi cùng nhau trong lộ trình mẫu được xếp khác màu.
 */
const CATEGORY_SLOT: Record<string, number> = {
  'system-design': 1,
  programming: 2,
  databases: 3,
  python: 4,
  statistics: 5,
  'api-design': 7,
  'data-science': 7,
  'career-soft-skills': 8,
  php: 5,
  javascript: 7,
  'machine-learning': 2,
};
export const TOPIC_SLOTS = 8;

function hashSlot(slug: string): number {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % TOPIC_SLOTS) + 1;
}

/** Ô màu gốc (1–8) của một danh mục. Danh mục mới chưa có trong bảng dùng hash cố định theo slug. */
export function topicSlot(topic: Pick<RoadmapTopic, 'category_slug'>): number {
  return CATEGORY_SLOT[topic.category_slug] ?? hashSlot(topic.category_slug);
}

/**
 * Cặp ô màu đứng cạnh nhau được (1 = qua kiểm tra của validator dataviz ở cả 2 chế độ: phân biệt được
 * với người mù màu đỏ–lục và với mắt thường). Hàng/cột theo thứ tự ô 1–8.
 */
const ADJACENT_OK = ['01111101', '10100010', '11010011', '10101010', '10010110', '10001011', '01111101', '10100110'];
const canTouch = (a: number, b: number) => ADJACENT_OK[a - 1][b - 1] === '1';

/**
 * Gán màu cho các chủ đề của MỘT thanh, theo thứ tự hiển thị: ưu tiên màu gốc của danh mục; nếu màu đó
 * đã dùng trong thanh hoặc khó phân biệt với đoạn đứng ngay trước thì lấy ô màu khác. Tìm có quay lui
 * (backtracking) để không bỏ điều kiện "kề nhau phân biệt được" khi vẫn còn cách gán hợp lệ; chỉ khi
 * không có cách nào (vd. quá 8 chủ đề) mới dùng cách gán tham lam bên dưới.
 */
export function assignTopicSlots(topics: Pick<RoadmapTopic, 'category_slug'>[]): Map<string, number> {
  const slots: number[] = [];
  const taken = new Set<number>();
  const search = (index: number): boolean => {
    if (index === topics.length) return true;
    const base = topicSlot(topics[index]);
    const previous = index > 0 ? slots[index - 1] : null;
    for (let step = 0; step < TOPIC_SLOTS; step += 1) {
      const candidate = ((base - 1 + step) % TOPIC_SLOTS) + 1;
      if (taken.has(candidate) || (previous !== null && !canTouch(previous, candidate))) continue;
      slots[index] = candidate;
      taken.add(candidate);
      if (search(index + 1)) return true;
      taken.delete(candidate);
    }
    return false;
  };
  if (topics.length <= TOPIC_SLOTS && search(0)) {
    return new Map(topics.map((topic, index) => [topic.category_slug, slots[index]]));
  }
  return greedyTopicSlots(topics);
}

function greedyTopicSlots(topics: Pick<RoadmapTopic, 'category_slug'>[]): Map<string, number> {
  const used = new Set<number>();
  const result = new Map<string, number>();
  let previous: number | null = null;
  for (const topic of topics) {
    const base = topicSlot(topic);
    const candidates = [base, ...Array.from({ length: TOPIC_SLOTS }, (_, index) => ((base + index) % TOPIC_SLOTS) + 1)];
    const slot = candidates.find((c) => !used.has(c) && (previous === null || canTouch(previous, c)))
      ?? candidates.find((c) => !used.has(c))
      ?? base;
    used.add(slot);
    result.set(topic.category_slug, slot);
    previous = slot;
  }
  return result;
}

export function topicTone(topic: Pick<RoadmapTopic, 'category_slug' | 'name'>): TopicTone {
  const known = TONE_BY_CATEGORY[topic.category_slug];
  if (known) return known;
  const key = normalize(`${topic.name} ${topic.category_slug}`);
  if (/system|he thong|distributed|architect/.test(key)) return 'sys';
  if (/data|du lieu/.test(key)) return 'data';
  if (/career|soft|nghe nghiep|ky nang/.test(key)) return 'career';
  if (/program|coding|software|lap trinh|code/.test(key)) return 'prog';
  return 'other';
}

/** LRN-FE: nhãn trình độ (learning_roadmaps.level). */
export const LEVEL_LABELS: Record<RoadmapLevel, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
};

/** Tổng giờ học: cộng số thực có thể ra 0.30000000000000004, nên làm tròn 1 chữ số như cột decimal(5,1). */
const HOURS_FORMAT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
export const formatHours = (hours: number) => HOURS_FORMAT.format(hours);

/** LRN-FE: mức độ quan trọng 0–100 chia 3 bậc. Màu dùng một tông brand đậm dần, không dùng màu trạng thái. */
export function importanceTier(value: number): { tone: 'hi' | 'md' | 'lo'; label: string } {
  if (value >= 80) return { tone: 'hi', label: 'Bắt buộc' };
  if (value >= 50) return { tone: 'md', label: 'Nên học' };
  return { tone: 'lo', label: 'Tùy chọn' };
}

export const STATUS_LABELS: Record<RoadmapStatus, string> = {
  active: 'Đang học',
  paused: 'Tạm dừng',
  completed: 'Hoàn thành',
  archived: 'Lưu trữ',
};

export function itemsCount(roadmap: LearningRoadmap): number {
  return roadmap.items_count ?? roadmap.items.length;
}

export function completedCount(roadmap: LearningRoadmap): number {
  return roadmap.completed_count ?? roadmap.items.filter((item) => item.status === 'completed').length;
}

export function progressPercent(roadmap: LearningRoadmap): number {
  const total = itemsCount(roadmap);
  return total ? Math.round((completedCount(roadmap) / total) * 100) : 0;
}

export function lastActivity(roadmap: LearningRoadmap): string {
  return roadmap.last_activity_at ?? roadmap.updated_at;
}

const rtf = typeof Intl !== 'undefined' && 'RelativeTimeFormat' in Intl ? new Intl.RelativeTimeFormat('vi', { numeric: 'auto' }) : null;

/** "3 ngày trước", "hôm qua", "2 tháng trước"… */
export function relativeTime(value: string | null | undefined, now = Date.now()): string {
  if (!value) return '';
  const time = Date.parse(value);
  if (Number.isNaN(time)) return '';
  const seconds = Math.round((time - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return 'vừa xong';
  const table: [number, number, Intl.RelativeTimeFormatUnit][] = [
    [3600, 60, 'minute'], [86400, 3600, 'hour'], [86400 * 30, 86400, 'day'], [86400 * 365, 86400 * 30, 'month'], [Infinity, 86400 * 365, 'year'],
  ];
  const [, divisor, unit] = table.find(([limit]) => abs < limit) ?? table[table.length - 1];
  const amount = Math.round(seconds / divisor);
  // Intl trả "Hôm qua"; chữ này luôn đứng giữa câu ("Cập nhật hôm qua") nên viết thường.
  return rtf ? rtf.format(amount, unit).toLocaleLowerCase('vi') : new Date(time).toLocaleDateString('vi-VN');
}

/** Ngày giờ đầy đủ theo giờ Việt Nam, dùng cho title/tooltip. */
export function fullDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Ngày theo giờ Việt Nam dạng YYYY-MM-DD (khóa nhóm theo ngày). */
export function vnDateKey(value: string | number | Date): string {
  const time = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
  return new Date(time + 7 * 3600 * 1000).toISOString().slice(0, 10);
}
