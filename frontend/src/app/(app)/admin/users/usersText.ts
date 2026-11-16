import type { AssignableRole, UserStatus } from '@/lib/accountClient';

export const STATUS_LABEL: Record<UserStatus, string> = {
  active: 'Hoạt động',
  pending: 'Chờ duyệt',
  inactive: 'Ngưng hoạt động',
  banned: 'Bị khóa',
};

/** Màu nhãn trạng thái: tên class trong admin.module.css. */
export const STATUS_TONE: Record<UserStatus, 'ok' | 'draft' | 'bad'> = { active: 'ok', pending: 'draft', inactive: 'draft', banned: 'bad' };

export const ROLE_LABEL: Record<AssignableRole, string> = { user: 'Người học', contributor: 'Người viết', admin: 'Quản trị viên' };

/** Vai trò hiển thị bằng chữ; vai trò lạ giữ nguyên giá trị API. */
export function roleText(roles: string[]): string {
  return roles.map((r) => ROLE_LABEL[r as AssignableRole] ?? r).join(', ');
}

/** dd/mm/yyyy theo giờ máy; thiếu hoặc sai ngày thì hiện dấu gạch. */
export function formatJoined(iso: string | null): string {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '-';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
