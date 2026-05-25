import { z } from 'zod';

const HN_API = 'https://hacker-news.firebaseio.com/v0';

/** Minimal HN story shape — only fields the collector consumes. */
export const HNStory = z.object({
  id: z.number(),
  type: z.string(),
  by: z.string().optional(),
  title: z.string().optional(),
  url: z.string().optional(),
  text: z.string().optional(),
  score: z.number().optional(),
  descendants: z.number().optional(),
  time: z.number(),
  kids: z.array(z.number()).optional(),
  dead: z.boolean().optional(),
  deleted: z.boolean().optional(),
});
export type HNStory = z.infer<typeof HNStory>;

async function hnFetch(path: string): Promise<Response> {
  return fetch(`${HN_API}${path}`, {
    headers: { 'User-Agent': 'product-tracer' },
  });
}

/**
 * Fetch the current Show HN front page — story IDs sorted by HN's ranking
 * algorithm (~recency × score). No auth.
 */
export async function fetchShowStoryIds(limit = 100): Promise<number[]> {
  const res = await hnFetch('/showstories.json');
  if (!res.ok) {
    throw new Error(`HN showstories failed: ${res.status} ${res.statusText}`);
  }
  const ids = (await res.json()) as number[];
  return ids.slice(0, limit);
}

/**
 * Fetch a single HN item. Returns null for deleted/dead items or non-story
 * types (comments, polls).
 */
export async function fetchStory(id: number): Promise<HNStory | null> {
  const res = await hnFetch(`/item/${id}.json`);
  if (!res.ok) {
    throw new Error(`HN item ${id} failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (json === null) return null;
  const parsed = HNStory.parse(json);
  if (parsed.type !== 'story') return null;
  if (parsed.dead || parsed.deleted) return null;
  return parsed;
}

/**
 * Fetch many stories in parallel, dropping nulls. HN's Firebase API has no
 * batch endpoint, but it's CDN-backed and fast — parallel fetch is fine for
 * 100 items.
 */
export async function fetchStories(ids: number[]): Promise<HNStory[]> {
  const results = await Promise.all(ids.map(fetchStory));
  return results.filter((s): s is HNStory => s !== null);
}

/**
 * If a URL points to a GitHub repo, return canonical "owner/repo" (lowercased).
 * Handles trailing slashes, /tree/..., /pull/..., .git suffix. Rejects
 * non-repo URLs like github.com/topics/foo.
 */
export function extractGithubRepo(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/^https?:\/\/github\.com\/([^/?#]+)\/([^/?#]+)/i);
  if (!m) return null;
  const owner = m[1]!;
  let repo = m[2]!;
  if (repo.endsWith('.git')) repo = repo.slice(0, -4);
  // Reject GitHub's own non-user routes.
  if (['topics', 'collections', 'search', 'features', 'enterprise', 'pricing'].includes(owner)) {
    return null;
  }
  return `${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

/** Strip "Show HN:" / "Show HN —" / "Show HN -" prefix from a story title. */
export function cleanShowHnTitle(title: string): string {
  return title.replace(/^\s*show\s*hn\s*[:\-—–]\s*/i, '').trim();
}

/**
 * URL-safe slug for app.project.slug. Falls back to `hn-{id}` if the title
 * yields an empty slug. Truncated to 80 chars; the upstream upsert handles
 * any rare collisions via the unique constraint (collector_error path).
 */
export function storySlug(story: HNStory): string {
  const cleaned = story.title ? cleanShowHnTitle(story.title) : '';
  const slug = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || `hn-${story.id}`;
}
