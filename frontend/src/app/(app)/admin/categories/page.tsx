'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import ConfirmDialog from '@/components/content/admin/ConfirmDialog';
import CategoryForm from '@/components/content/admin/CategoryForm';
import { accountClient } from '@/lib/accountClient';
import { AuthUser, getCurrentUser, setCurrentUser, subscribeCurrentUser } from '@/lib/auth';
import { getAccessToken } from '@/lib/authToken';
import {
  AdminCategory,
  CategoryApiError,
  CategoryInput,
  categoryAdminClient,
  isNetworkError,
  toCategoryApiError,
} from '@/lib/categoryAdminClient';

const LOGIN_URL = '/login?redirect=/admin/categories';

type AuthState = 'checking' | 'guest' | 'ready';
type FormMode = { kind: 'create' } | { kind: 'edit'; category: AdminCategory } | null;

/** Mirrors the backend gate (Create/UpdateCategoryRequest, CategoryController::destroy): admin only. */
function isAdmin(user: AuthUser | null): boolean {
  return Boolean(user?.roles?.includes('admin'));
}

/** Full-page card for the sign-in, checking and admin-required states. */
function GateCard({ title, lead, action }: { title: string; lead: string; action?: React.ReactNode }) {
  return (
    <section className="auth-page content-container">
      <div className="auth-card">
        <p className="eyebrow">Admin</p>
        <h1>{title}</h1>
        <p className="auth-lead">{lead}</p>
        {action}
      </div>
    </section>
  );
}

/** User-facing text for a failed write; API messages (422 validation/conflicts) are kept verbatim. */
function writeErrorMessage(error: CategoryApiError, fallback: string): string {
  if (isNetworkError(error)) return `${error.message} The change may or may not have been saved; reload the list to check.`;
  if (error.status === 403) return 'Admin access required. Your account is not allowed to change categories.';
  if (error.status === 404) return 'This category no longer exists. The list has been reloaded.';
  return error.message || fallback;
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  padding: '0.75rem 1rem',
  borderBottom: '1px solid var(--color-border-light)',
};

const smallButton: React.CSSProperties = { minHeight: '2.25rem', padding: '0.4rem 0.8rem' };

/**
 * /admin/categories — admin-only category management: tree view plus create, edit and delete.
 * The client-side gate mirrors the backend; the API remains the real authority (401/403 handled).
 */
export default function AdminCategoriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser);
  const [authState, setAuthState] = useState<AuthState>(() => (getCurrentUser() ? 'ready' : 'checking'));
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

  // ── Session: signed-in marker; resolve the user via /me when only the marker is known ─────────
  useEffect(() => {
    let cancelled = false;
    const unsubscribe = subscribeCurrentUser(() => {
      if (!cancelled) setUser(getCurrentUser());
    });
    const current = getCurrentUser();
    if (current) {
      setUser(current);
      setAuthState('ready');
    } else if (getAccessToken()) {
      accountClient
        .me()
        .then((response) => {
          if (cancelled) return;
          setCurrentUser(response.data.user);
          setUser(response.data.user);
          setAuthState('ready');
        })
        .catch(() => {
          if (!cancelled) setAuthState('guest');
        });
    } else {
      setAuthState('guest');
    }
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authState === 'ready' && !user) setAuthState('guest'); // signed out elsewhere
  }, [authState, user]);

  useEffect(() => {
    if (authState === 'guest') router.replace(LOGIN_URL);
  }, [authState, router]);

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
      const error = toCategoryApiError(e, 'Unable to load categories.');
      if (!handleAuthError(error)) setLoadError(error.message);
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
        setNotice(`Created "${response.data.name}" (slug: ${response.data.slug}).`);
      } else {
        const response = await categoryAdminClient.update(form.category.id, input);
        setNotice(`Saved "${response.data.name}" (slug: ${response.data.slug}).`);
      }
      closeForm(() => {
        setBusy(false);
        void load();
      });
    } catch (e) {
      const error = toCategoryApiError(e, 'Unable to save this category.');
      if (handleAuthError(error)) return;
      if (error.status === 404) void load();
      setFieldErrors(error.fieldErrors);
      setFormError(writeErrorMessage(error, 'Unable to save this category.'));
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
      setNotice(`Deleted "${toDelete.name}".`);
      setFocusNotice(true);
      setToDelete(null);
      if (form?.kind === 'edit' && form.category.id === toDelete.id) setForm(null);
      void load();
    } catch (e) {
      const error = toCategoryApiError(e, 'Unable to delete this category.');
      if (handleAuthError(error)) {
        setToDelete(null);
        return;
      }
      if (error.status === 404) void load();
      // 422 conflicts ("Cannot delete category with ...") are shown verbatim.
      setDeleteError(writeErrorMessage(error, 'Unable to delete this category.'));
    } finally {
      setBusy(false);
    }
  }

  // ── Gates ────────────────────────────────────────────────────────────────────────────────────
  if (authState === 'checking') {
    return <GateCard title="Checking access" lead="Loading your account..." />;
  }

  if (authState === 'guest' || !user || sessionExpired) {
    return (
      <GateCard
        title="Sign in required"
        lead={sessionExpired ? 'Your session has expired. Please sign in again to manage categories.' : 'Sign in with an administrator account to manage categories.'}
        action={<Link className="button button--primary auth-submit" href={LOGIN_URL}>Sign in</Link>}
      />
    );
  }

  if (!admin || forbidden) {
    return (
      <GateCard
        title="Admin access required"
        lead="Only administrators can manage categories. If you think you should have access, contact a platform administrator."
        action={<Link className="button button--secondary auth-submit" href="/courses">Back to courses</Link>}
      />
    );
  }

  // ── Page ─────────────────────────────────────────────────────────────────────────────────────
  /** Renders one tree level as a nested list with Edit/Delete actions per category. */
  function renderNodes(nodes: AdminCategory[], depth: number): React.ReactNode {
    return (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {nodes.map((node) => {
          const childCount = node.children?.length ?? 0;
          return (
            <li key={node.id}>
              <div style={{ ...rowStyle, paddingLeft: `calc(1rem + ${depth * 1.5}rem)` }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ color: 'var(--color-charcoal)' }}>
                    {depth > 0 && <span aria-hidden="true" style={{ color: 'var(--color-gray-light)' }}>{'└ '}</span>}
                    {node.name}
                  </strong>
                  <div style={{ color: 'var(--color-gray)', fontSize: 'var(--text-sm)' }}>
                    <code>{node.slug}</code>
                    {typeof node.articles_count === 'number' && ` · ${node.articles_count} article${node.articles_count === 1 ? '' : 's'}`}
                    {childCount > 0 && ` · ${childCount} subcategor${childCount === 1 ? 'y' : 'ies'}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="button button--secondary"
                    style={smallButton}
                    onClick={(event) => openForm({ kind: 'edit', category: node }, event.currentTarget)}
                    disabled={busy || loading}
                    aria-label={`Edit ${node.name}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="button button--secondary"
                    style={smallButton}
                    onClick={() => { setDeleteError(null); setNotice(null); setToDelete(node); }}
                    disabled={busy || loading}
                    aria-label={`Delete ${node.name}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {childCount > 0 && renderNodes(node.children ?? [], depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  }

  const deleteArticles = toDelete?.articles_count ?? 0;
  const deleteChildren = toDelete?.children?.length ?? 0;

  return (
    <section className="account-page account-page--wide content-container">
      <p className="eyebrow">Admin</p>
      <h1>Categories</h1>
      <p className="auth-lead">Organise courses into a category tree. Changes take effect immediately for all visitors.</p>

      <div className="account-actions" style={{ marginTop: 0 }}>
        <button type="button" className="button button--primary" onClick={(event) => openForm({ kind: 'create' }, event.currentTarget)} disabled={busy || form?.kind === 'create'}>
          New category
        </button>
        <button type="button" className="button button--secondary" onClick={() => void load()} disabled={loading || busy}>
          {loading ? 'Loading...' : 'Reload list'}
        </button>
      </div>

      {notice && <p ref={noticeRef} tabIndex={-1} className="auth-message" role="status">{notice}</p>}

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
        <p className="auth-message" role="status">
          Some deeper levels of the tree could not be loaded. Reload the list to see every subcategory.
        </p>
      )}

      {loadError ? (
        <div className="auth-error" role="alert" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ flex: '1 1 16rem' }}>{loadError}</span>
          <button type="button" className="button button--secondary" onClick={() => void load()} disabled={loading}>
            Retry
          </button>
        </div>
      ) : loading && roots.length === 0 ? (
        <p className="auth-lead" role="status">Loading categories...</p>
      ) : roots.length === 0 ? (
        <div className="empty-state">
          <h3>No categories yet</h3>
          <p>Create the first category to start organising courses.</p>
        </div>
      ) : (
        <div
          role="region"
          aria-label="Category tree"
          aria-busy={loading}
          style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-white)', overflow: 'hidden' }}
        >
          {renderNodes(roots, 0)}
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          title={`Delete "${toDelete.name}"?`}
          confirmLabel="Delete category"
          busy={busy}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => { setToDelete(null); setDeleteError(null); }}
        >
          <p style={{ margin: 0 }}>This permanently removes the category <code>{toDelete.slug}</code>. It cannot be undone.</p>
          {(deleteArticles > 0 || deleteChildren > 0) && (
            <p style={{ margin: '0.75rem 0 0' }}>
              It still has
              {deleteChildren > 0 && ` ${deleteChildren} subcategor${deleteChildren === 1 ? 'y' : 'ies'}`}
              {deleteChildren > 0 && deleteArticles > 0 && ' and'}
              {deleteArticles > 0 && ` ${deleteArticles} article${deleteArticles === 1 ? '' : 's'}`}
              , so the server is expected to refuse. Move or remove them first.
            </p>
          )}
        </ConfirmDialog>
      )}
    </section>
  );
}
