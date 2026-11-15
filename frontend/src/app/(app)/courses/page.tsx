'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import CourseCard from '@/components/content/CourseCard';
import { Article, Category } from '@/types/content';
import {
  fetchArticlesPage,
  fetchCategories,
  fetchTags,
  ApiReadOptions,
  PaginationMeta,
  SERVER_WAKING_MESSAGE,
} from '@/lib/contentClient';
import { getCurrentUser, setCurrentUser as setGlobalCurrentUser, subscribeCurrentUser, AuthUser } from '@/lib/auth';
import { getAccessToken } from '@/lib/authToken';
import { accountClient } from '@/lib/accountClient';
import { api } from '@/lib/api';
import { popularTagNames } from '@/lib/courseDisplay';
import s from './courses.module.css';

/** Page size requested from `GET /api/v1/articles` (matches the backend default). */
const COURSES_PER_PAGE = 15;
/** Shape of a category UUID accepted in `?category=`; anything else is ignored and never sent to the API. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads `?page=` as a positive integer; anything else (missing, 0, negative, text) means page 1. */
function parsePageParam(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 1 ? n : 1;
}

/** Reads `?category=` as a category UUID; anything else means "all domains". */
function parseCategoryParam(value: string | null): string {
  return value && UUID_PATTERN.test(value) ? value : 'all';
}

/** Identifies which request produced the course data on screen: 1-based page plus category id or `'all'`. */
interface ResultsKey {
  /** 1-based page number that was requested. */
  page: number;
  /** Category UUID that was requested, or `'all'` for no filter. */
  category: string;
}

/**
 * Public course catalog route (`/courses`). Wraps the catalog in a Suspense boundary because it reads
 * `useSearchParams()`.
 */
export default function CoursesPage() {
  // useSearchParams() needs a Suspense boundary so the route can still be prerendered at build time.
  return (
    <Suspense
      fallback={<div className={s.loading}>Đang tải khóa học...</div>}
    >
      <CoursesCatalog />
    </Suspense>
  );
}

/**
 * Catalog content: server-paginated course grid synced to `?page=` / `?category=`, domain filter pills,
 * client-side search over the current page and the contributor call-to-action strip.
 */
function CoursesCatalog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawPage = searchParams.get('page');
  const rawCategory = searchParams.get('category');
  // The URL is the source of truth for page and category, so refresh/back keep the same view.
  const currentPage = parsePageParam(rawPage);
  const selectedCategory = parseCategoryParam(rawCategory);

  const [articles, setArticles] = useState<Article[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  // Total number of published courses (from the last unfiltered page load) for the "All Domains" pill.
  const [allTotal, setAllTotal] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  // True only after a SUCCESSFUL categories load; a failure never counts as "loaded".
  const [categoriesLoaded, setCategoriesLoaded] = useState<boolean>(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(false);
  // Which request (page + category) produced `articles` / `meta`; differs from the URL after a failed load.
  const [resultsKey, setResultsKey] = useState<ResultsKey | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Gợi ý "Chủ đề hay tìm": thẻ phổ biến nhất. Không thiết yếu, lỗi thì ẩn hàng gợi ý.
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [wakingUp, setWakingUp] = useState<boolean>(false);
  // Controller of the page load currently in flight; a newer load aborts it so rapid clicks never race.
  const loadAbortRef = useRef<AbortController | null>(null);
  const categoriesAbortRef = useRef<AbortController | null>(null);
  const listTopRef = useRef<HTMLElement | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getCurrentUser);
  const [mounted, setMounted] = useState(false); // the signed-in marker is browser-only: read it after mount
  useEffect(() => setMounted(true), []);

  /** Keeps `currentUser` in sync with the auth store and resolves the profile when only a token exists. */
  useEffect(() => {
    const unsub = subscribeCurrentUser(() => setCurrentUser(getCurrentUser()));
    const authBearer = getAccessToken();
    if (authBearer && !getCurrentUser()) {
      accountClient
        .me()
        .then((res) => {
          setGlobalCurrentUser(res.data.user);
          setCurrentUser(res.data.user);
        })
        .catch((err: { status?: number }) => {
          if (err?.status === 401) {
            setGlobalCurrentUser(null);
            setCurrentUser(null);
          }
        });
    }
    return unsub;
  }, []);

  /** Writes page/category to the URL with `replace`, keeping any other query params. */
  const updateQuery = useCallback(
    (page: number, category: string) => {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      if (page > 1) params.set('page', String(page));
      else params.delete('page');
      if (category !== 'all') params.set('category', category);
      else params.delete('category');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  /** Normalises invalid query values in the address bar (e.g. `?page=abc` or `?page=0` → page 1). */
  useEffect(() => {
    // Page 1 is the default, so `?page=1` is also removed to keep one canonical URL per page.
    const pageInvalid = rawPage !== null && (currentPage === 1 || String(currentPage) !== rawPage);
    const categoryInvalid = rawCategory !== null && parseCategoryParam(rawCategory) === 'all';
    if (pageInvalid || categoryInvalid) {
      updateQuery(currentPage, selectedCategory);
    }
  }, [rawPage, rawCategory, currentPage, selectedCategory, updateQuery]);

  /**
   * Loads the domain filter pills. Categories are non-critical: on failure the course list, the active
   * category filter and the page stay as they are, and a non-blocking notice offers its own Retry.
   */
  const loadCategories = useCallback(async () => {
    categoriesAbortRef.current?.abort();
    const controller = new AbortController();
    categoriesAbortRef.current = controller;
    setCategoriesLoading(true);
    try {
      const cats = await fetchCategories({ signal: controller.signal });
      if (controller.signal.aborted) return;
      setCategories(cats);
      setCategoriesError(null);
      setCategoriesLoaded(true);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setCategoriesError(err instanceof Error && err.message ? err.message : 'Không tải được danh sách lĩnh vực.');
    } finally {
      if (categoriesAbortRef.current === controller) {
        categoriesAbortRef.current = null;
        setCategoriesLoading(false);
      }
    }
  }, []);

  /** Loads the categories once on mount and aborts that request on unmount. */
  useEffect(() => {
    loadCategories();
    return () => {
      categoriesAbortRef.current?.abort();
      categoriesAbortRef.current = null;
    };
  }, [loadCategories]);

  /** Loads the popular tag names once for the search suggestions. */
  useEffect(() => {
    const controller = new AbortController();
    fetchTags({ signal: controller.signal })
      .then((tags) => {
        if (!controller.signal.aborted) setPopularTags(popularTagNames(tags));
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  /** Drops a category filter only when a successful categories load proves it does not exist. */
  useEffect(() => {
    if (categoriesLoaded && selectedCategory !== 'all' && !categories.some((c) => c.id === selectedCategory)) {
      updateQuery(1, 'all');
    }
  }, [categoriesLoaded, categories, selectedCategory, updateQuery]);

  /**
   * Loads one page of published courses for a category (`'all'` = no filter). The newest call aborts any
   * load still in flight; on failure the previously shown results and their `resultsKey` are kept.
   */
  const loadPage = useCallback(
    async (page: number, category: string) => {
      // Latest request wins: abort a load that is still in flight (or still retrying during cold start).
      loadAbortRef.current?.abort();
      const controller = new AbortController();
      loadAbortRef.current = controller;
      setLoading(true);
      setLoadError(null);
      setWakingUp(false);
      const readOptions: ApiReadOptions = {
        signal: controller.signal,
        onRetry: () => {
          if (!controller.signal.aborted) setWakingUp(true);
        },
      };
      try {
        const result = await fetchArticlesPage(
          {
            page,
            perPage: COURSES_PER_PAGE,
            categoryId: category === 'all' ? undefined : category,
          },
          readOptions
        );
        if (controller.signal.aborted) return;

        // A page past the end (stale link, courses removed) is invalid: go back to page 1.
        if (result.items.length === 0 && page > result.meta.lastPage) {
          loadAbortRef.current = null; // keep the loading state; the URL change starts the page-1 load
          updateQuery(1, category);
          return;
        }

        let articlesList = result.items;
        const authBearer = getAccessToken();
        if (authBearer) {
          try {
            const bRes = await api.get<{ data: Article[] }>('/v1/bookmarks');
            if (bRes?.data && Array.isArray(bRes.data)) {
              const bIds = new Set(bRes.data.map((b) => b.id));
              articlesList = result.items.map((a) => ({ ...a, is_bookmarked: bIds.has(a.id) }));
            }
          } catch {
            // If bookmarks endpoint is unreachable, fallback to fetched articles
          }
          if (controller.signal.aborted) return;
        }

        setArticles(articlesList);
        setMeta(result.meta);
        setResultsKey({ page, category });
        if (category === 'all') setAllTotal(result.meta.total);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setLoadError(
          err instanceof Error && err.message
            ? err.message
            : 'Không tải được khóa học từ máy chủ KnowledgeHub.'
        );
      } finally {
        // Only the current load may clear the loading state (an aborted one was superseded or unmounted).
        if (loadAbortRef.current === controller) {
          loadAbortRef.current = null;
          setLoading(false);
          setWakingUp(false);
        }
      }
    },
    [updateQuery]
  );

  /** Loads the page/category from the URL whenever either changes; aborts the load on change or unmount. */
  useEffect(() => {
    loadPage(currentPage, selectedCategory);
    return () => {
      loadAbortRef.current?.abort();
      loadAbortRef.current = null;
    };
  }, [loadPage, currentPage, selectedCategory]);

  /** Retries the page/category currently in the URL (and the categories if they failed too). */
  const retryLoad = useCallback(() => {
    loadPage(currentPage, selectedCategory);
    if (categoriesError) loadCategories();
  }, [loadPage, loadCategories, currentPage, selectedCategory, categoriesError]);

  /**
   * Moves both the viewport and keyboard focus to the results, so focus is never lost when the
   * clicked Previous/Next button becomes disabled on the first/last page.
   */
  const scrollToList = () => {
    const el = listTopRef.current;
    if (!el) return;
    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  };

  /**
   * Navigates to a page (clamped to the last page of the shown results). Choosing the page that is
   * already requested but failed to load retries it instead of doing nothing.
   */
  const goToPage = (page: number) => {
    const lastPage = meta?.lastPage ?? 1;
    const target = Math.min(Math.max(1, page), lastPage);
    if (target === currentPage) {
      if (resultsStale && !loading) retryLoad();
      return;
    }
    updateQuery(target, selectedCategory);
    scrollToList();
  };

  /** Selects a domain filter (`'all'` clears it); changing the domain always restarts at page 1. */
  const selectCategory = (categoryId: string) => {
    if (categoryId === selectedCategory) return;
    updateQuery(1, categoryId);
  };

  /** Courses of the current page matching the search box (category filter and pagination are server-side). */
  const filteredArticles = articles.filter((article) => {
    const version = article.published_version || article.latest_version;
    const title = version?.title.toLowerCase() || '';
    const content = version?.content.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    // Cũng khớp tên thẻ, để các gợi ý "Chủ đề hay tìm" (lấy từ tên thẻ) luôn ra đúng khóa có thẻ đó.
    return !q || title.includes(q) || content.includes(q) || (article.tags ?? []).some((t) => t.name.toLowerCase().includes(q));
  });

  /** True when the shown results came from a different page/category than the URL now asks for. */
  const resultsStale =
    resultsKey !== null && (resultsKey.page !== currentPage || resultsKey.category !== selectedCategory);
  /** True when the shown results belong to another domain, so their page count does not apply. */
  const resultsFromOtherCategory = resultsKey !== null && resultsKey.category !== selectedCategory;

  /** Plain-language label for results kept on screen after the requested page/category failed to load. */
  const staleLabel = (() => {
    if (!resultsStale || loading || !resultsKey) return '';
    if (resultsFromOtherCategory) {
      const previousDomain =
        resultsKey.category === 'all'
          ? 'Tất cả lĩnh vực'
          : categories.find((c) => c.id === resultsKey.category)?.name ?? 'lĩnh vực trước';
      return `Vẫn đang hiển thị khóa học của ${previousDomain}${resultsKey.page > 1 ? `, trang ${resultsKey.page}` : ''}: không tải được lĩnh vực đã chọn.`;
    }
    return `Vẫn đang hiển thị trang ${resultsKey.page}: không tải được trang ${currentPage}.`;
  })();

  /** Final result range only (kept while a new page loads, then replaced once it arrives). */
  const summaryText =
    meta && meta.total > 0 && articles.length > 0
      ? `Hiển thị ${meta.from ?? 0}–${meta.to ?? 0} trong ${meta.total} khóa học`
      : '';

  const isGuest = !currentUser && !(mounted && getAccessToken());
  const isContributorOrAdmin =
    currentUser?.roles?.some((r) => r === 'contributor' || r === 'admin') ?? false;

  return (
    <div>
      <section className={s.hero}>
        <div className={s.ghost} aria-hidden="true">KNOWLEDGE</div>
        <div className={s.disc} aria-hidden="true" />
        <div className={s.ring} aria-hidden="true" />
        <div className={s.heroInner}>
          <p className={s.kicker}>Thư viện khóa học</p>
          <h1>Hôm nay bạn muốn học gì?</h1>
          <form className={s.search} role="search" onSubmit={(e) => e.preventDefault()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              type="search"
              placeholder="Raft, ETL, code review, index..."
              aria-label="Tìm khóa học"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className={s.btn} type="submit">Tìm</button>
          </form>
          {popularTags.length > 0 && (
            <div className={s.heroTags}>
              <span>Chủ đề hay tìm</span>
              {popularTags.map((name) => (
                <button key={name} type="button" onClick={() => setSearchQuery(name)}>
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className={s.wrap}>
        <div className={s.filters} role="group" aria-label="Lọc theo lĩnh vực">
          <button type="button" className={s.chip} onClick={() => selectCategory('all')} aria-pressed={selectedCategory === 'all'}>
            Tất cả{allTotal !== null ? <> <span>({allTotal})</span></> : null}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={s.chip}
              onClick={() => selectCategory(cat.id)}
              aria-pressed={selectedCategory === cat.id}
            >
              {cat.name}
            </button>
          ))}
          {meta && meta.lastPage > 1 && !resultsFromOtherCategory && (
            <span className={s.count}>Trang {resultsKey?.page ?? currentPage} trên {meta.lastPage}</span>
          )}
        </div>

        {categoriesError && (
          <div role="status" className={s.note}>
            <span>
              Không tải được danh sách lĩnh vực{selectedCategory !== 'all' ? ', bộ lọc lĩnh vực của bạn vẫn đang áp dụng' : ''}.
            </span>
            <button
              type="button"
              onClick={() => loadCategories()}
              disabled={categoriesLoading}
              aria-busy={categoriesLoading}
              className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
            >
              {categoriesLoading ? 'Đang thử lại...' : 'Thử lại'}
            </button>
          </div>
        )}

        <section ref={listTopRef} tabIndex={-1} aria-label="Kết quả khóa học" className={s.results}>
          <ServerWakingStatus active={wakingUp} />
          {/* Always mounted so screen readers announce each final result range; no transient loading text. */}
          <p aria-live="polite" className={s.summary}>{summaryText}</p>
          {loading && articles.length === 0 ? (
            wakingUp ? null : <div className={s.loading}>Đang tải khóa học...</div>
          ) : loadError && articles.length === 0 ? (
            <LoadErrorBanner message={loadError} onRetry={retryLoad} retrying={loading} />
          ) : (
            <>
              {loadError && (
                <LoadErrorBanner message={loadError} onRetry={retryLoad} retrying={loading} compact />
              )}
              {(loading || staleLabel || (searchQuery && meta && meta.lastPage > 1)) && (
                <p className={s.stale}>
                  {loading ? 'Đang tải…' : staleLabel}
                  {!loading && !staleLabel && searchQuery && meta && meta.lastPage > 1
                    ? 'Ô tìm kiếm chỉ lọc các khóa học trong trang này.'
                    : ''}
                </p>
              )}
              {filteredArticles.length > 0 ? (
                <div className={s.grid} aria-busy={loading}>
                  {filteredArticles.map((article) => (
                    <CourseCard key={article.id} article={article} />
                  ))}
                </div>
              ) : articles.length === 0 && selectedCategory === 'all' ? (
                <div className={s.state}>
                  <h3>Chưa có khóa học nào được xuất bản</h3>
                  <p>Khóa học sẽ xuất hiện ở đây ngay khi người đóng góp xuất bản.</p>
                </div>
              ) : (
                <div className={s.state}>
                  <h3>
                    {searchQuery ? `Không có khóa học nào khớp với “${searchQuery}”` : 'Không có khóa học nào khớp'}
                  </h3>
                  <p>Thử từ khóa ngắn hơn hoặc bỏ bộ lọc lĩnh vực.</p>
                  <button
                    type="button"
                    className={`${s.btn} ${s.btnGhost}`}
                    onClick={() => {
                      selectCategory('all');
                      setSearchQuery('');
                    }}
                  >
                    Đặt lại bộ lọc
                  </button>
                </div>
              )}
              {/* While loading, follow the requested page; after a failed load, mark the page actually shown.
                  Hidden when the shown data belongs to another domain (its page count does not apply). */}
              {meta && resultsKey && !resultsFromOtherCategory && meta.lastPage > 1 && (
                <Pagination
                  currentPage={resultsStale && !loading ? resultsKey.page : currentPage}
                  lastPage={meta.lastPage}
                  onChange={goToPage}
                />
              )}
            </>
          )}
        </section>

        <section className={s.cta}>
          <div>
            <h2>
              {isContributorOrAdmin ? 'Biên soạn và xuất bản khóa học' : 'Bạn muốn viết khóa học?'}
            </h2>
            <p>
              {isContributorOrAdmin
                ? 'Tạo khóa học mới với phiên bản được lưu lại, nội dung Markdown có cấu trúc và xuất bản trực tiếp.'
                : isGuest
                ? 'Nếu bạn là chuyên gia muốn chia sẻ kiến thức, hãy đăng nhập và gửi yêu cầu quyền Contributor trong trang tài khoản.'
                : 'Quyền biên soạn do Quản trị viên cấp. Hãy cập nhật hồ sơ và gửi yêu cầu cho Quản trị viên.'}
            </p>
          </div>
          {isContributorOrAdmin ? (
            <Link href="/courses/create" className={s.btn}>Mở Studio &rarr;</Link>
          ) : isGuest ? (
            <Link href="/login?redirect=/courses" className={s.btn}>Đăng nhập để yêu cầu quyền &rarr;</Link>
          ) : (
            <Link href="/account" className={`${s.btn} ${s.btnGhost}`}>Yêu cầu quyền trong tài khoản &rarr;</Link>
          )}
        </section>
      </div>
    </div>
  );
}

/** One entry of the compact page list: a page number or a gap marker (distinct keys for React). */
type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

/**
 * Compact page list: always the first and last page, a window around the current page,
 * and ellipses for the gaps (e.g. 1 … 4 5 6 … 12). Seven or fewer pages are listed in full.
 */
function getPageItems(current: number, last: number): PageItem[] {
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => i + 1);
  }
  let start = Math.max(2, current - 1);
  let end = Math.min(last - 1, current + 1);
  if (current <= 3) {
    start = 2;
    end = 4;
  } else if (current >= last - 2) {
    start = last - 3;
    end = last - 1;
  }
  // Never hide a single page behind an ellipsis.
  if (start === 3) start = 2;
  if (end === last - 2) end = last - 1;
  const items: PageItem[] = [1];
  if (start > 2) items.push('ellipsis-start');
  for (let page = start; page <= end; page++) items.push(page);
  if (end < last - 1) items.push('ellipsis-end');
  items.push(last);
  return items;
}


/** Phân trang: Trước / số trang / Sau. */
function Pagination({
  currentPage,
  lastPage,
  onChange,
}: {
  currentPage: number;
  lastPage: number;
  onChange: (page: number) => void;
}) {
  const isFirst = currentPage <= 1;
  const isLast = currentPage >= lastPage;

  return (
    <nav aria-label="Phân trang">
      <ul className={s.pager}>
        <li>
          <button type="button" onClick={() => onChange(currentPage - 1)} disabled={isFirst} aria-label="Trang trước">
            Trước
          </button>
        </li>
        {getPageItems(currentPage, lastPage).map((item) =>
          typeof item === 'number' ? (
            <li key={item}>
              <button
                type="button"
                onClick={() => onChange(item)}
                aria-label={`Trang ${item}`}
                aria-current={item === currentPage ? 'page' : undefined}
              >
                {item}
              </button>
            </li>
          ) : (
            <li key={item} aria-hidden="true" className={s.gap}>
              &hellip;
            </li>
          )
        )}
        <li>
          <button type="button" onClick={() => onChange(currentPage + 1)} disabled={isLast} aria-label="Trang sau">
            Sau
          </button>
        </li>
      </ul>
    </nav>
  );
}

/**
 * Trạng thái lỗi khi không tải được danh sách khóa học.
 * `compact` hiện thành thông báo gọn phía trên kết quả cũ thay vì một thẻ đầy đủ.
 */
function LoadErrorBanner({
  message,
  onRetry,
  retrying,
  compact = false,
}: {
  message: string;
  onRetry: () => void;
  retrying: boolean;
  compact?: boolean;
}) {
  const retryButton = (
    <button type="button" onClick={() => onRetry()} disabled={retrying} aria-busy={retrying} className={s.btn}>
      {retrying ? 'Đang thử lại...' : 'Thử lại'}
    </button>
  );

  if (compact) {
    return (
      <div role="alert" className={s.alert}>
        <span>
          <strong>Không làm mới được danh sách khóa học.</strong> {message}
          <small>Hãy kiểm tra kết nối hoặc thử lại.</small>
        </span>
        {retryButton}
      </div>
    );
  }

  return (
    <div role="alert" className={s.state}>
      <div className={s.stateIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3>Không tải được khóa học</h3>
      <p>{message}</p>
      <p>Hãy kiểm tra kết nối hoặc thử lại.</p>
      {retryButton}
    </div>
  );
}

/**
 * Trạng thái nhẹ nhàng (không phải lỗi) khi các yêu cầu GET đang được thử lại lúc backend khởi động nguội.
 * Vùng thông báo luôn có mặt, chỉ nội dung thay đổi, để trình đọc màn hình đọc được thông báo.
 *
 * @param props.active Backend có đang được thử lại (khởi động nguội) hay không.
 */
function ServerWakingStatus({ active }: { active: boolean }) {
  if (!active) {
    return <div role="status" aria-live="polite" />;
  }
  return (
    <div role="status" aria-live="polite" className={s.waking}>
      <span aria-hidden="true" className={s.wakingDot} />
      <span>{SERVER_WAKING_MESSAGE}</span>
    </div>
  );
}
