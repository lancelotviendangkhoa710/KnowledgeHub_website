import { getAccessToken } from './authToken';
import { learningProgressClient } from './learningProgressClient';
import { roadmapClient } from './roadmapClient';

const COMPLETED_KEY = 'kh_completed_articles';

/** Danh sách khóa học người dùng đã bấm "Đánh dấu hoàn thành" trên trình duyệt này (trang bài học). */
export function locallyCompletedArticles(): Set<string> {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]');
    return new Set(Array.isArray(list) ? list.filter((entry): entry is string => typeof entry === 'string') : []);
  } catch {
    return new Set();
  }
}

/**
 * LRN-FE-05: khi người dùng đánh dấu (hoặc bỏ đánh dấu) hoàn thành một khóa học, cập nhật tiến độ của
 * mọi bước gắn khóa học đó trong các lộ trình của chính họ. Bỏ đánh dấu chỉ đưa bước "Đã xong" về
 * "Đang học"; bước đã bỏ qua giữ nguyên. Trả về số bước đã cập nhật; lỗi mạng không chặn trang bài học.
 */
export async function syncCourseCompletion(articleId: string, completed: boolean): Promise<number> {
  if (!getAccessToken()) return 0;
  try {
    const roadmaps = (await roadmapClient.list(true)).data;
    const targets = roadmaps.flatMap((roadmap) => roadmap.items).filter((item) => item.article_id === articleId
      && (completed ? item.status !== 'completed' && item.status !== 'skipped' : item.status === 'completed'));
    let updated = 0;
    for (const item of targets) {
      try {
        await learningProgressClient.update(item.id, completed ? 'completed' : 'in_progress');
        updated += 1;
      } catch {
        // Bỏ qua bước lỗi; người dùng vẫn cập nhật được ở trang chi tiết lộ trình.
      }
    }
    return updated;
  } catch {
    return 0;
  }
}
