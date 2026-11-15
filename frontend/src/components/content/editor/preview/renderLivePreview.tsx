import { extractYouTubeVideoId } from '@/lib/videoUtils';
import YouTubeEmbed from '@/components/content/YouTubeEmbed';
import { CodeBlockPreview } from './CodeBlockPreview';
import { CalloutPreview } from './CalloutPreview';
import { renderPreviewInline } from './renderPreviewInline';
import { getHeadingSlug } from './getHeadingSlug';

export function renderLivePreview(raw: string): React.ReactNode[] {
  const lines = raw.split('\n');
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Code Block
    if (line.startsWith('```')) {
      const codeLanguage = line.replace('```', '').trim();
      const codeBuffer: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeBuffer.push(lines[i]);
        i++;
      }
      elements.push(
        <CodeBlockPreview
          key={`code-${i}`}
          code={codeBuffer.join('\n')}
          language={codeLanguage}
        />
      );
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('## ')) {
      const text = line.replace('## ', '').trim();
      const hId = getHeadingSlug(text, i, new Set());
      elements.push(
        <h2
          key={`h2-${i}`}
          id={hId}
        >
          {text}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      const text = line.replace('### ', '').trim();
      const hId = getHeadingSlug(text, i, new Set());
      elements.push(
        <h3
          key={`h3-${i}`}
          id={hId}
        >
          {text}
        </h3>
      );
      i++;
      continue;
    }

    // Callout / Blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      let isNote = false;
      let isTip = false;
      let isWarning = false;

      const firstClean = line.replace(/^>\s*/, '');
      if (/^\[!(NOTE|IMPORTANT)\]/i.test(firstClean)) {
        isNote = true;
        const rest = firstClean.replace(/^\[!(NOTE|IMPORTANT)\]\s*/i, '').trim();
        if (rest) quoteLines.push(rest);
      } else if (/^\[!TIP\]/i.test(firstClean)) {
        isTip = true;
        const rest = firstClean.replace(/^\[!TIP\]\s*/i, '').trim();
        if (rest) quoteLines.push(rest);
      } else if (/^\[!(WARNING|CAUTION)\]/i.test(firstClean)) {
        isWarning = true;
        const rest = firstClean.replace(/^\[!(WARNING|CAUTION)\]\s*/i, '').trim();
        if (rest) quoteLines.push(rest);
      } else {
        quoteLines.push(firstClean);
      }

      i++;
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s*/, ''));
        i++;
      }

      const kind: 'note' | 'tip' | 'warning' | 'default' = isTip ? 'tip' : isWarning ? 'warning' : isNote ? 'note' : 'default';
      const titleText = isTip ? 'Mẹo' : isWarning ? 'Cảnh báo' : isNote ? 'Lưu ý' : undefined;

      elements.push(
        <CalloutPreview key={`quote-${i}`} kind={kind} title={titleText}>
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx}>
              {renderPreviewInline(ql)}
            </p>
          ))}
        </CalloutPreview>
      );
      continue;
    }

    // Lists
    if (line.startsWith('* ') || line.startsWith('- ')) {
      elements.push(
        <li
          key={`li-${i}`}
        >
          {renderPreviewInline(line.replace(/^[*-]\s+/, ''))}
        </li>
      );
      i++;
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---') {
      elements.push(<hr key={`hr-${i}`} />);
      i++;
      continue;
    }

    // YouTube Embed (@[youtube](...) or standalone URL)
    const trimmed = line.trim();
    const ytSyntaxMatch = trimmed.match(/^@\[youtube\]\((.+?)\)$/i);
    const isStandaloneYt =
      !ytSyntaxMatch &&
      /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtube-nocookie\.com|youtu\.be)\/[^\s]+$/i.test(trimmed);

    if (ytSyntaxMatch || isStandaloneYt) {
      let rawTarget = trimmed;
      let customTitle: string | undefined = undefined;

      if (ytSyntaxMatch) {
        const inner = ytSyntaxMatch[1].trim();
        const titleMatch = inner.match(/^(\S+)(?:\s+["'](.+?)["'])?$/);
        if (titleMatch) {
          rawTarget = titleMatch[1];
          customTitle = titleMatch[2];
        } else {
          rawTarget = inner;
        }
      }

      const videoId = extractYouTubeVideoId(rawTarget);
      if (videoId) {
        elements.push(
          <YouTubeEmbed
            key={`yt-${i}`}
            videoId={videoId}
            title={customTitle}
          />
        );
        i++;
        continue;
      } else if (ytSyntaxMatch) {
        // Explicit @[youtube](...) syntax with invalid ID or spoofed URL -> render error box
        elements.push(
          <YouTubeEmbed
            key={`yt-invalid-${i}`}
            videoId={rawTarget}
            title={customTitle}
          />
        );
        i++;
        continue;
      }
    }

    // Paragraph
    if (trimmed.length > 0) {
      elements.push(
        <p
          key={`p-${i}`}
        >
          {renderPreviewInline(line)}
        </p>
      );
    }

    i++;
  }

  return elements;
}
