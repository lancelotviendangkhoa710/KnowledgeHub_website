import { getAccessToken } from './authToken';
import { learningProgressClient } from './learningProgressClient';
import { roadmapClient } from './roadmapClient';

const COMPLETED_KEY = 'kh_completed_articles';
const IGNORED_KEY = 'kh_roadmap_sync_ignored';

function readIds(key: string): Set<string> {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return new Set(Array.isArray(list) ? list.filter((entry): entry is string => typeof entry === 'string') : []);
  } catch {
    return new Set();
  }
}

/** Danh sách khóa học người dùng đã bấm "Đánh dấu hoàn thành" trên trình duyệt này (trang bài học). */
export function locallyCompletedArticles(): Set<string> {
  return readIds(COMPLETED_KEY);
}

/** Bước lộ trình người dùng đã chọn "Bỏ qua" trong bảng đồng bộ: không gợi ý lại. */
export function ignoredSyncItems(): Set<string> {
  return readIds(IGNORED_KEY);
}

export function ignoreSyncItems(ids: string[]): void {
  try {
    const next = readIds(IGNORED_KEY);
    for (const id of ids) next.add(id);
    localStorage.setItem(IGNORED_KEY, JSON.stringify([...next]));
  } catch {
    // Không lưu được thì lần sau chỉ gợi ý lại, không ảnh hưởng dữ liệu.
  }
}

export type CourseSyncResult = { updated: number; failed: number };

// Mỗi khóa học một hàng đợi: các lần bấm liên tiếp chạy lần lượt, và mỗi lần chạy dùng trạng thái
// MỚI NHẤT người dùng chọn (`latest`), nên kết quả cuối luôn khớp lần bấm cuối cùng.
const queues = new Map<string, Promise<CourseSyncResult>>();
const latest = new Map<string, boolean>();

async function runSync(articleId: string): Promise<CourseSyncResult> {
  const completed = latest.get(articleId) ?? false;
  if (!getAccessToken()) return { updated: 0, failed: 0 };
  let roadmaps;
  try {
    roadmaps = (await roadmapClient.list(true)).data;
  } catch {
    return { updated: 0, failed: 1 };
  }
  // Tính mục tiêu từ dữ liệu vừa đọc (sau khi lần trước đã ghi xong).
  const targets = roadmaps.flatMap((roadmap) => roadmap.items).filter((item) => item.article_id === articleId
    && (completed ? item.status !== 'completed' && item.status !== 'skipped' : item.status === 'completed'));
  const result: CourseSyncResult = { updated: 0, failed: 0 };
  for (const item of targets) {
    if (latest.get(articleId) !== completed) break; // người dùng đã bấm lại: để lần chạy sau xử lý
    try {
      await learningProgressClient.update(item.id, completed ? 'completed' : 'in_progress');
      result.updated += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}

/**
 * LRN-FE-05: khi người dùng đánh dấu (hoặc bỏ đánh dấu) hoàn thành một khóa học, cập nhật tiến độ của
 * mọi bước gắn khóa học đó trong các lộ trình của chính họ. Bỏ đánh dấu chỉ đưa bước "Đã xong" về
 * "Đang học"; bước đã bỏ qua giữ nguyên. Trả số bước cập nhật được và số lỗi để trang hiển thị.
 */
export function syncCourseCompletion(articleId: string, completed: boolean): Promise<CourseSyncResult> {
  latest.set(articleId, completed);
  const previous = queues.get(articleId) ?? Promise.resolve({ updated: 0, failed: 0 });
  const next = previous.catch(() => ({ updated: 0, failed: 0 })).then(() => runSync(articleId));
  queues.set(articleId, next);
  void next.finally(() => { if (queues.get(articleId) === next) queues.delete(articleId); });
  return next;
}
