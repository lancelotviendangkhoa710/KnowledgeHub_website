import type { CSSProperties, ReactNode } from 'react';
import styles from './authForm.module.css';

type Letter = [string, Record<string, string>, boolean?];

// Các chữ của KnowledgeHub rải mờ phía sau; hai chữ cuối neo vào mép dưới và bị cắt một phần (chủ ý).
const LETTERS: Letter[] = [
  ['K', { '--x': '24%', '--y': '12%', '--s': '190px', '--r': '-8deg', '--a': '.12', '--d': '0s' }],
  ['n', { '--x': '46%', '--y': '3%', '--s': '115px', '--r': '7deg', '--a': '.06', '--d': '.05s' }],
  ['o', { '--x': '62%', '--y': '16%', '--s': '150px', '--r': '-5deg', '--a': '.07', '--d': '.1s' }],
  ['w', { '--x': '82%', '--y': '4%', '--s': '110px', '--r': '10deg', '--a': '.06', '--d': '.15s' }],
  ['l', { '--x': '6%', '--y': '36%', '--s': '130px', '--r': '5deg', '--a': '.06', '--d': '.2s' }],
  ['e', { '--x': '36%', '--y': '32%', '--s': '150px', '--r': '-10deg', '--a': '.07', '--d': '.25s' }],
  ['d', { '--x': '56%', '--y': '38%', '--s': '120px', '--r': '8deg', '--a': '.06', '--d': '.3s' }],
  ['g', { '--x': '76%', '--y': '70%', '--s': '130px', '--r': '-6deg', '--a': '.06', '--d': '.35s' }],
  ['e', { '--x': '88%', '--y': '30%', '--s': '100px', '--r': '12deg', '--a': '.06', '--d': '.4s' }],
  ['H', { '--x': '70%', '--y': '50%', '--s': '180px', '--r': '6deg', '--a': '.12', '--d': '.45s' }],
  ['u', { '--x': '5%', '--b': '-34px', '--s': '170px', '--r': '-9deg', '--a': '.07', '--d': '.5s' }, true],
  ['b', { '--x': '27%', '--b': '-46px', '--s': '150px', '--r': '8deg', '--a': '.07', '--d': '.55s' }, true],
];

const DONE = ['Database, giao dịch và đồng thời', 'Thiết kế pipeline ETL và ELT'];

/** Khung đăng nhập và đăng ký: khung xanh bên trái, biểu mẫu bên phải (mockup #dang-nhap). */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.auth}>
      <aside className={styles.art} aria-hidden="true">
        <div className={styles.scatter} aria-hidden="true">
          {LETTERS.map(([ch, vars, bot], i) => (
            <i key={i} className={bot ? styles.bot : undefined} style={vars as CSSProperties}>{ch}</i>
          ))}
        </div>
        <div className={styles.disc} />
        <div className={styles.spark} />
        <div className={styles.ring} />
        <div className={styles.artBody}>
          <h2 className={styles.rise1}>KnowledgeHub</h2>
          <p className={styles.rise2}>Nền tảng học tập có chọn lọc, kèm trợ lý AI.</p>
          <div className={`${styles.demo} ${styles.rise3}`}>
            <b>Data Engineer, trình độ Intermediate</b>
            <small>Ví dụ minh họa, 3 trên 5 khóa đã xong</small>
            <div className={styles.bar}><i /></div>
            <ol>
              {DONE.map((t) => (
                <li key={t}>
                  <span className={styles.tick}><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
                  {t}
                </li>
              ))}
              <li><span className={styles.now} />Kiểm thử và quan sát pipeline <em>Đang học</em></li>
            </ol>
          </div>
        </div>
      </aside>
      <div className={styles.formCol}>
        <div className={styles.box}>{children}</div>
      </div>
    </div>
  );
}
