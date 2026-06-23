import { z } from 'zod';

/** Subreddits we track by default — indie-maker / startup focused. */
export const DEFAULT_SUBREDDITS = ['SideProject', 'indiehackers', 'startups'] as const;

/**
 * Normalised Reddit post — only the fields the collector consumes.
 * A `type` (not `interface`) so it stays assignable to the db layer's
 * `JSONValue` index signature when passed to `sql.json()`.
 */
export type RedditPost = {
  id: string;
  title: string;
  selftext: string;
  url: string;
  score: number;
  num_comments: number;
  created_utc: number;
  subreddit: string;
  permalink: string;
};

// Raw listing shape — Reddit wraps each post in a { kind, data } envelope.
const RedditChild = z.object({
  kind: z.string(),
  data: z.object({
    id: z.string(),
    title: z.string(),
    selftext: z.string().default(''),
    url: z.string().default(''),
    score: z.number().default(0),
    num_comments: z.number().default(0),
    created_utc: z.number(),
    subreddit: z.string(),
    permalink: z.string().default(''),
    stickied: z.boolean().optional(),
    over_18: z.boolean().optional(),
  }),
});

const RedditListing = z.object({
  data: z.object({
    children: z.array(RedditChild).default([]),
  }),
});

/**
 * Realistic browser User-Agents we rotate through. `www.reddit.com` increasingly
 * 403s datacenter IPs (GitHub Actions runners) regardless of UA; `old.reddit.com`
 * (see REDDIT_HOST) is far more lenient, and rotating a realistic browser UA on
 * each retry clears the remaining intermittent blocks. A descriptive bot UA is
 * kept last as a courtesy fallback.
 */
const FALLBACK_USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'ProductTracer/1.0 (+https://github.com/JamesHuang22/product-tracer)',
];

/** Old Reddit is friendlier to datacenter IPs than www; overridable via env. */
const REDDIT_HOST = process.env.REDDIT_HOST || 'old.reddit.com';

/**
 * UA rotation pool: an explicit REDDIT_USER_AGENT (if set) is tried first, then
 * the realistic browser fallbacks.
 */
function userAgents(): string[] {
  const explicit = process.env.REDDIT_USER_AGENT?.trim();
  return explicit ? [explicit, ...FALLBACK_USER_AGENTS] : FALLBACK_USER_AGENTS;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Decode the XML/HTML entities that appear in Reddit's RSS feed. */
function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    // &amp; last so we don't prematurely collapse e.g. "&amp;#32;" (double-encoded).
    .replace(/&amp;/g, '&');
}

/**
 * Parse Reddit's Atom RSS feed into RedditPost[]. RSS carries no score/comment
 * counts (set to 0) but does expose the post id, title, timestamp, subreddit and
 * — via the `[link]` anchor in the entry content — the submitted URL (so GitHub
 * cross-matching still works for link posts).
 */
export function parseRedditRss(xml: string, fallbackSub: string): RedditPost[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  const posts: RedditPost[] = [];
  for (const e of entries) {
    const id = (e.match(/<id>([\s\S]*?)<\/id>/)?.[1] ?? '').trim().replace(/^t3_/, '');
    if (!id) continue;
    const title = decodeXml((e.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '').trim());
    const entryLink = (e.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? '').trim();
    const published = (e.match(/<published>([\s\S]*?)<\/published>/)?.[1] ?? '').trim();
    const term = (e.match(/<category[^>]*term="([^"]+)"/)?.[1] ?? '').trim();
    const content = decodeXml(e.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] ?? '');
    const linkHref = content.match(/<a href="([^"]+)">\s*\[link\]\s*<\/a>/)?.[1]?.trim();
    const url = linkHref || entryLink;
    const created = published ? Math.floor(Date.parse(published) / 1000) : NaN;
    let permalink = '';
    try {
      if (entryLink) permalink = new URL(entryLink).pathname;
    } catch {
      permalink = '';
    }
    posts.push({
      id,
      title,
      selftext: '',
      url,
      score: 0,
      num_comments: 0,
      created_utc: Number.isFinite(created) ? created : Math.floor(Date.now() / 1000),
      subreddit: term || fallbackSub,
      permalink,
    });
  }
  return posts;
}

/**
 * RSS fallback for when the JSON endpoint is IP/UA-blocked. `*.rss` is served on
 * `www.reddit.com` to clients the `.json` endpoint now 403s (verified). Rotates
 * the same UA pool and retries 403/429.
 */
async function fetchSubredditRss(
  subreddit: string,
  limit: number,
  agents: string[],
): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/hot/.rss?limit=${limit}`;
  const maxAttempts = Math.min(agents.length, 3);
  let lastStatus = '';
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, {
      headers: {
        'User-Agent': agents[attempt % agents.length]!,
        Accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml',
      },
    });
    if (res.ok) return parseRedditRss(await res.text(), subreddit);
    lastStatus = `${res.status} ${res.statusText}`;
    if (res.status === 403 || res.status === 429) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    break;
  }
  throw new Error(`Reddit r/${subreddit} RSS failed: ${lastStatus}`);
}

/**
 * Fetch the current "hot" listing for a subreddit. No OAuth, no API key.
 *
 * Strategy: try the public JSON endpoint on `old.reddit.com` first (richest
 * data — scores, comment counts, external URLs), rotating a realistic browser
 * User-Agent across up to 3 attempts and retrying 403/429 (the IP/UA blocks that
 * hit CI runners) with backoff. Reddit now 403s the `.json` endpoint from many
 * datacenter IPs regardless of UA, so when JSON stays blocked we fall back to
 * the Atom RSS feed (still served where JSON isn't) — fewer fields (no
 * score/comments) but it keeps the collector producing data instead of 403ing.
 */
export async function fetchSubredditHot(subreddit: string, limit = 25): Promise<RedditPost[]> {
  const capped = Math.min(Math.max(limit, 1), 100);
  const url = `https://${REDDIT_HOST}/r/${subreddit}/hot.json?limit=${capped}&raw_json=1`;
  const agents = userAgents();
  const maxAttempts = Math.min(agents.length, 3);

  let lastStatus = '';
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, {
      headers: {
        'User-Agent': agents[attempt % agents.length]!,
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const parsed = RedditListing.parse(await res.json());
      return (
        parsed.data.children
          // Drop pinned/announcement posts — they're not launches.
          .filter((c) => !c.data.stickied)
          .map((c) => ({
            id: c.data.id,
            title: c.data.title,
            selftext: c.data.selftext,
            url: c.data.url,
            score: c.data.score,
            num_comments: c.data.num_comments,
            created_utc: c.data.created_utc,
            subreddit: c.data.subreddit,
            permalink: c.data.permalink,
          }))
      );
    }

    lastStatus = `${res.status} ${res.statusText}`;
    // 403 (IP/UA block) and 429 (rate limit) are worth retrying with a fresh UA.
    if (res.status === 403 || res.status === 429) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    // Other non-OK (404 etc.) — stop hammering JSON and try the RSS fallback.
    break;
  }

  // JSON exhausted/blocked → fall back to the RSS feed.
  try {
    return await fetchSubredditRss(subreddit, capped, agents);
  } catch (rssErr) {
    const rssMsg = rssErr instanceof Error ? rssErr.message : String(rssErr);
    throw new Error(
      `Reddit r/${subreddit} failed: JSON ${lastStatus || 'blocked'}; ${rssMsg}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Noise filter — drop meta/discussion threads that aren't a product
// ---------------------------------------------------------------------------

const NOISE_TITLE =
  /\b(weekly|monthly|megathread|mega\s*thread|feedback\s+friday|share\s+your|what\s+are\s+you\s+working|ask\s+me\s+anything|\bAMA\b|hiring|who\s+is\s+hiring)\b/i;

export function isNoisePost(p: RedditPost): boolean {
  if (!p.title.trim()) return true;
  if (NOISE_TITLE.test(p.title)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Slug helper
// ---------------------------------------------------------------------------

/**
 * URL-safe slug for app.project.slug, derived from the post title. Falls back
 * to `reddit-{id}` if the title yields an empty slug. Truncated to 80 chars.
 */
export function postSlug(p: RedditPost): string {
  const slug = p.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || `reddit-${p.id}`;
}
