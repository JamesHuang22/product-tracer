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
 * Reddit requires a descriptive, unique User-Agent even for unauthenticated
 * access; generic UAs get rate-limited / blocked. Overridable via env.
 */
const USER_AGENT = process.env.REDDIT_USER_AGENT || 'ProductTracer/1.0 (+https://github.com/JamesHuang22/product-tracer)';

/**
 * Fetch the current "hot" listing for a subreddit via Reddit's public JSON
 * endpoint — no OAuth, no API key (Reddit's "Responsible Builder Policy" blocks
 * app creation, but `/r/{sub}/hot.json` is still served anonymously, rate
 * limited to ~60 req/min). A descriptive User-Agent header is required.
 */
export async function fetchSubredditHot(subreddit: string, limit = 25): Promise<RedditPost[]> {
  const capped = Math.min(Math.max(limit, 1), 100);
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${capped}`;

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Reddit r/${subreddit} failed: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`,
    );
  }
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
