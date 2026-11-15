'use client';

import type { Ref } from 'react';
import Select from '@/components/ui/Select';
import styles from './studio.module.css';
import type { StatusFilter } from './studioUtils';

type Props = {
  query: string;
  onQuery: (value: string) => void;
  status: StatusFilter;
  onStatus: (value: StatusFilter) => void;
  counts: { published: number; draft: number; archived: number };
  /** Đích nhận focus dự phòng khi nút đã mở hộp thoại bị gỡ khỏi bảng. */
  searchRef?: Ref<HTMLInputElement>;
};

/** Thanh công cụ: ô tìm theo tên hoặc slug và ô chọn trạng thái kèm số lượng. */
export default function StudioToolbar({ query, onQuery, status, onStatus, counts, searchRef }: Props) {
  return (
    <div className={styles.tools}>
      <label className={styles.search}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Tìm theo tên hoặc slug"
          aria-label="Tìm khóa học"
        />
      </label>
      <Select
        className={styles.filter}
        compact
        ariaLabel="Lọc theo trạng thái"
        value={status}
        onChange={(value) => onStatus(value as StatusFilter)}
        options={[
          { value: 'all', label: 'Mọi trạng thái' },
          { value: 'published', label: `Đã xuất bản (${counts.published})` },
          { value: 'draft', label: `Bản nháp (${counts.draft})` },
          { value: 'archived', label: `Đã lưu trữ (${counts.archived})` },
        ]}
      />
    </div>
  );
}
