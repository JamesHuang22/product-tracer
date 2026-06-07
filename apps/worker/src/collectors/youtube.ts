import { z } from 'zod';

/**
 * YouTube collector — monitors a curated list of channels that review/demo new
 * AI projects and indie products, and mines their video descriptions for the
 * projects they point at (GitHub repos first, then any external links).
 *
 * Built on the official YouTube Data API v3 (read-only). A single API key is
 * all that's needed; supply it via env / GitHub secrets:
 *   - YOUTUBE_API_KEY — Google Cloud API key with "YouTube Data API v3" enabled
 *
 * The key is never committed. When it's absent the batch script skips cleanly
 * (see collect-youtube.ts), so the workflow and local typecheck never hard-fail
 * just because the secret isn't set.
 */

const YT_API = 'https://www.googleapis.com/youtube/v3';

/** A curated channel we watch. `id` is the UC… channel id. */
export const YoutubeChannel = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  note: z.string().optional(),
});
export type YoutubeChannel = z.infer<typeof YoutubeChannel>;

export const YoutubeChannelList = z.array(YoutubeChannel);

/**
 * Default channel list — indie / AI project reviewers. Mirrored in
 * config/youtube-channels.json (which, if present, takes precedence). Channel
 * ids should be verified against the live API; a wrong id just yields zero
 * videos for that channel (logged, never fatal).
 */
export const DEFAULT_CHANNELS: YoutubeChannel[] = [
  { id: 'UCzHl5aV1M8qNqGTY5kU0X5w', name: 'Matt Wolfe', note: 'AI tools weekly roundup' },
  { id: 'UCV7_KgXRRc4I5JmXRA5eW6A', name: 'The AI Advantage', note: 'AI project tutorials' },
  { id: 'UCsBjURrPoezykLs9EqgamOA', name: 'Fireship', note: 'tech reviews' },
  { id: 'UCcQ2M7CRA7tP0t8dZm8fX3A', name: 'AI Explained', note: 'AI deep dives' },
  { id: 'UCbfYPyITQ-7l4upoX8nWQdQ', name: 'Two Minute Papers', note: 'AI paper demos' },
];

/**
 * Normalised YouTube video — only the fields the collector consumes. A `type`
 * (not `interface`) so it stays assignable to the db layer's `JSONValue` index
 * signature when passed to `sql.json()` (same reasoning as XPost / PHProduct).
 */
export type YoutubeVideo = {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string; // ISO 8601
  videoUrl: string;
  thumbnailUrl: string | null;
  /** Engagement, normalised to numbers (the API returns them as strings). */
  views: number;
  likes: number;
  comments: number;
  /** Canonical github.com/owner/repo URLs found in the description. */
  githubUrls: string[];
  /** All external (non-youtube) URLs found in the description. */
  descriptionUrls: string[];
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** True when a YouTube API key is configured. */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

// ---------------------------------------------------------------------------
// URL extraction
// ---------------------------------------------------------------------------

const GITHUB_URL_RE = /https?:\/\/github\.com\/[^\s)\]<>"']+/gi;
const URL_RE = /https?:\/\/[^\s)\]<>"']+/gi;
const YOUTUBE_HOST = /(^|\.)(youtube\.com|youtu\.be|googleusercontent\.com)$/i;

/** GitHub routes that aren't a user/repo (avoid minting bogus projects). */
const GH_RESERVED = new Set([
  'topics',
  'collections',
  'search',
  'features',
  'enterprise',
  'pricing',
  'about',
  'sponsors',
  'marketplace',
  'orgs',
  'login',
  'join',
]);

/** Strip trailing punctuation a URL regex tends to grab from prose. */
function trimUrl(url: string): string {
  return url.replace(/[.,;:!?]+$/, '');
}

/**
 * Extract canonical "https://github.com/owner/repo" URLs from free text.
 * Normalises to the bare repo root (drops /tree/…, /blob/…, query, hash, .git),
 * lowercases, dedupes, and rejects GitHub's own non-repo routes.
 */
export function extractGithubUrls(text: string): string[] {
  if (!text) return [];
  const out = new Set<string>();
  for (const raw of text.match(GITHUB_URL_RE) ?? []) {
    const m = trimUrl(raw).match(/^https?:\/\/github\.com\/([^/?#]+)\/([^/?#]+)/i);
    if (!m) continue;
    const owner = m[1]!.toLowerCase();
    let repo = m[2]!.toLowerCase();
    if (repo.endsWith('.git')) repo = repo.slice(0, -4);
    if (GH_RESERVED.has(owner) || !repo) continue;
    out.add(`https://github.com/${owner}/${repo}`);
  }
  return [...out];
}

/** Extract all off-platform (non-YouTube) URLs from free text, deduped. */
export function extractDescriptionUrls(text: string): string[] {
  if (!text) return [];
  const out = new Set<string>();
  for (const raw of text.match(URL_RE) ?? []) {
    const url = trimUrl(raw);
    try {
      if (!YOUTUBE_HOST.test(new URL(url).hostname)) out.add(url);
    } catch {
      // ignore unparseable URLs
    }
  }
  return [...out];
}

// ---------------------------------------------------------------------------
// Fetch + normalise (YouTube Data API v3)
// ---------------------------------------------------------------------------

const SearchResponse = z.object({
  items: z
    .array(
      z.object({
        id: z.object({ videoId: z.string().optional() }).optional(),
      }),
    )
    .default([]),
});

const VideosResponse = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        snippet: z.object({
          title: z.string().default(''),
          description: z.string().default(''),
          channelId: z.string().default(''),
          channelTitle: z.string().default(''),
          publishedAt: z.string().default(''),
          thumbnails: z.record(z.object({ url: z.string() }).partial()).default({}),
        }),
        statistics: z
          .object({
            viewCount: z.string().optional(),
            likeCount: z.string().optional(),
            commentCount: z.string().optional(),
          })
          .default({}),
      }),
    )
    .default([]),
});

async function ytFetch(pathAndQuery: string, apiKey: string): Promise<Response> {
  const sep = pathAndQuery.includes('?') ? '&' : '?';
  return fetch(`${YT_API}${pathAndQuery}${sep}key=${encodeURIComponent(apiKey)}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'product-tracer' },
  });
}

function toInt(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Pick the highest-resolution thumbnail the API returned, else null. */
function bestThumbnail(thumbs: Record<string, { url?: string }>): string | null {
  for (const size of ['maxres', 'standard', 'high', 'medium', 'default']) {
    const url = thumbs[size]?.url;
    if (url) return url;
  }
  return null;
}

/**
 * Fetch a channel's most recent videos via the Data API v3.
 *
 * Two calls: search.list (channel's latest video ids, by date) then videos.list
 * (full descriptions + statistics — search snippets truncate the description and
 * omit view/like counts). Returns videos newest-first.
 */
export async function getChannelVideos(
  channelId: string,
  apiKey: string,
  maxResults = 10,
): Promise<YoutubeVideo[]> {
  const n = Math.min(Math.max(maxResults, 1), 50);
  const searchRes = await ytFetch(
    `/search?part=id&channelId=${encodeURIComponent(channelId)}` +
      `&order=date&type=video&maxResults=${n}`,
    apiKey,
  );
  if (!searchRes.ok) {
    const body = await searchRes.text();
    throw new Error(
      `YouTube search (${channelId}) failed: ${searchRes.status} ${searchRes.statusText} — ${body.slice(0, 200)}`,
    );
  }
  const search = SearchResponse.parse(await searchRes.json());
  const ids = search.items.map((i) => i.id?.videoId).filter((v): v is string => Boolean(v));
  if (ids.length === 0) return [];

  const videosRes = await ytFetch(
    `/videos?part=snippet,statistics&id=${ids.map(encodeURIComponent).join(',')}&maxResults=${n}`,
    apiKey,
  );
  if (!videosRes.ok) {
    const body = await videosRes.text();
    throw new Error(
      `YouTube videos (${channelId}) failed: ${videosRes.status} ${videosRes.statusText} — ${body.slice(0, 200)}`,
    );
  }
  const parsed = VideosResponse.parse(await videosRes.json());

  return parsed.items.map((item) => {
    const description = item.snippet.description;
    return {
      id: item.id,
      title: item.snippet.title,
      description,
      channelId: item.snippet.channelId || channelId,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
      thumbnailUrl: bestThumbnail(item.snippet.thumbnails),
      views: toInt(item.statistics.viewCount),
      likes: toInt(item.statistics.likeCount),
      comments: toInt(item.statistics.commentCount),
      githubUrls: extractGithubUrls(description),
      descriptionUrls: extractDescriptionUrls(description),
    } satisfies YoutubeVideo;
  });
}
