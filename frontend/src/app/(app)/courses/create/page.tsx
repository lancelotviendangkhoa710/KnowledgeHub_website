'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getCurrentUser, setCurrentUser, subscribeCurrentUser, AuthUser } from '@/lib/auth';
import { getAccessToken } from '@/lib/authToken';
import { accountClient } from '@/lib/accountClient';
import {
  DRAFT_STORAGE_KEY,
  LOCAL_STUDIO_DRAFT_KEY,
  LEGACY_SAMPLE_CONTENT,
  StoredDraft,
  ViewMode,
} from '@/components/content/editor/editorConstants';
import {
  groupCategories,
  buildTocItems,
  countWords,
  buildQualityChecks,
  generateSlug,
  flattenCategories,
  hasDraftContent,
} from '@/components/content/editor/editorUtils';
import { useDraftAutosave } from '@/components/content/editor/hooks/useDraftAutosave';
import { useEditorLoaders } from '@/components/content/editor/hooks/useEditorLoaders';
import { useEditorFormatting } from '@/components/content/editor/hooks/useEditorFormatting';
import { EditorHeader } from '@/components/content/editor/EditorHeader';
import { DraftRecoveryBanner } from '@/components/content/editor/DraftRecoveryBanner';
import { EditorNotices } from '@/components/content/editor/EditorNotices';
import { CourseInfoPanel } from '@/components/content/editor/CourseInfoPanel';
import { ContentEditor } from '@/components/content/editor/ContentEditor';
import { VideoDialog } from '@/components/content/editor/VideoDialog';
import { EditorToolbar } from '@/components/content/editor/EditorToolbar';
import { PublishChecklist } from '@/components/content/editor/PublishChecklist';
import { ActionBar } from '@/components/content/editor/ActionBar';
import { LivePreviewPanel } from '@/components/content/editor/LivePreviewPanel';
import styles from '@/components/content/editor/editorLayout.module.css';
import ConfirmDialog from '@/components/content/admin/ConfirmDialog';
import { EditorAccessDenied } from '@/components/content/editor/EditorAccessDenied';

/**
 * Contributor Studio (`/courses/create`): authors new courses or revisions (`?parent_id=`),
 * loading categories/tags and the parent course from the live API with cold-start retries,
 * retryable error notices, and save guards while revision data is not available.
 */
export default function ContributorCourseCreatePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser);
  const [authChecked, setAuthChecked] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugLocked, setIsSlugLocked] = useState(true);
  const [categoryId, setCategoryId] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagNotice, setTagNotice] = useState<string | null>(null);
  const [publishAttempted, setPublishAttempted] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [content, setContent] = useState('');
  const {
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
  } = useEditorLoaders({ setCategoryId, setTitle, setContent, setSelectedTags });

  // Category hierarchy grouping (Domains and Sub-categories)
  const groupedCategories = useMemo(() => groupCategories(categories), [categories]);



  const selectedCategory = useMemo(() => {
    return flattenCategories(categories).find((c) => c.id === categoryId) || null;
  }, [categories, categoryId]);
  // Dynamic live Table of Contents tree extracted in real-time from markdown content
  const tocItems = useMemo(() => buildTocItems(content), [content]);

  // Pre-flight Quality Standards Criteria
  const contentWordCount = useMemo(() => countWords(content), [content]);

  const qualityChecks = useMemo(
    () => buildQualityChecks(title, categoryId, selectedCategory, selectedTags, contentWordCount),
    [title, categoryId, selectedCategory, selectedTags, contentWordCount]
  );


  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);

  const { pendingDraft, setPendingDraft, lastSavedNotice, handleRestoreDraft, handleDiscardDraft, saveDraftNow } = useDraftAutosave({
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
  });
  const {
    textareaRef,
    showVideoModal,
    setShowVideoModal,
    showCodeDropdown,
    setShowCodeDropdown,
    showCalloutDropdown,
    setShowCalloutDropdown,
    videoInputUrl,
    setVideoInputUrl,
    videoCustomTitle,
    setVideoCustomTitle,
    videoInsertNotice,
    detectedVideoId,
    insertMarkdown,
    handleInsertCallout,
    handleInsertCodeBlock,
    handleInsertVideo,
  } = useEditorFormatting(content, setContent);



  useEffect(() => {
    return subscribeCurrentUser(() => setUser(getCurrentUser()));
  }, []);

  useEffect(() => {
    const authBearer = getAccessToken();
    const currentUser = getCurrentUser();

    if (!authBearer && !currentUser) {
      router.push('/login?redirect=/courses/create');
      return;
    }

    if (!currentUser && authBearer) {
      accountClient
        .me()
        .then((res) => {
          setCurrentUser(res.data.user);
          setUser(res.data.user);
          setAuthChecked(true);
        })
        .catch(() => {
          router.push('/login?redirect=/courses/create');
        });
    } else {
      setUser(currentUser);
      setAuthChecked(true);
    }
  }, [router]);

  useEffect(() => {
    loadTaxonomy();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // Restore draft if saved before sign-in redirect
      const savedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed.title) setTitle(parsed.title);
          if (parsed.slug) setSlug(parsed.slug);
          if (parsed.categoryId) setCategoryId(parsed.categoryId);
          if (parsed.tags) {
            if (Array.isArray(parsed.tags)) {
              setSelectedTags(parsed.tags);
            } else if (typeof parsed.tags === 'string') {
              setSelectedTags(parsed.tags.split(',').map((t: string) => t.trim()).filter(Boolean));
            }
          }
          if (parsed.content) setContent(parsed.content);
        } catch {
          // ignore corrupted draft
        }
      }

      // Check for local auto-saved draft
      try {
        const rawLocal = localStorage.getItem(LOCAL_STUDIO_DRAFT_KEY);
        if (rawLocal) {
          const parsedLocal: StoredDraft = JSON.parse(rawLocal);
          // Bản nháp cũ chỉ chứa nội dung mẫu (chưa ai sửa) thì coi như trống, không hỏi khôi phục.
          const isLegacyEmpty = !parsedLocal?.title?.trim() && parsedLocal?.content === LEGACY_SAMPLE_CONTENT;
          if (parsedLocal && !isLegacyEmpty && hasDraftContent(parsedLocal)) {
            setPendingDraft(parsedLocal);
          }
        }
      } catch {
        // ignore storage parse error
      }

      const pid = params.get('parent_id');
      if (pid) {
        setParentId(pid);
        loadParentCourse(pid);
      }
    }

    return () => {
      // Abort in-flight loads (and any cold-start backoff) on unmount; resetting the refs lets the
      // StrictMode re-run of this effect start fresh loads instead of being blocked by the guards.
      taxonomyAbortRef.current?.abort();
      taxonomyAbortRef.current = null;
      parentAbortRef.current?.abort();
      parentAbortRef.current = null;
    };
  }, [loadTaxonomy, loadParentCourse, setPendingDraft, taxonomyAbortRef, parentAbortRef]);


  /** Thêm một hoặc nhiều thẻ trong một thao tác: bỏ thẻ rỗng và thẻ trùng, gộp thông báo trùng. */
  const handleAddTag = (raw: string | string[]) => {
    const seen = new Set(selectedTags);
    const fresh: string[] = [];
    const duplicates: string[] = [];
    for (const part of Array.isArray(raw) ? raw : [raw]) {
      const clean = part
        .trim()
        .toLowerCase()
        .replace(/^#+/, '')
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-|-$/g, '');
      if (!clean) continue;
      if (seen.has(clean)) {
        if (!duplicates.includes(clean)) duplicates.push(clean);
      } else {
        seen.add(clean);
        fresh.push(clean);
      }
    }
    setTagNotice(duplicates.length > 0 ? `Thẻ ${duplicates.map((t) => `“${t}”`).join(', ')} đã có.` : null);
    if (fresh.length > 0) setSelectedTags((prev) => [...prev, ...fresh.filter((t) => !prev.includes(t))]);
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tagToRemove));
  };


  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (isSlugLocked) {
      setSlug(generateSlug(val));
    }
  };

  /** True while revision mode cannot safely save (parent still loading or failed to load). */
  const isRevisionBlocked = Boolean(parentId && (parentLoading || parentLoadError));

  /**
   * Leaves revision mode: aborts any parent load, clears revision state and the editor,
   * and drops `?parent_id` from the URL.
   */
  const resetToNewCourse = () => {
    parentAbortRef.current?.abort();
    parentAbortRef.current = null;
    setParentId(null);
    setParentLoadError(null);
    setParentLoading(false);
    setErrorMessage(null);
    setTitle('');
    setSlug('');
    setContent('');
    router.replace('/courses/create');
  };

  const handleSubmit = async (publish: boolean, confirmed = false) => {
    if (publish) setPublishAttempted(true);
    if (parentId && parentLoading) {
      setErrorMessage('Khóa học đang chỉnh sửa vẫn đang tải. Hãy chờ một chút rồi lưu.');
      return;
    }

    if (parentId && parentLoadError) {
      setErrorMessage(
        'Không tải được khóa học đang chỉnh sửa nên chưa thể lưu phiên bản này. Hãy thử tải lại hoặc tạo khóa học mới.'
      );
      return;
    }

    if (!title.trim() || !content.trim()) {
      setErrorMessage('Hãy nhập tên khóa học và nội dung trước khi lưu.');
      return;
    }

    if (publish && !qualityChecks.isAllPassed && !confirmed) {
      setShowPublishConfirm(true);
      return;
    }

    const bearerSession = getAccessToken();
    if (!bearerSession) {
      setErrorMessage('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để soạn khóa học.');
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    let redirectTarget = '/courses';

    try {
      if (parentId) {
        type VersionCreateResponse = {
          status: string;
          message: string;
          data?: { id: string; article_id: string; version_no: number };
        };
        const verRes = await api.post<VersionCreateResponse>(`/v1/articles/${parentId}/versions`, {
          title,
          content,
        });

        if (publish && verRes?.data?.id) {
          await api.post(`/v1/articles/${parentId}/publish`, {
            version_id: verRes.data.id,
          });
        }
        redirectTarget = `/courses/${parentId}`;
      } else {
        type ArticleCreateResponse = {
          status: string;
          message: string;
          data?: { id: string; slug: string; status: string };
        };

        const payload = {
          title,
          slug,
          category_id: categoryId || null,
          content,
          tags: selectedTags,
          status: publish ? undefined : 'draft',
        };

        const res = await api.post<ArticleCreateResponse>('/v1/articles', payload);

        const createdId = res?.data?.id;
        const finalSlug = res?.data?.slug || slug;

        if (publish && createdId) {
          await api.post(`/v1/articles/${createdId}/publish`, {});
        }

        if (finalSlug) {
          redirectTarget = `/courses/${finalSlug}`;
        } else if (createdId) {
          redirectTarget = `/courses/${createdId}`;
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string; errors?: Record<string, string[]> };
      if (errorObj?.status === 401 || errorObj?.message === 'Unauthenticated.') {
        setErrorMessage('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Hãy đăng nhập lại bằng tài khoản người đóng góp.');
      } else if (errorObj?.status && errorObj.status >= 400) {
        const firstErr = errorObj.errors ? Object.values(errorObj.errors)[0]?.[0] : undefined;
        const detail = firstErr || errorObj.message;
        setErrorMessage(`Không lưu được khóa học. Hãy kiểm tra lại thông tin đã nhập.${detail ? ` Chi tiết: ${detail}` : ''}`);
      } else {
        // Chỉ khẳng định "đã giữ bản nháp" khi thật sự ghi được bản mới nhất vào máy.
        const draftKept = saveDraftNow();
        setErrorMessage(
          `Không thực hiện được. Kiểm tra kết nối rồi thử lại.${draftKept ? ' Bản nháp của bạn đã được giữ trên máy này.' : ' Hãy sao chép nội dung của bạn trước khi rời trang.'}${errorObj?.message ? ` Chi tiết: ${errorObj.message}` : ''}`
        );
      }
      setIsSubmitting(false);
      return;
    }

    // Clear saved drafts ONLY upon confirmed successful save or publish
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STUDIO_DRAFT_KEY);
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    }

    setIsSubmitting(false);
    setSuccessMessage(
      parentId
        ? (publish ? 'Đã xuất bản phiên bản mới. Đang chuyển tới trang khóa học...' : 'Đã lưu bản nháp phiên bản. Đang chuyển tới trang khóa học...')
        : (publish ? 'Đã xuất bản khóa học. Đang chuyển tới trang khóa học...' : 'Đã lưu bản nháp khóa học. Đang chuyển tới trang khóa học...')
    );

    setTimeout(() => {
      router.push(redirectTarget);
    }, 1500);
  };

  const isContributorOrAdmin =
    user?.roles?.some((role) => role === 'contributor' || role === 'admin') ?? false;

  if (!authChecked) {
    return (
      <div className={styles.wrap}>
        <p role="status" aria-busy="true" className={styles.loading}>
          Đang kiểm tra quyền truy cập...
        </p>
      </div>
    );
  }

  if (!isContributorOrAdmin) {
    return <EditorAccessDenied />;
  }

  return (
    <div className={styles.wrap}>
      <EditorHeader viewMode={viewMode} setViewMode={setViewMode} />

      {/* Auto-Save Draft Recovery Banner */}
      {pendingDraft && (
        <DraftRecoveryBanner
          pendingDraft={pendingDraft}
          handleRestoreDraft={handleRestoreDraft}
          handleDiscardDraft={handleDiscardDraft}
        />
      )}

      <EditorNotices
        lastSavedNotice={lastSavedNotice}
        parentId={parentId}
        parentLoadError={parentLoadError}
        parentLoading={parentLoading}
        loadParentCourse={loadParentCourse}
        resetToNewCourse={resetToNewCourse}
        errorMessage={errorMessage}
        title={title}
        slug={slug}
        categoryId={categoryId}
        selectedTags={selectedTags}
        content={content}
        taxonomyWaking={taxonomyWaking}
        parentWaking={parentWaking}
        taxonomyError={taxonomyError}
        taxonomyLoading={taxonomyLoading}
        loadTaxonomy={loadTaxonomy}
        successMessage={successMessage}
      />

      {/* Main layout: form + editor on the left (.ep), live preview on the right (.pv) */}
      <div className={styles.ed} data-mode={viewMode}>
        <div className={`${styles.col} ${styles.ep}`}>
          <CourseInfoPanel
            title={title}
            handleTitleChange={handleTitleChange}
            categoryId={categoryId}
            setCategoryId={setCategoryId}
            selectedCategory={selectedCategory}
            groupedCategories={groupedCategories}
            slug={slug}
            setSlug={setSlug}
            isSlugLocked={isSlugLocked}
            setIsSlugLocked={setIsSlugLocked}
            selectedTags={selectedTags}
            tagInput={tagInput}
            setTagInput={setTagInput}
            handleAddTag={handleAddTag}
            handleRemoveTag={handleRemoveTag}
            tagNotice={tagNotice}
            showErrors={publishAttempted}
          />

          {/* Content Body Editor */}
          <ContentEditor content={content} wordCount={contentWordCount} setContent={setContent} textareaRef={textareaRef}>
            <VideoDialog
              videoInsertNotice={videoInsertNotice}
              showVideoModal={showVideoModal}
              setShowVideoModal={setShowVideoModal}
              videoInputUrl={videoInputUrl}
              setVideoInputUrl={setVideoInputUrl}
              videoCustomTitle={videoCustomTitle}
              setVideoCustomTitle={setVideoCustomTitle}
              detectedVideoId={detectedVideoId}
              handleInsertVideo={handleInsertVideo}
            />
            <EditorToolbar
              insertMarkdown={insertMarkdown}
              showCodeDropdown={showCodeDropdown}
              setShowCodeDropdown={setShowCodeDropdown}
              handleInsertCodeBlock={handleInsertCodeBlock}
              showCalloutDropdown={showCalloutDropdown}
              setShowCalloutDropdown={setShowCalloutDropdown}
              handleInsertCallout={handleInsertCallout}
              showVideoModal={showVideoModal}
              setShowVideoModal={setShowVideoModal}
            />
          </ContentEditor>
        </div>

        {/* Live Student Reader Preview */}
        <LivePreviewPanel selectedCategory={selectedCategory} title={title} tocItems={tocItems} content={content} />
      </div>

      {/* Pre-flight Quality Standards Checklist */}
      <PublishChecklist qualityChecks={qualityChecks} />

      {/* Action Buttons */}
      <ActionBar isSubmitting={isSubmitting} isRevisionBlocked={isRevisionBlocked} handleSubmit={handleSubmit} />

      {showPublishConfirm && (
        <ConfirmDialog
          title="Xuất bản khi chưa đạt đủ điều kiện?"
          confirmLabel="Vẫn xuất bản"
          cancelLabel="Quay lại chỉnh sửa"
          busy={false}
          onCancel={() => setShowPublishConfirm(false)}
          onConfirm={() => {
            setShowPublishConfirm(false);
            handleSubmit(true, true);
          }}
        >
          <p>Các điều kiện sau chưa đạt:</p>
          <ul>
            {qualityChecks.items
              .filter((item) => !item.valid)
              .map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
          </ul>
        </ConfirmDialog>
      )}
    </div>
  );
}
