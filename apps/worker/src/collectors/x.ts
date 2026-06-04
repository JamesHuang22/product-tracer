import { z } from 'zod';
import { Scraper, type Tweet } from 'agent-twitter-client';

/**
 * X (Twitter) collector — built on the open-source `agent-twitter-client`
 * library (no official paid API). We don't hand-roll scraping: the library
 * speaks X's internal endpoints using a logged-in session, so this module just
 * authenticates, pulls a curated founder's recent tweets, and normalises them.
 *
 * Auth is supplied entirely via env (GitHub secrets), never committed:
 *   - X_COOKIES   — JSON array of cookie strings from a logged-in session
 *                   (preferred; most reliable, avoids login challenges)
 *   - or X_USERNAME / X_PASSWORD / X_EMAIL  — username+password login
 *   - optional X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET
 *     (the OAuth 1.0a creds for @chen_og0023) are passed through to login()
 *     when present, which can reduce challenge friction.
 *
 * See research/x-twitter-collector.md for the full rationale.
 */

/** A curated founder/maker we watch. `handle` is the @ name without the @. */
export const FounderEntry = z.object({
  handle: z.string().min(1),
  note: z.string().optional(),
});
export type FounderEntry = z.infer<typeof FounderEntry>;

export const FounderList = z.array(FounderEntry);

/**
 * Normalised tweet — only the fields the collector consumes. A `type` (not
 * `interface`) so it stays assignable to the db layer's `JSONValue` index
 * signature when passed to `sql.json()` (same reasoning as RedditPost).
 */
export type XPost = {
  id: string;
  text: string;
  username: string;
  userId: string | null;
  likes: number;
  retweets: number;
  replies: number;
  views: number | null;
  /** External (non-twitter/x.com) URLs found in the tweet. */
  urls: string[];
  permanentUrl: string | null;
  createdAt: string | null; // ISO 8601
  isRetweet: boolean;
  isReply: boolean;
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** True when enough env is present to authenticate a scraper. */
export function isAuthConfigured(): boolean {
  if (process.env.X_COOKIES) return true;
  return Boolean(process.env.X_USERNAME && process.env.X_PASSWORD);
}

/**
 * Build and authenticate a Scraper from env. Prefers cookie-based auth; falls
 * back to username/password (optionally with OAuth 1.0a creds). Throws when no
 * usable credentials are configured — callers should check isAuthConfigured()
 * first and skip gracefully.
 */
export async function createAuthenticatedScraper(): Promise<Scraper> {
  const scraper = new Scraper();

  const cookiesRaw = process.env.X_COOKIES;
  if (cookiesRaw) {
    let cookies: string[];
    try {
      const parsed: unknown = JSON.parse(cookiesRaw);
      cookies = z.array(z.string()).parse(parsed);
    } catch {
      throw new Error('X_COOKIES must be a JSON array of cookie strings.');
    }
    await scraper.setCookies(cookies);
    return scraper;
  }

  const username = process.env.X_USERNAME;
  const password = process.env.X_PASSWORD;
  if (!username || !password) {
    throw new Error('No X credentials configured (set X_COOKIES or X_USERNAME/X_PASSWORD).');
  }
  await scraper.login(
    username,
    password,
    process.env.X_EMAIL,
    process.env.X_2FA_SECRET,
    process.env.X_API_KEY,
    process.env.X_API_SECRET,
    process.env.X_ACCESS_TOKEN,
    process.env.X_ACCESS_TOKEN_SECRET,
  );
  return scraper;
}

// ---------------------------------------------------------------------------
// Fetch + normalise
// ---------------------------------------------------------------------------

const TWITTER_HOST = /(^|\.)(twitter\.com|x\.com|t\.co)$/i;

/** Keep only off-platform links — those are the ones that point at a product. */
function externalUrls(urls: string[]): string[] {
  const out: string[] = [];
  for (const u of urls) {
    try {
      const host = new URL(u).hostname;
      if (!TWITTER_HOST.test(host)) out.push(u);
    } catch {
      // ignore unparseable URLs
    }
  }
  return out;
}

/** Convert a library Tweet into our XPost, or null if it's unusable. */
export function normalizeTweet(tweet: Tweet): XPost | null {
  if (!tweet.id || !tweet.text) return null;
  return {
    id: tweet.id,
    text: tweet.text,
    username: tweet.username ?? '',
    userId: tweet.userId ?? null,
    likes: tweet.likes ?? 0,
    retweets: tweet.retweets ?? 0,
    replies: tweet.replies ?? 0,
    views: tweet.views ?? null,
    urls: externalUrls(tweet.urls ?? []),
    permanentUrl: tweet.permanentUrl ?? null,
    createdAt: tweet.timeParsed ? tweet.timeParsed.toISOString() : null,
    isRetweet: Boolean(tweet.isRetweet),
    isReply: Boolean(tweet.isReply),
  };
}

/**
 * Fetch a user's most recent original tweets (skips retweets/replies).
 * Sequential generator drain with a hard cap to stay polite.
 */
export async function fetchUserTweets(
  scraper: Scraper,
  handle: string,
  maxTweets = 20,
): Promise<XPost[]> {
  const posts: XPost[] = [];
  for await (const tweet of scraper.getTweets(handle, maxTweets)) {
    const post = normalizeTweet(tweet);
    if (!post) continue;
    if (post.isRetweet || post.isReply) continue;
    posts.push(post);
    if (posts.length >= maxTweets) break;
  }
  return posts;
}

// ---------------------------------------------------------------------------
// Product-relevance filter
// ---------------------------------------------------------------------------

// Launch / traction vocabulary — tweets that read like a founder talking about
// their own product rather than chit-chat.
const PRODUCT_KEYWORDS =
  /\b(launch(ed|ing)?|shipp(ed|ing)|built|building|made|release(d)?|introducing|just\s+(shipped|launched|built)|now\s+live|beta|v\d|open[-\s]?source|side\s?project|product\s?hunt|show\s?hn|try\s+it|check\s+it\s+out|i\s+made|we\s+made|demo)\b/i;

/**
 * A tweet is "product-relevant" if it carries an external link (likely the
 * product) or uses launch/traction language. Keeps signal, drops chatter.
 */
export function isProductTweet(post: XPost): boolean {
  if (post.urls.length > 0) return true;
  return PRODUCT_KEYWORDS.test(post.text);
}

/** Slug for an X-originated project, stable per tweet. */
export function xPostSlug(post: XPost): string {
  const handle = post.username || 'x';
  return `x-${handle}-${post.id}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Extract an @handle from a twitter/x.com profile URL, else null. */
export function handleFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!/(^|\.)(twitter\.com|x\.com)$/i.test(u.hostname)) return null;
    const seg = u.pathname.split('/').filter(Boolean)[0];
    if (!seg) return null;
    // Skip reserved/non-profile paths.
    if (/^(i|home|search|hashtag|explore|messages|notifications|status)$/i.test(seg)) return null;
    return seg.replace(/^@/, '');
  } catch {
    return null;
  }
}
