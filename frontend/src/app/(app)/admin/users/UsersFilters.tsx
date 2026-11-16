import { useState } from 'react';
import type { AdminUserFilters } from '@/lib/accountClient';
import styles from '@/components/content/admin/admin.module.css';
import { ROLE_LABEL, STATUS_LABEL } from './usersText';

type Props = { filters: AdminUserFilters; onChange: (next: AdminUserFilters) => void };

/** Tìm theo tên hoặc email, lọc trạng thái, vai trò và ngày tham gia. Cách gửi bộ lọc giữ như cũ. */
export default function UsersFilters({ filters, onChange }: Props) {
  const [search, setSearch] = useState('');
  return (
    <form
      className={styles.tools}
      onSubmit={(event) => { event.preventDefault(); onChange({ ...filters, search: search.trim() || undefined, page: 1 }); }}
    >
      <label className={styles.search}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input aria-label="Tìm theo tên hoặc email" placeholder="Tìm theo tên hoặc email" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} />
      </label>
      <select className={styles.sel} aria-label="Lọc theo trạng thái" value={filters.status ?? ''} onChange={(event) => onChange({ ...filters, status: event.target.value || undefined, page: 1 })}>
        <option value="">Mọi trạng thái</option>
        {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select className={styles.sel} aria-label="Lọc theo vai trò" value={filters.role ?? ''} onChange={(event) => onChange({ ...filters, role: event.target.value || undefined, page: 1 })}>
        <option value="">Mọi vai trò</option>
        {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select className={styles.sel} aria-label="Lọc theo ngày tham gia" value={filters.created_within_days ?? ''} onChange={(event) => onChange({ ...filters, created_within_days: event.target.value ? Number(event.target.value) : undefined, page: 1 })}>
        <option value="">Tham gia bất kỳ lúc nào</option>
        <option value="1">Trong 1 ngày qua</option>
        <option value="7">Trong 7 ngày qua</option>
        <option value="30">Trong 30 ngày qua</option>
      </select>
      <button className={`${styles.btn} ${styles.ghost} ${styles.sm}`} type="submit">Tìm</button>
    </form>
  );
}
