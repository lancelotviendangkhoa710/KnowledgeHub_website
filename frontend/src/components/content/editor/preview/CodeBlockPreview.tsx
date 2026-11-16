'use client';

import { useState } from 'react';
import styles from '../editorPreview.module.css';

export function CodeBlockPreview({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof window === 'undefined' || !navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Không có quyền hoặc trình duyệt không hỗ trợ: báo cho người dùng thay vì im lặng.
      setFailed(true);
      setTimeout(() => setFailed(false), 3000);
    }
  };

  return (
    <div className={styles.code}>
      <div className={styles.codeTop}>
        <span>{language || 'code'}</span>
        <button type="button" onClick={handleCopy} className={copied ? styles.copied : failed ? styles.failed : undefined}>
          {copied ? (
            <span role="status">Đã sao chép</span>
          ) : failed ? (
            <span role="status">Không sao chép được</span>
          ) : (
            <>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Sao chép
            </>
          )}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
