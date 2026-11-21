import type { HTMLAttributes } from 'react';
import styles from './ghostWord.module.css';

/**
 * Chữ KNOWLEDGE rất mờ làm nền hero, trôi chậm theo chiều ngang. Dùng chung cho trang giới thiệu và trang Khóa học.
 * Hai bản chữ nối nhau để vòng lặp liền mạch; `...rest` cho phép trang gắn thêm thuộc tính (vd. data-motion).
 */
export default function GhostWord(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={styles.ghost} aria-hidden="true" {...props}>
      <span className={styles.track}>
        <span>KNOWLEDGE</span>
        <span>KNOWLEDGE</span>
      </span>
    </div>
  );
}
