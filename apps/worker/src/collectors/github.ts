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

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Cap how long we'll wait out a rate-limit window before giving up on a repo
// (we'd rather skip it this run than hang the whole CI job).
const RATE_LIMIT_MAX_WAIT_MS = 60_000;

/** GitHub signals rate limiting with 429, or 403 + x-ratelimit-remaining: 0. */
function isRateLimited(res: Response): boolean {
  return (
    res.status === 429 ||
    (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0')
  );
}

function rateLimitWaitMs(res: Response): number {
  const retryAfter = res.headers.get('retry-after');
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs)) return Math.min(secs * 1000, RATE_LIMIT_MAX_WAIT_MS);
  }
  const reset = res.headers.get('x-ratelimit-reset');
  if (reset) {
    const resetMs = Number(reset) * 1000 - Date.now();
    if (Number.isFinite(resetMs) && resetMs > 0) return Math.min(resetMs, RATE_LIMIT_MAX_WAIT_MS);
  }
  return 1000; // small default backoff
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
 * numeric ID. Sequential rather than parallel — well within rate limits for
 * the project sizes we care about.
 *
 * Single-repo failures are isolated so one bad repo never aborts the whole run:
 *   - 404            → `missing`  (deleted / made private)
 *   - 403 / 451      → `blocked`  (TOS-blocked / DMCA / legally unavailable)
 *   - 429 / 403-RL   → one wait-and-retry; if it still fails, `blocked`
 * Genuine unexpected errors (auth 401, 5xx, network throws) still bubble up.
 */
export async function fetchKnownReposByIds(
  ids: number[],
): Promise<{ repos: GithubRepo[]; missing: number[]; blocked: number[] }> {
  const repos: GithubRepo[] = [];
  const missing: number[] = [];
  const blocked: number[] = [];

  for (const id of ids) {
    let res = await ghFetch(`/repositories/${id}`);

    // Rate limited — wait out the window once, then retry this id.
    if (isRateLimited(res)) {
      await sleep(rateLimitWaitMs(res));
      res = await ghFetch(`/repositories/${id}`);
    }

    if (res.status === 404) {
      missing.push(id);
      continue;
    }
    // 403 (incl. TOS block / still rate-limited), 451 (legal) → skip this repo,
    // don't crash the collector. Drain the body so the connection is freed.
    if (res.status === 403 || res.status === 451) {
      const body = await res.text().catch(() => '');
      blocked.push(id);
      console.warn(
        `  ⚠ skipping repo ${id}: ${res.status} ${res.statusText} — ${body.slice(0, 160)}`,
      );
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

  return { repos, missing, blocked };
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
// Freshness filter — drop long-abandoned repos (unless they're clearly notable)
// ---------------------------------------------------------------------------

const SIX_MONTHS_MS = 183 * 86_400_000;

/**
 * A repo is "stale" if it hasn't been pushed to in over 6 months — *unless* it
 * has > 1000 stars (an established project worth keeping tracked even between
 * pushes). Keeps the catalogue biased toward currently-active work.
 */
export function isStaleRepo(repo: GithubRepo): boolean {
  if (repo.stargazers_count > 1000) return false;
  const pushedMs = Date.parse(repo.pushed_at);
  if (!Number.isFinite(pushedMs)) return false; // unknown push time → don't drop
  return Date.now() - pushedMs > SIX_MONTHS_MS;
}

// ---------------------------------------------------------------------------
// Stats enrichment — open PR count + recent commit velocity (best-effort)
// ---------------------------------------------------------------------------

export interface RepoStats {
  open_prs_count: number | null;
  recent_commits_30d: number | null;
}

/** Parse the last-page number out of a paginated response's Link header. */
function lastPageFromLink(link: string | null): number | null {
  if (!link) return null;
  const m = link.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
  return m ? Number(m[1]) : null;
}

/**
 * Best-effort extra stats for one repo. Each call is wrapped so a failure or
 * rate-limit yields `null` for that field rather than aborting the collector —
 * the columns simply stay unfilled until a future run can afford the calls.
 *
 *  - open_prs_count: `search/issues?q=repo:…+is:pr+is:open` → total_count.
 *  - recent_commits_30d: `commits?since=<30d>&per_page=1`, read the Link header's
 *    last-page number (commits are one-per-page here, so last page == count).
 *    Capped at 100 (GitHub stops paginating the count past that) — good enough
 *    as a velocity signal.
 */
export async function enrichRepoStats(repo: GithubRepo): Promise<RepoStats> {
  const stats: RepoStats = { open_prs_count: null, recent_commits_30d: null };

  try {
    const q = encodeURIComponent(`repo:${repo.full_name} is:pr is:open`);
    const res = await ghFetch(`/search/issues?q=${q}&per_page=1`);
    if (res.ok) {
      const json = (await res.json()) as { total_count?: number };
      if (typeof json.total_count === 'number') stats.open_prs_count = json.total_count;
    } else {
      await res.text().catch(() => '');
    }
  } catch {
    /* leave null */
  }

  try {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const res = await ghFetch(
      `/repos/${repo.full_name}/commits?since=${since}&per_page=1`,
    );
    if (res.ok) {
      const lastPage = lastPageFromLink(res.headers.get('link'));
      if (lastPage != null) {
        stats.recent_commits_30d = lastPage;
      } else {
        // No Link header → 0 or 1 commits in the window; count the body length.
        const arr = (await res.json()) as unknown[];
        stats.recent_commits_30d = Array.isArray(arr) ? arr.length : null;
      }
    } else {
      await res.text().catch(() => '');
    }
  } catch {
    /* leave null */
  }

  return stats;
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
