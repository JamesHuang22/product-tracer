export function fmtCount(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toLocaleString();
}

// Collected one_liner text (notably from HN/PH) can carry raw HTML entities and
// run on for the length of a whole post. Decode the common entities and trim to
// a sane preview length before showing it anywhere in the UI.
export function cleanOneLiner(text: string | null): string | null {
  if (!text) return null;
  const decoded = text
    .replace(/&#x2F;/g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .trim();
  if (!decoded) return null;
  const chars = [...decoded];
  if (chars.length > 120) return chars.slice(0, 120).join('').trimEnd() + '…';
  return decoded;
}
