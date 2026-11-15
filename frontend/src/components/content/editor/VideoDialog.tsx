'use client';

import { Dispatch, SetStateAction, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './videoDialog.module.css';

type Props = {
  videoInsertNotice: string | null;
  showVideoModal: boolean;
  setShowVideoModal: Dispatch<SetStateAction<boolean>>;
  videoInputUrl: string;
  setVideoInputUrl: (val: string) => void;
  videoCustomTitle: string;
  setVideoCustomTitle: (val: string) => void;
  detectedVideoId: string | null;
  handleInsertVideo: () => void;
};

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/** Hộp thoại chèn video YouTube. Focus vào ô đầu, Tab xoay vòng trong hộp, Esc đóng, trả focus về nút "Video YouTube". */
function YouTubeModal({ setShowVideoModal, videoInputUrl, setVideoInputUrl, videoCustomTitle, setVideoCustomTitle, detectedVideoId, handleInsertVideo }: Omit<Props, 'videoInsertNotice' | 'showVideoModal'>) {
  const titleId = useId();
  const urlHelpId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  // Đã nhập chữ thì bấm nền không đóng hộp (tránh mất dữ liệu). Cập nhật sau mỗi lần render, không đọc khi đang render.
  const hasInput = useRef(false);
  useEffect(() => {
    hasInput.current = Boolean(videoInputUrl.trim() || videoCustomTitle.trim());
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    urlRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowVideoModal(false);
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      // Safari không focus nút khi bấm: ưu tiên nút "Video YouTube" trên thanh công cụ.
      const trigger = document.querySelector<HTMLElement>('[data-video-trigger]');
      (trigger ?? opener)?.focus?.();
    };
  }, [setShowVideoModal]);

  const invalid = Boolean(videoInputUrl.trim()) && !detectedVideoId;

  return (
    <div
      role="presentation"
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !hasInput.current) setShowVideoModal(false);
      }}
    >
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className={styles.panel}>
        <h2 id={titleId} className={styles.title}>Chèn video YouTube</h2>

        <div className={styles.field}>
          <label htmlFor="video-url">Đường dẫn video</label>
          <input
            id="video-url"
            ref={urlRef}
            type="text"
            value={videoInputUrl}
            onChange={(e) => setVideoInputUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            aria-invalid={invalid}
            aria-describedby={urlHelpId}
          />
          <small id={urlHelpId} aria-live="polite" className={detectedVideoId ? styles.okv : invalid ? styles.bad : undefined}>
            {detectedVideoId
              ? 'Đã nhận diện video hợp lệ.'
              : invalid
                ? 'Không nhận diện được đường dẫn hoặc mã video YouTube.'
                : 'Dán đường dẫn hoặc mã video YouTube.'}
          </small>
          {detectedVideoId && (
            // eslint-disable-next-line @next/next/no-img-element -- ảnh bìa nhỏ từ YouTube, không cần tối ưu bằng next/image
            <img
              className={styles.thumb}
              src={`https://img.youtube.com/vi/${detectedVideoId}/mqdefault.jpg`}
              alt={`Ảnh bìa video ${detectedVideoId}`}
            />
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="video-title">Tiêu đề video</label>
          <input
            id="video-title"
            type="text"
            value={videoCustomTitle}
            onChange={(e) => setVideoCustomTitle(e.target.value)}
            placeholder="Ví dụ: Bài giảng 1, giới thiệu đồng thuận phân tán"
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={() => setShowVideoModal(false)}>
            Hủy
          </button>
          <button type="button" className={styles.btn} disabled={!detectedVideoId} onClick={handleInsertVideo}>
            Chèn video
          </button>
        </div>
      </div>
    </div>
  );
}

export function VideoDialog({ videoInsertNotice, showVideoModal, ...modal }: Props) {
  return (
    <>
      {videoInsertNotice && (
        <div className={styles.notice} role="status">
          <span>{videoInsertNotice}</span>
        </div>
      )}
      {showVideoModal && createPortal(<YouTubeModal {...modal} />, document.body)}
    </>
  );
}
