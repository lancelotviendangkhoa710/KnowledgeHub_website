'use client';

import { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AdminCategory, CategoryInput, flattenTree, selfAndDescendantIds } from '@/lib/categoryAdminClient';
import Select from '@/components/ui/Select';
import { translateServerMessage } from '@/lib/serverMessages';
import styles from './admin.module.css';

type CategoryFormProps = {
  /** Category being edited; undefined means "create". */
  editing?: AdminCategory;
  roots: AdminCategory[];
  /** False when deeper tree levels could not be loaded, so descendant blocking may be incomplete. */
  treeComplete: boolean;
  busy: boolean;
  error?: string | null;
  fieldErrors: Record<string, string[]>;
  onSubmit: (input: CategoryInput) => void;
  onCancel: () => void;
};

/** Same shape `Str::slug` produces; the backend does not enforce it, so the form does. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/**
 * A name without any letter or digit gives an empty `Str::slug`, i.e. an empty slug on the server.
 * Built with the RegExp constructor because Unicode property escapes need an ES2018 regex literal.
 */
const HAS_LETTER_OR_DIGIT = new RegExp('[\\p{L}\\p{N}]', 'u');

/** Field-level error text, referenced by the control's `aria-describedby`; renders nothing without messages. */
function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return <small id={id} className={styles.fieldErr}>{messages.map(translateServerMessage).join(' ')}</small>;
}

/**
 * Inline create/edit form for a category: name, optional slug and parent. In edit mode the category
 * itself and its known descendants cannot be chosen as parent; the parent is locked when the tree is incomplete.
 */
export default function CategoryForm({ editing, roots, treeComplete, busy, error, fieldErrors, onSubmit, onCancel }: CategoryFormProps) {
  const ids = { name: useId(), slug: useId(), parent: useId(), slugHint: useId(), nameErr: useId(), slugErr: useId(), parentErr: useId() };
  const [name, setName] = useState(editing?.name ?? '');
  const [slug, setSlug] = useState(editing?.slug ?? '');
  const [parentId, setParentId] = useState(editing?.parent_id ?? '');
  const [localErrors, setLocalErrors] = useState<Record<string, string[]>>({});
  // Fields changed since the last server response: their server errors no longer apply.
  const [edited, setEdited] = useState<Set<string>>(() => new Set());
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEdited(new Set());
  }, [fieldErrors]);

  const serverErrors = Object.fromEntries(Object.entries(fieldErrors).filter(([field]) => !edited.has(field)));
  // Client checks win over server errors for the same field until the field is edited.
  const errors: Record<string, string[]> = { ...serverErrors, ...localErrors };

  /** Records that a field changed: hides its server error and clears its client-side error. */
  function markEdited(field: string) {
    setEdited((current) => (current.has(field) ? current : new Set(current).add(field)));
    setLocalErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const options = useMemo(() => flattenTree(roots), [roots]);
  const blocked = useMemo(() => (editing ? selfAndDescendantIds(editing) : new Set<string>()), [editing]);

  /** Runs the client checks (name has a letter/digit, slug format), then hands trimmed values to `onSubmit`. */
  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (parentId && blocked.has(parentId)) return; // the select already disables these; belt and braces
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();
    const problems: Record<string, string[]> = {};
    if (!HAS_LETTER_OR_DIGIT.test(trimmedName)) {
      problems.name = ['Tên phải có ít nhất một chữ cái hoặc chữ số.'];
    }
    if (trimmedSlug && !SLUG_PATTERN.test(trimmedSlug)) {
      problems.slug = ['Chỉ dùng chữ thường, số và dấu gạch nối đơn (ví dụ lap-trinh-web).'];
    }
    setLocalErrors(problems);
    if (Object.keys(problems).length > 0) {
      const first = problems.name ? ids.name : ids.slug;
      document.getElementById(first)?.focus();
      return;
    }
    onSubmit({ name: trimmedName, slug: trimmedSlug || null, parent_id: parentId || null });
  }

  // The server only rejects "own parent"; it does not detect deeper cycles. Without the full tree we
  // cannot know every descendant, so moving is locked rather than risking a cycle.
  const parentLocked = Boolean(editing) && !treeComplete;

  const title = editing ? `Sửa “${editing.name}”` : 'Danh mục mới';

  return (
    <form className={styles.panel} onSubmit={submit} aria-label={title} noValidate>
      <div className={styles.panelH}>{title}</div>
      <div className={styles.panelB}>
        {error && <p className={styles.notice} role="alert">{translateServerMessage(error)}</p>}

        <div className={`${styles.fgrid} ${error ? styles.formGap : ''}`}>
          <div className={styles.field}>
            <label htmlFor={ids.name}>Tên danh mục</label>
            <input
              ref={nameRef}
              id={ids.name}
              value={name}
              onChange={(event) => { setName(event.target.value); markEdited('name'); }}
              required
              maxLength={255}
              autoComplete="off"
              aria-invalid={Boolean(errors.name?.length)}
              aria-describedby={errors.name?.length ? ids.nameErr : undefined}
              disabled={busy}
            />
            <FieldError id={ids.nameErr} messages={errors.name} />
          </div>

          <div className={styles.field}>
            <label htmlFor={ids.slug}>Đường dẫn (tùy chọn)</label>
            <input
              id={ids.slug}
              value={slug}
              onChange={(event) => { setSlug(event.target.value); markEdited('slug'); }}
              maxLength={255}
              autoComplete="off"
              aria-invalid={Boolean(errors.slug?.length)}
              aria-describedby={[ids.slugHint, errors.slug?.length ? ids.slugErr : ''].filter(Boolean).join(' ')}
              disabled={busy}
            />
            <small id={ids.slugHint}>
              Chữ thường, số và dấu gạch nối, ví dụ <code>lap-trinh-web</code>.{' '}
              {editing
                ? 'Để trống để tạo lại từ tên. Nếu đường dẫn đã có, máy chủ sẽ thêm số vào cuối.'
                : 'Để trống để tự tạo từ tên.'}
            </small>
            <FieldError id={ids.slugErr} messages={errors.slug} />
          </div>

          <div className={`${styles.field} ${styles.full}`}>
            <span className={styles.lbl}>Danh mục cha</span>
            <Select
              ariaLabel="Danh mục cha"
              value={parentId}
              onChange={(value) => { setParentId(value); markEdited('parent_id'); }}
              disabled={busy || parentLocked}
              options={[
                { value: '', label: 'Không có (cấp cao nhất)' },
                ...options.map(({ node, depth }) => {
                  const off = blocked.has(node.id);
                  return {
                    value: node.id,
                    disabled: off,
                    label: `${'\u2014 '.repeat(depth)}${node.name}${off ? (node.id === editing?.id ? ' (danh mục này)' : ' (danh mục con)') : ''}`,
                  };
                }),
              ]}
            />
            <FieldError id={ids.parentErr} messages={errors.parent_id} />
          </div>
        </div>

        {editing && !treeComplete && (
          <p className={styles.info}>
            Chưa tải được một số cấp sâu hơn của cây, nên chưa biết hết danh mục con của danh mục này. Chưa đổi được
            danh mục cha cho đến khi tải đủ cây; hãy tải lại danh sách rồi thử lại. Vẫn đổi tên được.
          </p>
        )}

        <div className={`${styles.btns} ${editing && !treeComplete ? styles.formGap : ''}`}>
          <button type="submit" className={styles.btn} disabled={busy || !name.trim()} aria-busy={busy}>
            {busy ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo danh mục'}
          </button>
          <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={onCancel} disabled={busy}>
            Hủy
          </button>
        </div>
      </div>
    </form>
  );
}
