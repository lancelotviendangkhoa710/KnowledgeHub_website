/**
 * markdownText.ts -- helpers that turn lesson markdown into display-safe text.
 *
 * Lessons are written in the Studio with a small markdown dialect: headings,
 * fenced code, `> [!NOTE]` callouts and `@[youtube](url "title")` embeds.
 * Cards and previews need plain prose, and the reader treats a top-level `# `
 * line as a section heading because the page already renders the title as h1.
 */

const EMBED = /@\[[a-z]+\]\((?:[^)"]|"[^"]*")*\)/gi; // the quoted title may contain ")"
const IMAGE = /!\[([^\]]*)\]\([^)]*\)/g;
const LINK = /\[([^\]]+)\]\([^)]*\)/g;

/** True when the content contains at least one `@[youtube](...)` embed. */
export function hasVideoEmbed(content: string | null | undefined): boolean {
  return !!content && /@\[youtube\]\(/i.test(content);
}

/**
 * Plain-text excerpt for course cards: drops code blocks, headings, callouts,
 * embeds, images and list markers, keeps link text, and cuts on a word boundary.
 */
export function markdownExcerpt(content: string | null | undefined, maxLength = 160): string {
  if (!content) return '';

  const kept: string[] = [];
  let inCode = false;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode || line === '' || line.startsWith('#') || line.startsWith('>') || line.startsWith('|')) continue;
    kept.push(
      line
        .replace(EMBED, ' ')
        .replace(IMAGE, '$1')
        .replace(LINK, '$1')
        .replace(/^([-*+]|\d+\.)\s+/, '')
        .replace(/[`*_~]/g, ''),
    );
  }

  const text = kept.join(' ').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Turns top-level `# ` headings (outside code fences) into `## ` so the reader
 * renders and lists them like other sections instead of showing a raw `#`.
 */
export function normalizeTopHeadings(content: string): string {
  let inCode = false;
  return content
    .split('\n')
    .map((line) => {
      if (line.startsWith('```')) {
        inCode = !inCode;
        return line;
      }
      return !inCode && /^# \S/.test(line) ? `#${line}` : line;
    })
    .join('\n');
}
