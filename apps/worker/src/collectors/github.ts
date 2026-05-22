import { z } from 'zod';

const GH_API = 'https://api.github.com';

/** Minimal shape of a GitHub repo — only the fields the collector consumes. */
export const GithubRepo = z.object({
  id: z.number(),
  full_name: z.string(),
  name: z.string(),
  html_url: z.string().url(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  open_issues_count: z.number(),
  topics: z.array(z.string()).default([]),
  owner: z.object({
    login: z.string(),
    html_url: z.string().url(),
    type: z.string(),
  }),
  created_at: z.string(),
  pushed_at: z.string(),
});
export type GithubRepo = z.infer<typeof GithubRepo>;

const SearchResponse = z.object({
  total_count: z.number(),
  items: z.array(z.unknown()),
});

export interface FetchTrendingOptions {
  /** Minimum star count. */
  minStars?: number;
  /** Only repos created within this many days (proxy for "new + trending"). */
  createdWithinDays?: number;
  /** Max repos to return (GitHub search caps per_page at 100). */
  limit?: number;
}

/**
 * Fetch trending repos via the GitHub Search API. GitHub has no official
 * "trending" endpoint, so we approximate it: recently-created repos that have
 * already accumulated stars, sorted by stars descending.
 */
export async function fetchTrendingRepos(
  opts: FetchTrendingOptions = {},
): Promise<GithubRepo[]> {
  const { minStars = 50, createdWithinDays = 30, limit = 30 } = opts;

  const since = new Date(Date.now() - createdWithinDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const query = `stars:>${minStars} created:>${since}`;
  const url =
    `${GH_API}/search/repositories?q=${encodeURIComponent(query)}` +
    `&sort=stars&order=desc&per_page=${Math.min(limit, 100)}`;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'product-tracer',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `GitHub search failed: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`,
    );
  }

  const { items } = SearchResponse.parse(await res.json());
  return items.map((item) => GithubRepo.parse(item)).slice(0, limit);
}

/** Stable URL-safe slug from a repo's full name, e.g. `vercel/next.js` → `vercel-next-js`. */
export function repoSlug(fullName: string): string {
  return fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
