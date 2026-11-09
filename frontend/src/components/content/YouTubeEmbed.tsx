'use client';

import { extractYouTubeVideoId, getYouTubeEmbedUrl, getYouTubeWatchUrl } from '@/lib/videoUtils';

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
  caption?: string;
}

export default function YouTubeEmbed({ videoId, title, caption }: YouTubeEmbedProps) {
  const sanitizedId = extractYouTubeVideoId(videoId);

  if (!sanitizedId) {
    return (
      <div
        role="region"
        aria-label="Invalid video notice"
        style={{
          margin: '2rem 0',
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: '#FFFBEB',
          border: '1px solid #FCD34D',
          color: '#92400E',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.95rem',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>
          <strong>Video Unavailable:</strong> The provided YouTube video reference could not be parsed or verified safely.
        </span>
      </div>
    );
  }

  const embedUrl = getYouTubeEmbedUrl(sanitizedId);
  const watchUrl = getYouTubeWatchUrl(sanitizedId);
  const videoTitle = title || 'Course Lecture Video';

  return (
    <figure
      style={{
        margin: '2.25rem 0',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        backgroundColor: 'var(--color-white)',
        boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.08))',
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.65rem 1.25rem',
          backgroundColor: 'var(--color-background, #F8FAFC)',
          borderBottom: '1px solid var(--color-border)',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span
            className="badge"
            style={{
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              border: '1px solid #FECACA',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-full)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
            </svg>
            Video Lecture
          </span>

          {title && (
            <span
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-charcoal)',
                maxWidth: '400px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={title}
            >
              {title}
            </span>
          )}
        </div>

        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open "${videoTitle}" in YouTube`}
          style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--color-gray)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            textDecoration: 'none',
            padding: '0.25rem 0.5rem',
            borderRadius: 'var(--radius-sm, 4px)',
            transition: 'color var(--transition-fast), background-color var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-gray)';
          }}
        >
          <span>Open in YouTube</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>

      {/* Cinematic 16:9 Player Viewport */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          backgroundColor: '#0F172A',
          overflow: 'hidden',
        }}
      >
        <iframe
          src={embedUrl}
          title={videoTitle}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 0,
          }}
        />
      </div>

      {/* Optional Caption */}
      {caption && (
        <figcaption
          style={{
            padding: '0.65rem 1.25rem',
            fontSize: '0.825rem',
            color: 'var(--color-gray)',
            backgroundColor: 'var(--color-background, #F8FAFC)',
            borderTop: '1px solid var(--color-border)',
            fontStyle: 'italic',
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
