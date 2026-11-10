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

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <small id={id} style={{ color: 'var(--color-primary-light)', fontWeight: 'var(--weight-regular)' }}>
      {messages.join(' ')}
    </small>
  );
}

export default function CategoryForm({ editing, roots, treeComplete, busy, error, fieldErrors, onSubmit, onCancel }: CategoryFormProps) {
  const ids = { name: useId(), slug: useId(), parent: useId(), slugHint: useId(), nameErr: useId(), slugErr: useId(), parentErr: useId() };
  const [name, setName] = useState(editing?.name ?? '');
  const [slug, setSlug] = useState(editing?.slug ?? '');
  const [parentId, setParentId] = useState(editing?.parent_id ?? '');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const options = useMemo(() => flattenTree(roots), [roots]);
  const blocked = useMemo(() => (editing ? selfAndDescendantIds(editing) : new Set<string>()), [editing]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (parentId && blocked.has(parentId)) return; // the select already disables these; belt and braces
    onSubmit({ name: name.trim(), slug: slug.trim() || null, parent_id: parentId || null });
  }

  // The server only rejects "own parent"; it does not detect deeper cycles. Without the full tree we
  // cannot know every descendant, so moving is locked rather than risking a cycle.
  const parentLocked = Boolean(editing) && !treeComplete;

  const title = editing ? `Edit "${editing.name}"` : 'New category';

  return (
    <form style={panelStyle} onSubmit={submit} aria-label={title} noValidate>
      <h2 style={{ margin: '0 0 0.25rem', fontSize: 'var(--text-xl)', color: 'var(--color-charcoal)' }}>{title}</h2>

      {error && <p className="auth-error" role="alert" style={{ marginTop: '0.75rem' }}>{error}</p>}

      <label className="auth-field" htmlFor={ids.name}>
        Name
        <input
          ref={nameRef}
          id={ids.name}
          style={controlStyle}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={255}
          aria-invalid={Boolean(fieldErrors.name?.length)}
          aria-describedby={fieldErrors.name?.length ? ids.nameErr : undefined}
          disabled={busy}
        />
        <FieldError id={ids.nameErr} messages={fieldErrors.name} />
      </label>

      <label className="auth-field" htmlFor={ids.slug}>
        Slug <span className="account-hint">(optional)</span>
        <input
          id={ids.slug}
          style={controlStyle}
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          maxLength={255}
          aria-invalid={Boolean(fieldErrors.slug?.length)}
          aria-describedby={[ids.slugHint, fieldErrors.slug?.length ? ids.slugErr : ''].filter(Boolean).join(' ')}
          disabled={busy}
        />
        <small id={ids.slugHint} className="account-hint">
          {editing
            ? 'Leave empty to regenerate it from the name. If the slug is taken, the server adds a numeric suffix.'
            : 'Leave empty to generate it from the name.'}
        </small>
        <FieldError id={ids.slugErr} messages={fieldErrors.slug} />
      </label>

      <label className="auth-field" htmlFor={ids.parent}>
        Parent category
        <select
          id={ids.parent}
          style={controlStyle}
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
          aria-invalid={Boolean(fieldErrors.parent_id?.length)}
          aria-describedby={fieldErrors.parent_id?.length ? ids.parentErr : undefined}
          disabled={busy || parentLocked}
        >
          <option value="">None (top level)</option>
          {options.map(({ node, depth }) => {
            const disabled = blocked.has(node.id);
            return (
              <option key={node.id} value={node.id} disabled={disabled}>
                {`${'— '.repeat(depth)}${node.name}${disabled ? (node.id === editing?.id ? ' (this category)' : ' (descendant)') : ''}`}
              </option>
            );
          })}
        </select>
        <FieldError id={ids.parentErr} messages={fieldErrors.parent_id} />
      </label>

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
