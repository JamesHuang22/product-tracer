export function fmtCount(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toLocaleString();
}

// CJK Unified Ideographs (+ Extension A, Compatibility) and Japanese kana — the
// character ranges that make up the Chinese content we store. Some single-column
// text fields (project `one_liner`, the "English" `key_insight`) occasionally
// hold Chinese; these helpers keep that out of the English UI, where there is no
// English alternative to fall back to.
const CJK_RE = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/;

/** Fraction of non-whitespace characters that are CJK / kana (0–1). */
export function cjkShare(text: string): number {
  let total = 0;
  let cjk = 0;
  for (const ch of text) {
    if (!ch.trim()) continue;
    total += 1;
    if (CJK_RE.test(ch)) cjk += 1;
  }
  return total === 0 ? 0 : cjk / total;
}

// Above this share of CJK characters we treat a string as "Chinese" and hide it
// from the English UI. Comfortably clears English text that merely contains a
// CJK product name, while catching whole Chinese sentences.
const CJK_SUPPRESS_THRESHOLD = 0.2;

/**
 * A single-column free-text value (e.g. project `one_liner`) shown for `locale`.
 * In English mode, predominantly-CJK text is suppressed (returns null) so stray
 * Chinese never leaks into the EN UI; Chinese mode shows whatever is available.
 */
export function localizedText(
  locale: 'en' | 'zh',
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  if (locale === 'en' && cjkShare(text) > CJK_SUPPRESS_THRESHOLD) return null;
  return text;
}

/**
 * Pick the right paragraph from a bilingual pair (separate English + Chinese
 * columns). Chinese mode prefers the Chinese column and falls back to English so
 * the card is never empty. English mode returns the English column only when it
 * is genuinely English — some rows store Chinese in it — and otherwise null,
 * rather than leak Chinese into the EN UI.
 */
export function localizedPair(
  locale: 'en' | 'zh',
  en: string | null | undefined,
  zh: string | null | undefined,
): string | null {
  if (locale === 'zh') return zh || en || null;
  if (en && cjkShare(en) <= CJK_SUPPRESS_THRESHOLD) return en;
  return null;
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
