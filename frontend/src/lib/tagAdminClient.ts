/**
 * tagAdminClient.ts -- Tag Library client (CONTENT-03).
 *
 * Contract taken from backend code (TagController, CreateTagRequest, TagService):
 *  - GET  /api/v1/tags?per_page=&page=  public, Laravel paginator ordered by name,
 *    each item { id, name, slug, created_at, articles_count }.
 *  - POST /api/v1/tags { name, slug? }  contributor or admin (403 otherwise, 401 without token).
 *    name: required|string|max:100; slug: nullable|string|max:100|unique:tags,slug.
 *    Always 201 { status, message, data: tag }. When slug is omitted the service
 *    silently appends "-1", "-2"... on collision, so it never reports a duplicate.
 *
 * To avoid creating duplicates this client always sends an explicit slug computed
 * like Laravel's Str::slug: a collision then fails with 422 instead of a "-1" copy.
 */

import { api } from '@/lib/api';
import type { Tag } from '@/types/content';

export type TagRecord = Tag & { created_at?: string | null };

type TagPage = {
  data: TagRecord[];
  current_page: number;
  last_page: number;
  total: number;
};

type CreateTagResponse = { status: 'success' | 'error'; message?: string; data: TagRecord };

export const TAG_NAME_MAX = 100;
const PAGE_SIZE = 100;
const MAX_PAGES = 50; // safety stop: 5,000 tags

/** Collapse inner whitespace and trim, as the name will be stored. */
export function cleanTagName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/** Case/Unicode-insensitive key used to compare names. */
export function nameKey(raw: string): string {
  return cleanTagName(raw).normalize('NFKC').toLocaleLowerCase('en');
}

/**
 * Client-side equivalent of Laravel Str::slug($name) (separator "-", language "en"):
 * transliterate to ASCII, "@" -> "-at-", drop everything except letters, digits,
 * whitespace and "-", collapse runs of "-"/whitespace into "-", trim "-".
 * Covers Latin and Vietnamese diacritics; scripts with no ASCII form become "".
 */
export function tagSlug(raw: string): string {
  const ascii = raw
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
    .replace(/[ßẞ]/g, 'ss')
    .replace(/[æÆ]/g, 'ae')
    .replace(/[øØ]/g, 'o')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x00-\x7F]/g, '');
  return ascii
    .replace(/_/g, '-')
    .replace(/@/g, '-at-')
    .toLowerCase()
    .replace(/[^-a-z0-9\s]+/g, '')
    .replace(/[-\s]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Existing tag that the backend would treat as the same tag (same name or same slug). */
export function findExistingTag(tags: TagRecord[], rawName: string): TagRecord | null {
  const key = nameKey(rawName);
  const slug = tagSlug(cleanTagName(rawName));
  if (!key) return null;
  return tags.find((tag) => nameKey(tag.name) === key || (slug !== '' && tag.slug === slug)) ?? null;
}

export const tagAdminClient = {
  /** Every tag, following the paginator; sorted alphabetically (case-insensitive). */
  async listAll(): Promise<TagRecord[]> {
    const all: TagRecord[] = [];
    let page = 1;
    let lastPage = 1;
    do {
      const response = await api.get<TagPage>(`/v1/tags?per_page=${PAGE_SIZE}&page=${page}`);
      if (!response || !Array.isArray(response.data)) {
        throw { message: 'Unexpected tags response format received from server.' };
      }
      all.push(...response.data);
      lastPage = Number(response.last_page) || 1;
      page += 1;
    } while (page <= lastPage && page <= MAX_PAGES);
    return all.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  },

  create(name: string): Promise<CreateTagResponse> {
    const clean = cleanTagName(name);
    return api.post<CreateTagResponse>('/v1/tags', { name: clean, slug: tagSlug(clean) });
  },
};

export type TagError = { status?: number; message?: string; errors?: Record<string, string[]> };

/** True when the request never reached the API (api.ts throws without a status). */
export function isNetworkError(error: unknown): boolean {
  return typeof (error as TagError)?.status !== 'number';
}
