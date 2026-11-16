export function getHeadingSlug(text: string, fallbackIdx: number, seenIds: Set<string>): string {
  const base =
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `sec-${fallbackIdx}`;
  let candidate = base;
  let counter = 1;
  while (seenIds.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter++;
  }
  seenIds.add(candidate);
  return candidate;
}
