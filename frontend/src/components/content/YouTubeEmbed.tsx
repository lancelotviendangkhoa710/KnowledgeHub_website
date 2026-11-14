'use client';

import { extractYouTubeVideoId, getYouTubeEmbedUrl, getYouTubeWatchUrl } from '@/lib/videoUtils';
import styles from './YouTubeEmbed.module.css';

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
  caption?: string;
}

export default function YouTubeEmbed({ videoId, title, caption }: YouTubeEmbedProps) {
  const sanitizedId = extractYouTubeVideoId(videoId);

  if (!sanitizedId) {
    return (
      <div role="region" aria-label="Thông báo video không hợp lệ" className={styles.invalid}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>
          <strong>Không có video:</strong> không đọc hoặc xác minh an toàn được liên kết YouTube này.
        </span>
      </div>
    );
  }

  const embedUrl = getYouTubeEmbedUrl(sanitizedId);
  const watchUrl = getYouTubeWatchUrl(sanitizedId);
  const videoTitle = title || 'Video bài giảng';

  return (
    <figure className={styles.figure}>
      <div className={styles.player}>
        <iframe
          src={embedUrl}
          title={videoTitle}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <div className={styles.bar}>
        <span className={styles.title}>{videoTitle}</span>
        <a
          className={styles.open}
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Mở “${videoTitle}” trên YouTube`}
        >
          Mở trên YouTube
        </a>
      </div>
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}
