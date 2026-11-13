'use client';

import { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AdminCategory, CategoryInput, flattenTree, selfAndDescendantIds } from '@/lib/categoryAdminClient';

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

const panelStyle: React.CSSProperties = {
  padding: '1.5rem',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  background: 'var(--color-white)',
  boxShadow: 'var(--shadow-sm)',
};

const controlStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '2.8rem',
  padding: '0.6rem 0.8rem',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-charcoal)',
  background: 'var(--color-white)',
  font: 'inherit',
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
  return (
    <small id={id} style={{ color: 'var(--color-primary-light)', fontWeight: 'var(--weight-regular)' }}>
      {messages.join(' ')}
    </small>
  );
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
      problems.name = ['The name must contain at least one letter or digit.'];
    }
    if (trimmedSlug && !SLUG_PATTERN.test(trimmedSlug)) {
      problems.slug = ['Use lowercase letters, digits and single hyphens only (e.g. web-development).'];
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

  const title = editing ? `Edit "${editing.name}"` : 'New category';

  return (
    <form style={panelStyle} onSubmit={submit} aria-label={title} noValidate>
      <h2 style={{ margin: '0 0 0.25rem', fontSize: 'var(--text-xl)', color: 'var(--color-charcoal)' }}>{title}</h2>

      {error && <p className="auth-error" role="alert" style={{ marginTop: '0.75rem' }}>{error}</p>}

      <div className="auth-field">
        <label htmlFor={ids.name}>Name</label>
        <input
          ref={nameRef}
          id={ids.name}
          style={controlStyle}
          value={name}
          onChange={(event) => { setName(event.target.value); markEdited('name'); }}
          required
          maxLength={255}
          aria-invalid={Boolean(errors.name?.length)}
          aria-describedby={errors.name?.length ? ids.nameErr : undefined}
          disabled={busy}
        />
        <FieldError id={ids.nameErr} messages={errors.name} />
      </div>

      <div className="auth-field">
        <label htmlFor={ids.slug}>
          Slug <span className="account-hint">(optional)</span>
        </label>
        <input
          id={ids.slug}
          style={controlStyle}
          value={slug}
          onChange={(event) => { setSlug(event.target.value); markEdited('slug'); }}
          maxLength={255}
          aria-invalid={Boolean(errors.slug?.length)}
          aria-describedby={[ids.slugHint, errors.slug?.length ? ids.slugErr : ''].filter(Boolean).join(' ')}
          disabled={busy}
        />
        <small id={ids.slugHint} className="account-hint">
          Lowercase letters, digits and single hyphens (e.g. <code>web-development</code>).{' '}
          {editing
            ? 'Leave empty to regenerate it from the name. If the slug is taken, the server adds a numeric suffix.'
            : 'Leave empty to generate it from the name.'}
        </small>
        <FieldError id={ids.slugErr} messages={errors.slug} />
      </div>

      <div className="auth-field">
        <label htmlFor={ids.parent}>Parent category</label>
        <select
          id={ids.parent}
          style={controlStyle}
          value={parentId}
          onChange={(event) => { setParentId(event.target.value); markEdited('parent_id'); }}
          aria-invalid={Boolean(errors.parent_id?.length)}
          aria-describedby={errors.parent_id?.length ? ids.parentErr : undefined}
          disabled={busy || parentLocked}
        >
          <option value="">None (top level)</option>
          {options.map(({ node, depth }) => {
            const disabled = blocked.has(node.id);
            return (
              <option key={node.id} value={node.id} disabled={disabled}>
                {`${'\u2014 '.repeat(depth)}${node.name}${disabled ? (node.id === editing?.id ? ' (this category)' : ' (descendant)') : ''}`}
              </option>
            );
          })}
        </select>
        <FieldError id={ids.parentErr} messages={errors.parent_id} />
      </div>

      {editing && !treeComplete && (
        <p className="auth-message" style={{ marginTop: '1rem' }}>
          Some deeper levels of the tree could not be loaded, so descendants of this category are unknown. The parent
          cannot be changed until the full tree loads; reload the list and try again. Renaming is still possible.
        </p>
      )}

      <div className="account-actions">
        <button type="submit" className="button button--primary account-submit" style={{ marginTop: 0 }} disabled={busy || !name.trim()} aria-busy={busy}>
          {busy ? 'Saving...' : editing ? 'Save changes' : 'Create category'}
        </button>
        <button type="button" className="button button--secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
