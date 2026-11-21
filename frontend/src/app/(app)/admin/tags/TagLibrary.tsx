'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminTabs from '@/components/content/admin/AdminTabs';
import styles from '@/components/content/admin/admin.module.css';
import {
  TAG_NAME_MAX,
  TagError,
  TagRecord,
  cleanTagName,
  findExistingTag,
  isNetworkError,
  nameKey,
  tagAdminClient,
  tagSlug,
} from '@/lib/tagAdminClient';
import { translateServerMessage } from '@/lib/serverMessages';
import TagCreateForm, { CreateResult } from './TagCreateForm';
import TagList from './TagList';

/** Human-readable message for an API error (network, 401, 403, 429 or Laravel validation). */
function describeError(error: unknown, fallback: string): string {
  const e = error as TagError;
  if (isNetworkError(error)) return 'Không kết nối được máy chủ KnowledgeHub. Kiểm tra kết nối mạng rồi thử lại.';
  if (e.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (e.status === 403) return 'Tài khoản của bạn không được phép tạo thẻ.';
  if (e.status === 429) return 'Thử quá nhiều lần. Vui lòng đợi một phút rồi thử lại.';
  const first = e.errors ? Object.values(e.errors)[0]?.[0] : undefined;
  return translateServerMessage(first ?? e.message ?? fallback);
}

/** Tag list with client-side filter and the create form; rendered only for allowed roles. */
export default function TagLibrary({ loginUrl }: { loginUrl: string }) {
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [filter, setFilter] = useState('');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  // A create ended with an unknown result (network error): submit stays locked until the list is reloaded.
  const [needsRecheck, setNeedsRecheck] = useState(false);
  const latestLoad = useRef(0);

  /** Load every tag; resolves true only when this (latest) request succeeded. */
  const load = useCallback(async (): Promise<boolean> => {
    const requestId = ++latestLoad.current;
    setLoading(true);
    setLoadError(null);
    try {
      const list = await tagAdminClient.listAll();
      if (requestId !== latestLoad.current) return false;
      setTags(list.tags);
      setTruncated(list.truncated);
      return true;
    } catch (error) {
      if (requestId === latestLoad.current) setLoadError(describeError(error, 'Không tải được danh sách thẻ.'));
      return false;
    } finally {
      if (requestId === latestLoad.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Tags matching the filter box by normalised name or by slug. */
  const visibleTags = useMemo(() => {
    const key = nameKey(filter);
    if (!key) return tags;
    const slugKey = tagSlug(filter);
    return tags.filter((tag) => nameKey(tag.name).includes(key) || (slugKey !== '' && tag.slug.includes(slugKey)));
  }, [tags, filter]);

  const cleanName = cleanTagName(name);
  const slug = tagSlug(cleanName);
  const existing = cleanName ? findExistingTag(tags, cleanName) : null;
  const tooLong = cleanName.length > TAG_NAME_MAX;
  const noSlug = cleanName !== '' && slug === '';
  // The slug can outgrow the name (e.g. "@" becomes "-at-"); the API rejects slugs over 100 characters.
  const slugTooLong = !tooLong && slug.length > TAG_NAME_MAX;
  const canSubmit =
    cleanName !== '' && !existing && !tooLong && !slugTooLong && !noSlug && !submitting && !needsRecheck && !loading && !loadError;

  const hint = existing
    ? `Đã có thẻ “${existing.name}” (${existing.slug}). Hãy dùng thẻ có sẵn.`
    : tooLong
      ? `Dùng tối đa ${TAG_NAME_MAX} ký tự.`
      : slugTooLong
        ? `Đường dẫn sẽ dài ${slug.length} ký tự; hãy rút ngắn tên để không quá ${TAG_NAME_MAX}.`
        : noSlug
          ? 'Cần ít nhất một chữ cái Latin hoặc chữ số.'
          : cleanName
            ? `Đường dẫn: ${slug}`
            : `Tối đa ${TAG_NAME_MAX} ký tự.`;

  /** Validate locally, POST the tag, then show created / already existed / error and refresh the list. */
  async function createTag(event?: FormEvent) {
    event?.preventDefault();
    setTouched(true);
    if (!canSubmit) {
      if (existing) setResult({ kind: 'exists', tag: existing, name: cleanName });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const response = await tagAdminClient.create(cleanName);
      setResult({ kind: 'created', tag: response.data });
      setName('');
      setTouched(false);
      await load();
    } catch (error) {
      const e = error as TagError;
      if (e?.status === 422 && e.errors?.slug) {
        // Possibly created meanwhile: report "exists" only if the refreshed list really has a match.
        const fresh = await tagAdminClient.listAll().catch(() => null);
        if (fresh) {
          setTags(fresh.tags);
          setTruncated(fresh.truncated);
        }
        const match = fresh ? findExistingTag(fresh.tags, cleanName) : null;
        if (match) setResult({ kind: 'exists', tag: match, name: cleanName });
        else setResult({ kind: 'error', message: describeError(error, 'Không tạo được thẻ này.') });
      } else if (isNetworkError(error)) {
        // Lock before `finally` releases `submitting`, so Create cannot be pressed until the list is reloaded.
        setNeedsRecheck(true);
      } else {
        if (e?.status === 401) setSessionExpired(true);
        setResult({ kind: 'error', message: describeError(error, 'Không tạo được thẻ này.') });
      }
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Reload the list; when it succeeds, release the post-network-error lock so the duplicate
   * hint is re-evaluated against fresh data (the earlier attempt may have reached the server).
   */
  async function reloadTags() {
    setResult(null);
    const ok = await load();
    if (ok) setNeedsRecheck(false);
  }

  return (
    <div className={styles.wrap}>
      <AdminTabs />
      <p className={styles.lead}>
        Thẻ dùng chung cho mọi khóa học. Hãy xem danh sách trước khi thêm. Tên chỉ khác hoa thường, dấu, khoảng trắng
        hay dấu câu được tính là cùng một thẻ.
      </p>

      <TagCreateForm
        name={name}
        onName={(value) => { setName(value); setResult(null); }}
        hint={hint}
        problem={!!existing || tooLong || slugTooLong || noSlug}
        touched={touched}
        onTouch={() => setTouched(true)}
        maxLength={TAG_NAME_MAX}
        submitting={submitting}
        canSubmit={canSubmit}
        onSubmit={(event) => void createTag(event)}
        result={result}
        needsRecheck={needsRecheck}
        loading={loading}
        onRecheck={() => void reloadTags()}
        sessionExpired={sessionExpired}
        loginUrl={loginUrl}
      />

      <TagList
        tags={tags}
        visible={visibleTags}
        loading={loading}
        loadError={loadError}
        truncated={truncated}
        filter={filter}
        onFilter={setFilter}
        filterMax={TAG_NAME_MAX}
        onRetry={() => void reloadTags()}
      />
    </div>
  );
}
