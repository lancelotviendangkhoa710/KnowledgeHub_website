import { useEffect, useRef, useState } from 'react';
import { LOCAL_STUDIO_DRAFT_KEY, StoredDraft } from '../editorConstants';
import { formatClock, hasDraftContent } from '../editorUtils';

interface DraftFields {
  title: string;
  slug: string;
  categoryId: string;
  selectedTags: string[];
  content: string;
  isSlugLocked: boolean;
  setTitle: (v: string) => void;
  setSlug: (v: string) => void;
  setCategoryId: (v: string) => void;
  setSelectedTags: (v: string[]) => void;
  setContent: (v: string) => void;
  setIsSlugLocked: (v: boolean) => void;
}

export function useDraftAutosave({
  title,
  slug,
  categoryId,
  selectedTags,
  content,
  isSlugLocked,
  setTitle,
  setSlug,
  setCategoryId,
  setSelectedTags,
  setContent,
  setIsSlugLocked,
}: DraftFields) {
  const [pendingDraft, setPendingDraft] = useState<StoredDraft | null>(null);
  const [lastSavedNotice, setLastSavedNotice] = useState<string | null>(null);

  // Giữ giá trị mới nhất trong ref để lịch tự lưu 20 giây không bị đặt lại sau mỗi ký tự gõ.
  const latest = useRef<StoredDraft>({ title, slug, categoryId, tags: selectedTags, content, isSlugLocked, savedAt: 0 });
  useEffect(() => {
    latest.current = { title, slug, categoryId, tags: selectedTags, content, isSlugLocked, savedAt: 0 };
  });

  const pendingRef = useRef(pendingDraft);
  useEffect(() => {
    pendingRef.current = pendingDraft;
  });

  /**
   * Ghi ngay bản nháp MỚI NHẤT (đọc từ ref, không phải giá trị cũ của một lần gửi đang chờ) và cho biết có ghi được không.
   * Không ghi khi đang có lời nhắc khôi phục (tránh đè bản nháp cũ chưa được xử lý).
   */
  const saveDraftNow = (): boolean => {
    if (pendingRef.current !== null || typeof window === 'undefined' || !hasDraftContent(latest.current)) return false;
    try {
      localStorage.setItem(LOCAL_STUDIO_DRAFT_KEY, JSON.stringify({ ...latest.current, savedAt: Date.now() }));
      return true;
    } catch {
      return false;
    }
  };

  // Tự lưu bản nháp mỗi 20 giây khi đã nhập gì đó và không có lời nhắc khôi phục đang mở
  useEffect(() => {
    // Keep pending restore draft safe from being overwritten while prompt is open
    if (pendingDraft !== null) {
      return;
    }

    const timer = setInterval(() => {
      const draft = latest.current;
      if (hasDraftContent(draft) && typeof window !== 'undefined') {
        try {
          localStorage.setItem(LOCAL_STUDIO_DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
          setLastSavedNotice(`Đã tự lưu bản nháp lúc ${formatClock(Date.now())}`);
        } catch {
          // ignore localStorage quota error
        }
      }
    }, 20000);

    return () => clearInterval(timer);
  }, [pendingDraft]);

  const handleRestoreDraft = () => {
    if (!pendingDraft) return;
    // Trả lại đúng nháp đã lưu, kể cả trường rỗng, để không ghép với dữ liệu đang có trên form.
    if (typeof pendingDraft.title === 'string') setTitle(pendingDraft.title);
    if (typeof pendingDraft.slug === 'string') setSlug(pendingDraft.slug);
    if (typeof pendingDraft.categoryId === 'string') setCategoryId(pendingDraft.categoryId);
    if (Array.isArray(pendingDraft.tags)) setSelectedTags(pendingDraft.tags);
    if (typeof pendingDraft.content === 'string') setContent(pendingDraft.content);
    if (typeof pendingDraft.isSlugLocked === 'boolean') setIsSlugLocked(pendingDraft.isSlugLocked);
    setPendingDraft(null);
    setLastSavedNotice('Đã khôi phục bản nháp từ máy này.');
    setTimeout(() => setLastSavedNotice(null), 4000);
  };

  const handleDiscardDraft = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STUDIO_DRAFT_KEY);
    }
    setPendingDraft(null);
  };

  return { pendingDraft, setPendingDraft, lastSavedNotice, handleRestoreDraft, handleDiscardDraft, saveDraftNow };
}
