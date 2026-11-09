/**
 * Video Utilities for YouTube parsing, sanitization, and URL generation.
 */

export const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Validates that a string is a strict 11-character YouTube video ID
 * to prevent XSS and malformed embed URLs.
 */
export function isValidYouTubeId(id: string): boolean {
  return YOUTUBE_ID_REGEX.test(id);
}

/**
 * Extracts a sanitized 11-character YouTube video ID from various formats:
 * - Direct ID: dQw4w9WgXcQ
 * - Markdown embed syntax: @[youtube](VIDEO_ID_OR_URL)
 * - Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
 * - Short URL: https://youtu.be/VIDEO_ID
 * - Embed URL: https://www.youtube.com/embed/VIDEO_ID or youtube-nocookie.com/embed/VIDEO_ID
 * - Shorts URL: https://www.youtube.com/shorts/VIDEO_ID
 * - Live URL: https://www.youtube.com/live/VIDEO_ID
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input) return null;
  let cleanInput = input.trim();

  // 1. If wrapped in markdown syntax @[youtube](...)
  const mdMatch = cleanInput.match(/^@\[youtube\]\((.+?)\)$/i);
  if (mdMatch) {
    cleanInput = mdMatch[1].trim();
  }

  // Strip trailing optional quoted title: <target> "title"
  const titleStripMatch = cleanInput.match(/^(\S+)(?:\s+["'].*?["'])?$/);
  if (titleStripMatch) {
    cleanInput = titleStripMatch[1].trim();
  }

  // 2. Direct 11-character video ID
  if (isValidYouTubeId(cleanInput)) {
    return cleanInput;
  }

  // 3. Parse URLs using standard URL constructor with strict host validation
  try {
    const urlString =
      cleanInput.startsWith('http://') || cleanInput.startsWith('https://')
        ? cleanInput
        : `https://${cleanInput}`;

    const parsed = new URL(urlString);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // YouTube standard domains
    if (
      host === 'youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com'
    ) {
      // /watch?v=...
      if (parsed.pathname === '/watch') {
        const v = parsed.searchParams.get('v');
        if (v && isValidYouTubeId(v)) {
          return v;
        }
      }

      // /embed/ID
      if (parsed.pathname.startsWith('/embed/')) {
        const id = parsed.pathname.split('/')[2];
        if (id && isValidYouTubeId(id)) {
          return id;
        }
      }

      // /shorts/ID
      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/')[2];
        if (id && isValidYouTubeId(id)) {
          return id;
        }
      }

      // /live/ID
      if (parsed.pathname.startsWith('/live/')) {
        const id = parsed.pathname.split('/')[2];
        if (id && isValidYouTubeId(id)) {
          return id;
        }
      }

      // /v/ID
      if (parsed.pathname.startsWith('/v/')) {
        const id = parsed.pathname.split('/')[2];
        if (id && isValidYouTubeId(id)) {
          return id;
        }
      }
    }

    // youtu.be/ID
    if (host === 'youtu.be') {
      const id = parsed.pathname.replace(/^\/+/, '').split('/')[0];
      if (id && isValidYouTubeId(id)) {
        return id;
      }
    }
  } catch {
    // Malformed URL string
  }

  return null;
}

/**
 * Returns privacy-enhanced embed URL for YouTube player iframe.
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  const safeId = isValidYouTubeId(videoId) ? videoId : '';
  return `https://www.youtube-nocookie.com/embed/${safeId}?rel=0`;
}

/**
 * Returns direct YouTube watch URL.
 */
export function getYouTubeWatchUrl(videoId: string): string {
  const safeId = isValidYouTubeId(videoId) ? videoId : '';
  return `https://www.youtube.com/watch?v=${safeId}`;
}

/**
 * Formats a YouTube video ID or URL into standard markdown embed syntax.
 */
export function formatYouTubeMarkdown(videoIdOrUrl: string): string {
  return `@[youtube](${videoIdOrUrl})`;
}
