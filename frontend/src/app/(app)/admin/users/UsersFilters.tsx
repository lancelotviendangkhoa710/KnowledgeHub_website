import { useState } from 'react';
import type { AdminUserFilters } from '@/lib/accountClient';
import Select from '@/components/ui/Select';
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
      <Select
        className={styles.filterSel}
        compact
        ariaLabel="Lọc theo trạng thái"
        value={filters.status ?? ''}
        onChange={(value) => onChange({ ...filters, status: value || undefined, page: 1 })}
        options={[{ value: '', label: 'Mọi trạng thái' }, ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))]}
      />
      <Select
        className={styles.filterSel}
        compact
        ariaLabel="Lọc theo vai trò"
        value={filters.role ?? ''}
        onChange={(value) => onChange({ ...filters, role: value || undefined, page: 1 })}
        options={[{ value: '', label: 'Mọi vai trò' }, ...Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))]}
      />
      <Select
        className={styles.filterSel}
        compact
        ariaLabel="Lọc theo ngày tham gia"
        value={filters.created_within_days ? String(filters.created_within_days) : ''}
        onChange={(value) => onChange({ ...filters, created_within_days: value ? Number(value) : undefined, page: 1 })}
        options={[
          { value: '', label: 'Tham gia bất kỳ lúc nào' },
          { value: '1', label: 'Trong 1 ngày qua' },
          { value: '7', label: 'Trong 7 ngày qua' },
          { value: '30', label: 'Trong 30 ngày qua' },
        ]}
      />
      <button className={`${styles.btn} ${styles.ghost} ${styles.sm}`} type="submit">Tìm</button>
    </form>
  );
}
