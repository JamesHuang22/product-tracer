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

/** True when `text` contains any CJK ideograph or kana character. */
export function hasCjk(text: string | null | undefined): boolean {
  return !!text && CJK_RE.test(text);
}

/**
 * A single-column free-text value (e.g. project `one_liner`) shown for `locale`.
 * These columns are sometimes Chinese, or English prose with a few Chinese
 * tokens mixed in, and there is no separate English column to fall back to. In
 * English mode we drop the whole value on *any* CJK character — a mixed string
 * would otherwise leak its Chinese into the EN UI — so the only CJK left in EN
 * is genuine product names (rendered separately). Chinese mode shows it as-is.
 */
export function localizedText(
  locale: 'en' | 'zh',
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  if (locale === 'en' && hasCjk(text)) return null;
  return text;
}

/**
 * Pick the right paragraph from a bilingual pair (separate English + Chinese
 * columns). Chinese mode prefers the Chinese column and falls back to English so
 * the card is never empty. English mode returns the English column only when it
 * is free of CJK — some rows store Chinese (or mixed) text in it — and otherwise
 * null, rather than leak Chinese into the EN UI.
 */
export function localizedPair(
  locale: 'en' | 'zh',
  en: string | null | undefined,
  zh: string | null | undefined,
): string | null {
  if (locale === 'zh') return zh || en || null;
  if (en && !hasCjk(en)) return en;
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
