import { useCallback, useRef, useState, Dispatch, SetStateAction } from 'react';
import { Category } from '@/types/content';
import { fetchCategories, fetchArticle, ApiReadOptions } from '@/lib/contentClient';

export function useEditorLoaders({
  setCategoryId,
  setTitle,
  setContent,
  setSelectedTags,
}: {
  setCategoryId: Dispatch<SetStateAction<string>>;
  setTitle: Dispatch<SetStateAction<string>>;
  setContent: Dispatch<SetStateAction<string>>;
  setSelectedTags: Dispatch<SetStateAction<string[]>>;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [taxonomyLoading, setTaxonomyLoading] = useState<boolean>(false);
  const [parentLoadError, setParentLoadError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [parentLoading, setParentLoading] = useState<boolean>(false);
  // Cold-start status (backend waking up) and in-flight guards against duplicate concurrent loads.
  const [taxonomyWaking, setTaxonomyWaking] = useState<boolean>(false);
  const [parentWaking, setParentWaking] = useState<boolean>(false);
  // Controller of each load in flight (null when idle); doubles as the duplicate-load guard and is aborted on unmount.
  const taxonomyAbortRef = useRef<AbortController | null>(null);
  const parentAbortRef = useRef<AbortController | null>(null);

  /**
   * Loads the categories. Guarded against concurrent runs (Retry reuses it);
   * the controller is aborted on unmount.
   */
  const loadTaxonomy = useCallback(async () => {
    if (taxonomyAbortRef.current) return;
    const controller = new AbortController();
    taxonomyAbortRef.current = controller;
    setTaxonomyLoading(true);
    setTaxonomyError(null);
    setTaxonomyWaking(false);
    const readOptions: ApiReadOptions = {
      signal: controller.signal,
      onRetry: () => {
        if (!controller.signal.aborted) setTaxonomyWaking(true);
      },
    };
    try {
      const cats = await fetchCategories(readOptions);
      if (controller.signal.aborted) return;
      setCategories(cats);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      controller.abort();
      setTaxonomyError(
        err instanceof Error && err.message
          ? err.message
          : 'Không kết nối được tới máy chủ KnowledgeHub.'
      );
    } finally {
      // Only the current load may clear its state (an aborted one was unmounted or superseded).
      if (taxonomyAbortRef.current === controller) {
        taxonomyAbortRef.current = null;
        setTaxonomyLoading(false);
        setTaxonomyWaking(false);
      }
    }
  }, []);

  /**
   * Prefills the editor from the parent course in revision mode (`?parent_id=`).
   * Failures are surfaced so a revision is never silently written from scratch.
   */
  const loadParentCourse = useCallback(async (pid: string) => {
    if (parentAbortRef.current) return;
    const controller = new AbortController();
    parentAbortRef.current = controller;
    setParentLoading(true);
    setParentLoadError(null);
    setParentWaking(false);
    try {
      const art = await fetchArticle(pid, {
        signal: controller.signal,
        onRetry: () => {
          if (!controller.signal.aborted) setParentWaking(true);
        },
      });
      if (controller.signal.aborted) return;
      if (!art) {
        setParentLoadError({
          message: 'Không tìm thấy khóa học gốc. Có thể khóa học đã bị xóa hoặc đường dẫn không đúng.',
          retryable: false,
        });
        return;
      }
      const v = art.published_version || art.latest_version;
      if (v) {
        // Prefill only empty fields so a late response never overwrites what the author already typed or restored.
        setTitle((prev) => (prev.trim() ? prev : `Revision: ${v.title}`));
        setContent((prev) => (prev.trim() ? prev : v.content));
      }
      if (art.category_id) {
        setCategoryId(art.category_id);
      }
      if (art.tags?.length) {
        // Chỉ nạp khi ô thẻ còn trống, để không ghi đè thẻ người soạn đã nhập hoặc khôi phục.
        setSelectedTags((prev) => (prev.length ? prev : art.tags!.map((t) => t.slug || t.name.toLowerCase())));
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const detail = err instanceof Error && err.message ? err.message : 'Lỗi không xác định.';
      setParentLoadError({
        message: `Không tải được khóa học đang chỉnh sửa: ${detail}`,
        retryable: true,
      });
    } finally {
      if (parentAbortRef.current === controller) {
        parentAbortRef.current = null;
        setParentLoading(false);
        setParentWaking(false);
      }
    }
  }, [setCategoryId, setContent, setSelectedTags, setTitle]);

  return {
    categories,
    taxonomyError,
    taxonomyLoading,
    taxonomyWaking,
    parentLoadError,
    setParentLoadError,
    parentLoading,
    setParentLoading,
    parentWaking,
    taxonomyAbortRef,
    parentAbortRef,
    loadTaxonomy,
    loadParentCourse,
  };
}
