/**
 * Normalize free-text fields (project names, one-liners) scraped from external
 * platforms before they are persisted and, later, server-rendered on the web.
 *
 * The visible "horizontal scroll on mobile" fix is a CSS concern and lives in
 * apps/web (overflow-x-clip on <body>, overflow-wrap on text). The backend
 * cannot insert break opportunities into an unbroken token without corrupting
 * the data, so it can't be the primary fix. What it *can* do - and what this
 * helper does - is refuse to serve pathological strings into the SSR payload in
 * the first place: multi-kilobyte taglines, embedded newlines/tabs that break
 * card layouts, and zero-width / bidi control characters that mangle rendering.
 *
 * This is defense-in-depth data hygiene applied uniformly across every
 * collector, so no single platform's quirks can blow out the layout.
 */

/** Default cap for project display names (GitHub already drops names > 80). */
export const NAME_MAX_LEN = 120;
/** Default cap for one-liners / taglines (matches the prior YouTube ad-hoc cap). */
export const ONE_LINER_MAX_LEN = 280;

// Control chars (C0/C1), zero-width spaces/joiners, bidi overrides, BOM, and
// line/paragraph separators - anything that can corrupt or skew text layout.
// Built from ranges so the source stays pure ASCII.
const LAYOUT_HOSTILE = new RegExp(
  '[' +
    '\\u0000-\\u001F' + // C0 controls (incl. \t \n \r)
    '\\u007F-\\u009F' + // DEL + C1 controls
    '\\u200B-\\u200F' + // zero-width space/joiners, LRM/RLM
    '\\u2028\\u2029' + // line / paragraph separators
    '\\u202A-\\u202E' + // bidi embeddings / overrides
    '\\uFEFF' + // BOM / zero-width no-break space
    ']',
  'g',
);

/**
 * Trim, collapse internal whitespace to single spaces, strip layout-hostile
 * control characters, and cap length (truncating on a word boundary with an
 * ellipsis where one is reasonably close to the limit). Returns `null` for
 * nullish or effectively-empty input so callers can pass the result straight
 * into a nullable column.
 */
export function normalizeText(
  value: string | null | undefined,
  maxLen = ONE_LINER_MAX_LEN,
): string | null {
  if (value == null) return null;

  const collapsed = value.replace(LAYOUT_HOSTILE, ' ').replace(/\s+/g, ' ').trim();
  if (collapsed === '') return null;
  if (collapsed.length <= maxLen) return collapsed;

  const slice = collapsed.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  // Prefer a word boundary only if it isn't so early that we'd drop most of the
  // allotted text (e.g. one very long leading token).
  const base = lastSpace > maxLen * 0.6 ? slice.slice(0, lastSpace) : slice;
  return base.trimEnd() + '…';
}
