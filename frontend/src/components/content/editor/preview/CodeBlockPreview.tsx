'use client';

import { useState } from 'react';
import styles from '../editorPreview.module.css';

export function CodeBlockPreview({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard permission fallback
      }
    }
  };

  return (
    <div className={styles.code}>
      <div className={styles.codeTop}>
        <span>{language || 'code'}</span>
        <button type="button" onClick={handleCopy} className={copied ? styles.copied : undefined}>
          {copied ? (
            <>
              Đã sao chép
            </>
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
