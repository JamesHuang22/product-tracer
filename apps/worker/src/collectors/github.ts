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

// ---------------------------------------------------------------------------
// Shared HTTP helper
// ---------------------------------------------------------------------------

async function ghFetch(path: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'product-tracer',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${GH_API}${path}`, { headers });
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Discovery — multi-query coverage instead of one loose search
// ---------------------------------------------------------------------------

export interface QueryConfig {
  label: string;
  q: string;
  sort: 'stars' | 'updated';
  limit: number;
}

/**
 * Default discovery set — focused queries that bias toward indie-relevant
 * projects rather than awesome-lists and tutorials.
 */
export function defaultDiscoveryQueries(): QueryConfig[] {
  const newCutoff = daysAgo(30);
  const recentCutoff = daysAgo(7);
  return [
    { label: 'new-trending', q: `stars:>50 created:>${newCutoff}`, sort: 'stars', limit: 30 },
    { label: 'indie-topic', q: `topic:indie pushed:>${recentCutoff}`, sort: 'stars', limit: 30 },
    { label: 'side-project', q: `topic:side-project pushed:>${recentCutoff}`, sort: 'stars', limit: 20 },
    {
      label: 'mid-active-ts',
      q: `language:TypeScript stars:100..10000 pushed:>${recentCutoff}`,
      sort: 'updated',
      limit: 30,
    },
  ];
}

/**
 * Run each discovery query, dedupe by repo id, return the union + a per-query
 * count for observability.
 */
export async function discoverRepos(
  queries: QueryConfig[] = defaultDiscoveryQueries(),
): Promise<{ repos: GithubRepo[]; perQuery: Record<string, number> }> {
  const byId = new Map<number, GithubRepo>();
  const perQuery: Record<string, number> = {};
  for (const q of queries) {
    const url =
      `/search/repositories?q=${encodeURIComponent(q.q)}` +
      `&sort=${q.sort}&order=desc&per_page=${Math.min(q.limit, 100)}`;
    const res = await ghFetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `GitHub search '${q.label}' failed: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`,
      );
    }
    const parsed = SearchResponse.parse(await res.json());
    let added = 0;
    for (const item of parsed.items.slice(0, q.limit)) {
      const repo = GithubRepo.parse(item);
      if (!byId.has(repo.id)) {
        byId.set(repo.id, repo);
        added++;
      }
    }
    perQuery[q.label] = added;
  }
  return { repos: [...byId.values()], perQuery };
}

// ---------------------------------------------------------------------------
// Re-snapshot known repos — essential for velocity (T3) to ever compute deltas
// ---------------------------------------------------------------------------

/**
 * Fetch the current state of repos we already know about, by their GitHub
 * numeric ID. Returns repos that still exist, plus ids that 404'd (deleted /
 * made private). Sequential rather than parallel — well within rate limits
 * for the project sizes we care about.
 */
export async function fetchKnownReposByIds(
  ids: number[],
): Promise<{ repos: GithubRepo[]; missing: number[] }> {
  const repos: GithubRepo[] = [];
  const missing: number[] = [];
  for (const id of ids) {
    const res = await ghFetch(`/repositories/${id}`);
    if (res.status === 404) {
      missing.push(id);
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `GitHub repo ${id} failed: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`,
      );
    }
    repos.push(GithubRepo.parse(await res.json()));
  }
  return { repos, missing };
}

// ---------------------------------------------------------------------------
// Noise filter — drop obvious non-indie-product results
// ---------------------------------------------------------------------------

const NOISE_DESCRIPTION =
  /\b(awesome|curated\s+list|cheat\s*sheet|books?|tutorials?|interview|leetcode|study\s+notes?|learning\s+resources?)\b/i;

const NOISE_TOPICS = new Set([
  'awesome',
  'awesome-list',
  'awesome-lists',
  'book',
  'books',
  'cheatsheet',
  'cheatsheets',
  'interview',
  'interview-preparation',
  'learning',
  'learning-resources',
  'study-notes',
  'tutorial',
  'tutorials',
]);

export function isNoiseRepo(repo: GithubRepo): boolean {
  if (repo.description && NOISE_DESCRIPTION.test(repo.description)) return true;
  if (repo.topics.some((t) => NOISE_TOPICS.has(t))) return true;
  // Garbage names — pure punctuation, or absurdly long auto-generated names.
  if (/^[-_./]+$/.test(repo.name) || repo.name.length > 80) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Back-compat: single-query helper kept so older scripts and tests still work
// ---------------------------------------------------------------------------

export interface FetchTrendingOptions {
  minStars?: number;
  createdWithinDays?: number;
  limit?: number;
}

export async function fetchTrendingRepos(
  opts: FetchTrendingOptions = {},
): Promise<GithubRepo[]> {
  const { minStars = 50, createdWithinDays = 30, limit = 30 } = opts;
  const since = daysAgo(createdWithinDays);
  const query = `stars:>${minStars} created:>${since}`;
  const url =
    `/search/repositories?q=${encodeURIComponent(query)}` +
    `&sort=stars&order=desc&per_page=${Math.min(limit, 100)}`;
  const res = await ghFetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `GitHub search failed: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`,
    );
  }
  const { items } = SearchResponse.parse(await res.json());
  return items.map((item) => GithubRepo.parse(item)).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Slug helper
// ---------------------------------------------------------------------------

export function repoSlug(fullName: string): string {
  return fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
