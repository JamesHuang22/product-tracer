# Assistant Queue — Alex → Claude Code

> 当前状态: 🟢 等待中

---

## 任务一（高优先级）: Reddit Collector

### 目标
采集 Reddit 上独立开发者相关 subreddit 的热门帖子，进入数据管线。

### 数据源
- **r/SideProject** — 独立开发者项目分享
- **r/indiehackers** — 独立创收讨论
- **r/startups** — 创业相关

### API: Reddit 公开 JSON
Reddit 无需 API key:
```
https://www.reddit.com/r/SideProject/hot.json?limit=25
https://www.reddit.com/r/indiehackers/hot.json?limit=25
https://www.reddit.com/r/startups/hot.json?limit=25
```
只需 `User-Agent: ProductTracer/1.0` header。

返回:
```json
{ "data": { "children": [{ "data": { "id": "abc123", "title": "...", "selftext": "...", "url": "...", "score": 42, "num_comments": 10, "created_utc": 1685000000, "subreddit": "SideProject", "permalink": "/r/..." } }] } }
```

### 需要修改的文件

**1. 新增 `apps/worker/src/collectors/reddit.ts`**
```typescript
export interface RedditPost { id: string; title: string; selftext: string; url: string; score: number; num_comments: number; created_utc: number; subreddit: string; permalink: string; }
export function fetchSubredditHot(subreddit: string, limit?: number): Promise<RedditPost[]>;
export function isNoisePost(p: RedditPost): boolean;
export function postSlug(p: RedditPost): string;
```

**2. 新增 `apps/worker/src/scripts/collect-reddit.ts`**
- 遍历 3 个 subreddit，每轮间隔 2s
- 每个帖子写 `raw.snapshot` (score=upvotes, num_comments=comments, raw_data)
- 新建 project 记录到 `app.project`
- 写 `app.project_metric.reddit_score`（需新增列: `alter table app.project_metric add column if not exists reddit_score integer;`）
- URL 是 github.com/owner/repo → hard-match（参考 HN collector 的 `findGithubProjectMatch`）

**3. `.github/workflows/collect-reddit.yml`**
- 每 4h cron，偏移 2h
- secrets: `DATABASE_URL`

**4. `apps/worker/package.json`** — `"collect:reddit": "tsx src/scripts/collect-reddit.ts"`（在 worker 的 package.json，不是根目录的）

**5. `packages/types/src/index.ts`** — 确认 Platform 枚举已含 `'reddit'`

---

## 任务二: 前端支持 Product Hunt

### 目标
Product Hunt collector 已跑通并写入数据。首页（`page.tsx`）的 Product Hunt 区块要从 "Coming Soon" 改为 real data。

### 需要修改的文件

**1. `apps/web/lib/db.ts`**
- `getPlatformTop()` 和 `getPlatformProjectCount()` 的 `LivePlatform` 类型加 `'product_hunt'`
- Product Hunt 查询: `ph_upvotes` 作为 metric，`'upvotes'` 作为 metric_label

```typescript
export type LivePlatform = 'github' | 'hacker_news' | 'product_hunt';

// 在 getPlatformTop 里加 product_hunt 分支:
if (platform === 'product_hunt') {
  return await sql<PlatformTopItem[]>`
    select
      p.id, p.slug, p.name, p.one_liner, p.primary_url,
      latest.ph_upvotes as metric,
      'upvotes'::text as metric_label
    from app.project p
    join app.identity_link il on il.project_id = p.id and il.platform = 'product_hunt'
    left join lateral (
      select pm.ph_upvotes from app.project_metric pm
      where pm.project_id = p.id
      order by pm.date desc limit 1
    ) latest on true
    order by latest.ph_upvotes desc nulls last, p.created_at desc
    limit ${limit}
  `;
}
```

**2. `apps/web/app/page.tsx`**
- 在 `HomePage` 里加 PH 的 fetch:
```typescript
const [ghTop, hnTop, phTop, ghCount, hnCount, phCount] = await Promise.all([
  getPlatformTop('github', 5),
  getPlatformTop('hacker_news', 5),
  getPlatformTop('product_hunt', 5),
  getPlatformProjectCount('github'),
  getPlatformProjectCount('hacker_news'),
  getPlatformProjectCount('product_hunt'),
]);
const totalLive = ghCount + hnCount + phCount;
```
- Hero 里的文案 `2 platforms` → `3 platforms`
- 在 grid 里 PH 区块替换为 `LivePlatformSection`
- "By platform" 区块的 `2 live · 3 coming soon` → `3 live · 2 coming soon`

**3. 注意：不要删除或修改已有的 GitHub / HN / Reddit / X 区块**

---

### 完成后
写 RESPONSE.md 总结所有变更。
