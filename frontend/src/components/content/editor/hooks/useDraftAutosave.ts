import { useEffect, useState } from 'react';
import { LOCAL_STUDIO_DRAFT_KEY, StoredDraft } from '../editorConstants';
import { formatClock } from '../editorUtils';

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

  // Auto-save draft every 20 seconds if title or content exists and no draft restore prompt is pending
  useEffect(() => {
    // Keep pending restore draft safe from being overwritten while prompt is open
    if (pendingDraft !== null) {
      return;
    }

    const timer = setInterval(() => {
      // Re-verify pendingDraft is null before writing
      if (pendingDraft !== null) {
        return;
      }
      if ((title.trim().length > 0 || selectedTags.length > 0 || content.trim().length > 0) && typeof window !== 'undefined') {
        const draftData: StoredDraft = {
          title,
          slug,
          categoryId,
          tags: selectedTags,
          content,
          isSlugLocked,
          savedAt: Date.now(),
        };
        try {
          localStorage.setItem(LOCAL_STUDIO_DRAFT_KEY, JSON.stringify(draftData));
          setLastSavedNotice(`Đã tự lưu bản nháp lúc ${formatClock(Date.now())}`);
        } catch {
          // ignore localStorage quota error
        }
      }
    }, 20000);

    return () => clearInterval(timer);
  }, [pendingDraft, title, slug, categoryId, selectedTags, content, isSlugLocked]);

  const handleRestoreDraft = () => {
    if (!pendingDraft) return;
    if (pendingDraft.title) setTitle(pendingDraft.title);
    if (pendingDraft.slug) setSlug(pendingDraft.slug);
    if (pendingDraft.categoryId) setCategoryId(pendingDraft.categoryId);
    if (pendingDraft.tags && Array.isArray(pendingDraft.tags)) setSelectedTags(pendingDraft.tags);
    if (pendingDraft.content) setContent(pendingDraft.content);
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

  return { pendingDraft, setPendingDraft, lastSavedNotice, handleRestoreDraft, handleDiscardDraft };
}
