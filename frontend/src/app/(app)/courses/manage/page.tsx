'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/content/admin/ConfirmDialog';
import { Article } from '@/types/content';
import { archiveArticle, fetchMyArticles, publishArticle } from '@/lib/contentClient';
import { AuthUser, getCurrentUser, setCurrentUser as setGlobalCurrentUser, subscribeCurrentUser } from '@/lib/auth';
import { getAccessToken } from '@/lib/authToken';
import { accountClient } from '@/lib/accountClient';
import StudioHeader from './StudioHeader';
import StudioToolbar from './StudioToolbar';
import StudioTable from './StudioTable';
import { StudioEmpty, StudioLoadError, StudioLoading, StudioNoAccess, StudioNoMatch } from './StudioStates';
import styles from './studio.module.css';
import { matchesQuery, StatusFilter } from './studioUtils';

const LOGIN_URL = '/login?redirect=%2Fcourses%2Fmanage';

export default function ContributorCourseManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser);
  const [authChecked, setAuthChecked] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Article | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    isCancelledRef.current = false;
    return () => {
      isCancelledRef.current = true;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastNotice(msg);
    toastTimerRef.current = setTimeout(() => {
      if (!isCancelledRef.current) setToastNotice(null);
    }, 4000);
  }, []);

  const showError = useCallback((msg: string) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setActionError(msg);
    errorTimerRef.current = setTimeout(() => {
      if (!isCancelledRef.current) setActionError(null);
    }, 5000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const unsub = subscribeCurrentUser(() => {
      if (!cancelled) setUser(getCurrentUser());
    });

    const authBearer = getAccessToken();
    const currentUser = getCurrentUser();

    if (!authBearer && !currentUser) {
      router.push(LOGIN_URL);
      return () => {
        cancelled = true;
        unsub();
      };
    }

    if (!currentUser && authBearer) {
      accountClient
        .me()
        .then((res) => {
          if (cancelled) return;
          setGlobalCurrentUser(res.data.user);
          setUser(res.data.user);
          setAuthChecked(true);
        })
        .catch(() => {
          if (cancelled) return;
          router.push(LOGIN_URL);
        });
    } else {
      setUser(currentUser);
      setAuthChecked(true);
    }

    return () => {
      cancelled = true;
      unsub();
    };
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyArticles();
      if (!isCancelledRef.current) {
        setArticles(data || []);
        setLoadError(false);
      }
    } catch {
      if (!isCancelledRef.current) {
        setLoadError(true);
        setArticles([]);
      }
    } finally {
      if (!isCancelledRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authChecked || !user) return;
    const canWrite = user.roles?.includes('contributor') || user.roles?.includes('admin');
    if (!canWrite) {
      setLoading(false);
      return;
    }
    void loadData();
  }, [authChecked, user, loadData]);

  const counts = useMemo(() => ({
    published: articles.filter((a) => a.status === 'published').length,
    draft: articles.filter((a) => a.status === 'draft').length,
    archived: articles.filter((a) => a.status === 'archived').length,
  }), [articles]);

  const filteredArticles = useMemo(
    () => articles.filter((article) => (status === 'all' || article.status === status) && matchesQuery(article, query)),
    [articles, status, query],
  );

  const handlePublish = async (courseId: string) => {
    setPublishingId(courseId);
    setActionError(null);
    try {
      const updated = await publishArticle(courseId);
      setArticles((prev) =>
        prev.map((a) =>
          a.id === courseId
            ? {
                ...a,
                status: 'published',
                published_at: updated.published_at || new Date().toISOString(),
                published_version: updated.published_version || a.published_version || a.latest_version,
              }
            : a,
        ),
      );
      showToast('Đã xuất bản khóa học');
    } catch {
      showError('Không xuất bản được khóa học. Vui lòng thử lại.');
    } finally {
      setPublishingId(null);
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    const courseId = archiveTarget.id;
    setArchivingId(courseId);
    setArchiveError(null);
    try {
      await archiveArticle(courseId);
      setArticles((prev) => prev.map((a) => (a.id === courseId ? { ...a, status: 'archived' } : a)));
      setArchiveTarget(null);
      showToast('Đã lưu trữ khóa học');
    } catch {
      setArchiveError('Không lưu trữ được khóa học. Vui lòng thử lại.');
    } finally {
      setArchivingId(null);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setStatus('all');
  };

  if (!authChecked) {
    return (
      <div className={styles.wrap}>
        <StudioHeader canCreate={false} />
        <StudioLoading label="Đang kiểm tra quyền truy cập..." />
      </div>
    );
  }

  const canWrite = Boolean(user?.roles?.includes('contributor') || user?.roles?.includes('admin'));
  if (!canWrite) {
    return (
      <div className={styles.wrap}>
        <StudioHeader canCreate={false} />
        <StudioNoAccess />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <StudioHeader canCreate />

      {toastNotice && <div role="status" className={styles.notice}>{toastNotice}</div>}
      {actionError && (
        <div role="alert" className={`${styles.notice} ${styles.err}`}>
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} aria-label="Đóng thông báo lỗi">Đóng</button>
        </div>
      )}

      {loadError ? (
        <StudioLoadError retrying={loading} onRetry={() => void loadData()} />
      ) : loading ? (
        <StudioLoading />
      ) : articles.length === 0 ? (
        <StudioEmpty />
      ) : (
        <>
          <StudioToolbar query={query} onQuery={setQuery} status={status} onStatus={setStatus} counts={counts} />
          {filteredArticles.length === 0 ? (
            <StudioNoMatch onClear={clearFilters} />
          ) : (
            <StudioTable
              articles={filteredArticles}
              publishingId={publishingId}
              archivingId={archivingId}
              onPublish={(id) => void handlePublish(id)}
              onArchive={(article) => { setArchiveError(null); setArchiveTarget(article); }}
            />
          )}
        </>
      )}

      {archiveTarget && (
        <ConfirmDialog
          title="Lưu trữ khóa học này?"
          confirmLabel="Lưu trữ"
          busy={archivingId === archiveTarget.id}
          error={archiveError}
          onConfirm={() => void confirmArchive()}
          onCancel={() => setArchiveTarget(null)}
        >
          Khóa học sẽ được gỡ khỏi danh sách công khai.
        </ConfirmDialog>
      )}
    </div>
  );
}
