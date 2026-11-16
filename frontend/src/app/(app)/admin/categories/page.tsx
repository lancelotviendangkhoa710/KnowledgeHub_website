'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import AdminTabs from '@/components/content/admin/AdminTabs';
import { AdminChecking, AdminGate } from '@/components/content/admin/AdminGate';
import CategoryForm from '@/components/content/admin/CategoryForm';
import styles from '@/components/content/admin/admin.module.css';
import CategoryDeleteDialog from './CategoryDeleteDialog';
import { translateServerMessage } from '@/lib/serverMessages';
import CategoryList from './CategoryList';
import useAdminSession from './useAdminSession';
import type { AuthUser } from '@/lib/auth';
import {
  AdminCategory,
  CategoryApiError,
  CategoryInput,
  categoryAdminClient,
  isNetworkError,
  toCategoryApiError,
} from '@/lib/categoryAdminClient';

const LOGIN_URL = '/login?redirect=/admin/categories';

type FormMode = { kind: 'create' } | { kind: 'edit'; category: AdminCategory } | null;

/** Mirrors the backend gate (Create/UpdateCategoryRequest, CategoryController::destroy): admin only. */
function isAdmin(user: AuthUser | null): boolean {
  return Boolean(user?.roles?.includes('admin'));
}

/** User-facing text for a failed write; API messages (422 validation/conflicts) are kept verbatim. */
function writeErrorMessage(error: CategoryApiError, fallback: string): string {
  if (isNetworkError(error)) return 'Không kết nối được máy chủ. Thay đổi có thể đã được lưu hoặc chưa; hãy tải lại danh sách để kiểm tra.';
  if (error.status === 403) return 'Cần quyền quản trị. Tài khoản của bạn không được phép thay đổi danh mục.';
  if (error.status === 404) return 'Danh mục này không còn tồn tại. Danh sách đã được tải lại.';
  return translateServerMessage(error.message || fallback);
}

/**
 * /admin/categories — admin-only category management: tree view plus create, edit and delete.
 * The client-side gate mirrors the backend; the API remains the real authority (401/403 handled).
 */
export default function AdminCategoriesPage() {
  const { user, authState } = useAdminSession(LOGIN_URL);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const [roots, setRoots] = useState<AdminCategory[]>([]);
  const [treeComplete, setTreeComplete] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FormMode>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [toDelete, setToDelete] = useState<AdminCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const latestLoad = useRef(0);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  // The button that opened the form; focus goes back to it when the form closes.
  const formOpenerRef = useRef<HTMLElement | null>(null);
  // Set after a delete: the row (and its Delete button) goes away, so focus moves to the status message.
  const [focusNotice, setFocusNotice] = useState(false);

  useEffect(() => {
    if (focusNotice && notice) {
      noticeRef.current?.focus();
      setFocusNotice(false);
    }
  }, [focusNotice, notice]);

  /** Switches to the session-expired (401) or admin-required (403) card; returns true when handled. */
  const handleAuthError = useCallback((error: CategoryApiError): boolean => {
    if (error.status === 401) {
      setSessionExpired(true);
      return true;
    }
    if (error.status === 403) {
      setForbidden(true);
      return true;
    }
    return false;
  }, []);

  // ── Data ─────────────────────────────────────────────────────────────────────────────────────
  /** Loads the full tree; stale responses are ignored when a newer load has started. */
  const load = useCallback(async () => {
    const requestId = ++latestLoad.current;
    setLoading(true);
    setLoadError(null);
    try {
      const result = await categoryAdminClient.tree();
      if (requestId !== latestLoad.current) return;
      setRoots(result.roots);
      setTreeComplete(result.complete);
    } catch (e) {
      if (requestId !== latestLoad.current) return;
      const error = toCategoryApiError(e, 'Không tải được danh mục.');
      if (!handleAuthError(error)) setLoadError(isNetworkError(error) ? 'Kiểm tra kết nối mạng rồi thử lại.' : translateServerMessage(error.message));
    } finally {
      if (requestId === latestLoad.current) setLoading(false);
    }
  }, [handleAuthError]);

  const admin = isAdmin(user);
  useEffect(() => {
    if (authState === 'ready' && admin) void load();
  }, [authState, admin, load]);

  // ── Mutations (refetch after each; no optimistic updates) ────────────────────────────────────
  /** Opens the create/edit form and remembers which button opened it. */
  function openForm(mode: FormMode, opener: HTMLElement) {
    formOpenerRef.current = opener;
    setForm(mode);
    setFormError(null);
    setFieldErrors({});
    setNotice(null);
  }

  /**
   * Closes the form (rendering synchronously so the DOM is current), then returns focus to the opener.
   * If the opener is gone or disabled (e.g. row buttons while the list reloads), the status message
   * gets focus instead, as in the delete flow.
   */
  function closeForm(afterClose?: () => void) {
    flushSync(() => {
      setForm(null);
      afterClose?.();
    });
    const opener = formOpenerRef.current;
    formOpenerRef.current = null;
    if (opener && opener.isConnected && !(opener as HTMLButtonElement).disabled) opener.focus();
    else noticeRef.current?.focus();
  }

  /** Sends create or update, then closes the form and refetches; on failure keeps the form open with errors. */
  async function submitForm(input: CategoryInput) {
    if (!form || busy) return;
    setBusy(true);
    setFormError(null);
    setFieldErrors({});
    try {
      if (form.kind === 'create') {
        const response = await categoryAdminClient.create(input);
        setNotice(`Đã tạo “${response.data.name}” (đường dẫn: ${response.data.slug}).`);
      } else {
        const response = await categoryAdminClient.update(form.category.id, input);
        setNotice(`Đã lưu “${response.data.name}” (đường dẫn: ${response.data.slug}).`);
      }
      closeForm(() => {
        setBusy(false);
        void load();
      });
    } catch (e) {
      const error = toCategoryApiError(e, 'Không lưu được danh mục này.');
      if (handleAuthError(error)) return;
      if (error.status === 404) void load();
      setFieldErrors(error.fieldErrors);
      setFormError(writeErrorMessage(error, 'Không lưu được danh mục này.'));
    } finally {
      setBusy(false);
    }
  }

  /** Deletes the category chosen in the dialog; a 422 conflict stays visible inside the dialog. */
  async function confirmDelete() {
    if (!toDelete || busy) return;
    setBusy(true);
    setDeleteError(null);
    try {
      await categoryAdminClient.remove(toDelete.id);
      setNotice(`Đã xóa “${toDelete.name}”.`);
      setFocusNotice(true);
      setToDelete(null);
      if (form?.kind === 'edit' && form.category.id === toDelete.id) setForm(null);
      void load();
    } catch (e) {
      const error = toCategoryApiError(e, 'Không xóa được danh mục này.');
      if (handleAuthError(error)) {
        setToDelete(null);
        return;
      }
      if (error.status === 404) void load();
      // 422 conflicts ("Cannot delete category with ...") are shown verbatim.
      setDeleteError(writeErrorMessage(error, 'Không xóa được danh mục này.'));
    } finally {
      setBusy(false);
    }
  }

  // ── Gates ────────────────────────────────────────────────────────────────────────────────────
  if (authState === 'checking') return <AdminChecking />;

  if (authState === 'guest' || !user || sessionExpired) {
    return (
      <AdminGate
        title="Cần đăng nhập"
        text={sessionExpired ? 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để quản lý danh mục.' : 'Đăng nhập bằng tài khoản quản trị để quản lý danh mục.'}
      >
        <Link className={styles.btn} href={LOGIN_URL}>Đăng nhập</Link>
      </AdminGate>
    );
  }

  if (!admin || forbidden) {
    return (
      <AdminGate title="Cần quyền quản trị" text="Chỉ quản trị viên mới quản lý được danh mục. Nếu bạn nghĩ mình cần quyền này, hãy liên hệ quản trị viên nền tảng.">
        <Link className={`${styles.btn} ${styles.ghost}`} href="/courses">Về khóa học</Link>
      </AdminGate>
    );
  }

  // ── Page ─────────────────────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.wrap}>
      <AdminTabs />
      <p className={styles.lead}>Sắp xếp khóa học theo cây danh mục. Thay đổi có hiệu lực ngay với mọi người dùng.</p>

      <div className={styles.tools}>
        <button type="button" className={`${styles.btn} ${styles.sm}`} onClick={(event) => openForm({ kind: 'create' }, event.currentTarget)} disabled={busy || form?.kind === 'create'}>
          Danh mục mới
        </button>
        <button type="button" className={`${styles.btn} ${styles.ghost} ${styles.sm}`} onClick={() => void load()} disabled={loading || busy}>
          {loading ? 'Đang tải...' : 'Tải lại'}
        </button>
      </div>

      {notice && <p ref={noticeRef} tabIndex={-1} className={styles.info} role="status">{notice}</p>}

      {form && (
        <CategoryForm
          key={form.kind === 'edit' ? form.category.id : 'create'}
          editing={form.kind === 'edit' ? form.category : undefined}
          roots={roots}
          treeComplete={treeComplete}
          busy={busy}
          error={formError}
          fieldErrors={fieldErrors}
          onSubmit={(input) => void submitForm(input)}
          onCancel={() => closeForm()}
        />
      )}

      {!treeComplete && !loading && (
        <p className={styles.info} role="status">
          Chưa tải được một số cấp sâu hơn của cây. Hãy tải lại danh sách để thấy đủ danh mục con.
        </p>
      )}

      <CategoryList
        roots={roots}
        loading={loading}
        loadError={loadError}
        disabled={busy || loading}
        onRetry={() => void load()}
        onEdit={(category, opener) => openForm({ kind: 'edit', category }, opener)}
        onDelete={(category) => { setDeleteError(null); setNotice(null); setToDelete(category); }}
      />

      {toDelete && (
        <CategoryDeleteDialog
          category={toDelete}
          busy={busy}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => { setToDelete(null); setDeleteError(null); }}
        />
      )}
    </div>
  );
}
