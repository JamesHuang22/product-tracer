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

const USER_AGENT = 'ProductTracer/1.0';

// Cache the app-only bearer token across calls within a single run.
let cachedToken: string | null = null;

/**
 * Obtain a Reddit app-only OAuth token (client_credentials grant) when
 * `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` are set. Reddit increasingly
 * blocks anonymous JSON from datacenter/cloud IPs (403), so OAuth is the
 * reliable path in CI. Returns null when no creds are configured.
 */
async function getAppToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;

  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Reddit OAuth token failed: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`,
    );
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('Reddit OAuth token response missing access_token');
  cachedToken = json.access_token;
  return cachedToken;
}

/**
 * Fetch the current "hot" listing for a subreddit. Uses app-only OAuth
 * (oauth.reddit.com) when Reddit creds are configured, otherwise falls back to
 * the public JSON endpoint. A descriptive User-Agent is required either way —
 * Reddit rate-limits / blocks generic UAs aggressively.
 */
export async function fetchSubredditHot(subreddit: string, limit = 25): Promise<RedditPost[]> {
  const capped = Math.min(Math.max(limit, 1), 100);
  const token = await getAppToken();

  const url = token
    ? `https://oauth.reddit.com/r/${subreddit}/hot?limit=${capped}`
    : `https://www.reddit.com/r/${subreddit}/hot.json?limit=${capped}`;
  const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
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
