/**
 * GitHub Collector
 *
 * 从 GitHub API 获取项目指标（stars, forks, releases）。
 * PRD §3: P0 — 免费（5000 req/h authed），无商用限制。
 *
 * 配置环境变量: GITHUB_TOKEN (personal access token)
 */

const GITHUB_API = "https://api.github.com";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export interface GitHubRepoData {
  owner: string;
  repo: string;
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  description: string | null;
  language: string | null;
  topics: string[];
  pushedAt: string;
  createdAt: string;
}

export interface GitHubCollectorOptions {
  /** 超时 (ms) */
  timeout?: number;
}

/**
 * 获取单个 GitHub 仓库数据
 */
export async function fetchRepo(
  owner: string,
  repo: string,
  options: GitHubCollectorOptions = {},
): Promise<GitHubRepoData> {
  const { timeout = 10_000 } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "product-tracer/0.1",
    };
    if (GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
    }

    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`GitHub API responded ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      owner,
      repo,
      stars: data.stargazers_count ?? 0,
      forks: data.forks_count ?? 0,
      openIssues: data.open_issues_count ?? 0,
      watchers: data.subscribers_count ?? 0,
      description: data.description ?? null,
      language: data.language ?? null,
      topics: data.topics ?? [],
      pushedAt: data.pushed_at,
      createdAt: data.created_at,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 获取多个仓库数据（并发，带限流）
 */
export async function fetchRepos(
  repos: Array<{ owner: string; repo: string }>,
  options: GitHubCollectorOptions & { concurrency?: number } = {},
): Promise<GitHubRepoData[]> {
  const { concurrency = 3, ...rest } = options;
  const results: GitHubRepoData[] = [];

  for (let i = 0; i < repos.length; i += concurrency) {
    const batch = repos.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((r) => fetchRepo(r.owner, r.repo, rest)),
    );
    results.push(...batchResults);

    // 避免触发 rate limit
    if (i + concurrency < repos.length) {
      await sleep(1000);
    }
  }

  return results;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
