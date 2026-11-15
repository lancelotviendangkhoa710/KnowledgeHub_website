export function renderPreviewInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const matched = match[0];
    if (matched.startsWith('`') && matched.endsWith('`')) {
      parts.push(
        <code key={`code-${match.index}`}>
          {matched.slice(1, -1)}
        </code>
      );
    } else if (matched.startsWith('**') && matched.endsWith('**')) {
      parts.push(<strong key={`bold-${match.index}`}>{matched.slice(2, -2)}</strong>);
    } else if (matched.startsWith('*') && matched.endsWith('*')) {
      parts.push(<em key={`italic-${match.index}`}>{matched.slice(1, -1)}</em>);
    } else if (matched.startsWith('~~') && matched.endsWith('~~')) {
      parts.push(<del key={`del-${match.index}`}>{matched.slice(2, -2)}</del>);
    } else if (matched.startsWith('[') && matched.includes('](')) {
      const closingBracket = matched.indexOf('](');
      const linkText = matched.slice(1, closingBracket);
      const linkHref = matched.slice(closingBracket + 2, -1).trim();

      const isSafe =
        linkHref.startsWith('#') ||
        (linkHref.startsWith('/') &&
          !linkHref.startsWith('//') &&
          !linkHref.startsWith('/\\') &&
          !linkHref.includes('\\') &&
          !/[\r\n\t]/.test(linkHref)) ||
        linkHref.startsWith('http://') ||
        linkHref.startsWith('https://');

      if (isSafe) {
        parts.push(
          <a
            key={`link-${match.index}`}
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            {linkText}
          </a>
        );
      } else {
        parts.push(linkText);
      }
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
