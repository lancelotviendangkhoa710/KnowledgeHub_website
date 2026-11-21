import { vnDateKey } from './roadmapMeta';

/** Ngày dạng 'YYYY-MM-DD' theo lịch Việt Nam; tính toán bằng mốc UTC để không lệch theo múi giờ máy. */
const DAY = 86400000;

/** Năm đang xem. Năm hiện tại hiển thị từ đầu năm tới hôm nay, năm cũ hiển thị trọn năm. */
export type HeatmapYear = number;

export function keyToUtc(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function utcToKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(key: string, days: number): string {
  return utcToKey(keyToUtc(key) + days * DAY);
}

/** 0 = Thứ hai … 6 = Chủ nhật. */
export function mondayIndex(key: string): number {
  return (new Date(keyToUtc(key)).getUTCDay() + 6) % 7;
}

export function todayKey(now = Date.now()): string {
  return vnDateKey(now);
}

/** Năm hiện tại: từ 1/1 tới hôm nay; năm cũ: trọn năm. `rolling` = đang xem năm hiện tại. */
export function rangeFor(year: HeatmapYear, today: string): { from: string; to: string; label: string; rolling: boolean } {
  if (year >= Number(today.slice(0, 4))) return { from: `${today.slice(0, 4)}-01-01`, to: today, label: `năm ${today.slice(0, 4)}`, rolling: true };
  return { from: `${year}-01-01`, to: `${year}-12-31`, label: `năm ${year}`, rolling: false };
}

/** Các năm có thể xem, mới nhất trước: từ năm tham gia tới năm nay (không rõ năm tham gia thì 2 năm gần nhất). */
export function yearsSince(joinedAt: string | null | undefined, today: string): number[] {
  const current = Number(today.slice(0, 4));
  const joined = joinedAt ? Number(vnDateKey(joinedAt).slice(0, 4)) : current - 1;
  const first = Number.isFinite(joined) ? Math.min(joined, current) : current - 1;
  const years: number[] = [];
  for (let y = current; y >= first; y--) years.push(y);
  return years;
}

export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let t = keyToUtc(from), end = keyToUtc(to); t <= end; t += DAY) out.push(utcToKey(t));
  return out;
}

/** Thang 5 mức: 0, 1–2, 3–4, 5–6, từ 7. */
export function level(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

const WEEKDAYS = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật'];

/** "19/11/2026". */
export function shortDate(key: string): string {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

/** "Thứ năm, 19/11/2026". */
export function longDate(key: string): string {
  return `${WEEKDAYS[mondayIndex(key)]}, ${shortDate(key)}`;
}
