/**
 * product-tracer worker 入口
 *
 * 调度所有 collector 的执行逻辑。
 * 被 cron (Railway / Fly / 系统 cron) 每 6h 触发。
 */

import { fetchRepo } from "./collectors/github.js";
import { fetchRecentPosts } from "./collectors/producthunt.js";

interface CollectorRunResult {
  platform: string;
  success: boolean;
  itemsCollected: number;
  error?: string;
  durationMs: number;
}

/**
 * 运行一轮所有 collector
 */
export async function runAllCollectors(): Promise<CollectorRunResult[]> {
  const results: CollectorRunResult[] = [];

  // GitHub — 从环境变量读取要追踪的 repo 列表
  const targetRepos = parseRepoList(process.env.TRACKED_REPOS);
  if (targetRepos.length > 0) {
    const t0 = Date.now();
    try {
      const data = await Promise.all(
        targetRepos.map((r) =>
          fetchRepo(r.owner, r.repo).catch((e) => {
            console.error(`[GH] ${r.owner}/${r.repo} failed:`, e.message);
            return null;
          }),
        ),
      );
      const valid = data.filter(Boolean);
      results.push({
        platform: "github",
        success: true,
        itemsCollected: valid.length,
        durationMs: Date.now() - t0,
      });
    } catch (e: any) {
      results.push({
        platform: "github",
        success: false,
        itemsCollected: 0,
        error: e.message,
        durationMs: Date.now() - t0,
      });
    }
  }

  // Product Hunt
  const t1 = Date.now();
  try {
    const posts = await fetchRecentPosts();
    results.push({
      platform: "producthunt",
      success: true,
      itemsCollected: posts.length,
      durationMs: Date.now() - t1,
    });
  } catch (e: any) {
    results.push({
      platform: "producthunt",
      success: false,
      itemsCollected: 0,
      error: e.message,
      durationMs: Date.now() - t1,
    });
  }

  return results;
}

/**
 * 解析环境变量 REPO_LIST（格式: owner/repo,owner/repo...）
 */
function parseRepoList(raw?: string): Array<{ owner: string; repo: string }> {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const parts = s.split("/");
      if (parts.length !== 2) return null;
      return { owner: parts[0], repo: parts[1] };
    })
    .filter((x): x is { owner: string; repo: string } => x !== null);
}

// ─── CLI 入口 ──────────────────────────────────────────────
// 直接 `node dist/index.js` 时运行
if (process.argv[1]?.endsWith("index.js")) {
  runAllCollectors().then((results) => {
    console.log(JSON.stringify(results, null, 2));
    const hasFailures = results.some((r) => !r.success);
    process.exit(hasFailures ? 1 : 0);
  });
}
