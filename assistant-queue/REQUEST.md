# 排队中的下一个任务

> 当前: Product Hunt collector 执行中
> 下一个: Reddit collector

---

## 任务: 添加 Reddit Collector

### 目标
采集 Reddit 上独立开发者相关 subreddit 的热门帖子，进入数据管线。

### 数据源
- **r/SideProject** — 独立开发者项目分享
- **r/indiehackers** — 独立创收讨论
- **r/startups** — 创业相关

### API: Reddit 公开 JSON

Reddit 无需 API key，可直接获取 JSON 格式:
```
https://www.reddit.com/r/SideProject/hot.json?limit=25
https://www.reddit.com/r/indiehackers/hot.json?limit=25
https://www.reddit.com/r/startups/hot.json?limit=25
```

只需设置 `User-Agent: ProductTracer/1.0` header 即可。

### 返回数据结构

```json
{
  "data": {
    "children": [
      {
        "data": {
          "id": "abc123",
          "title": "I built a thing",
          "selftext": "Description text...",
          "url": "https://reddit.com/...",
          "score": 42,
          "num_comments": 10,
          "created_utc": 1685000000,
          "subreddit": "SideProject",
          "domain": "self.SideProject",
          "permalink": "/r/SideProject/comments/abc123/..."
        }
      }
    ]
  }
}
```

### 需要修改的文件

**1. 新增 `apps/worker/src/collectors/reddit.ts`**
```typescript
export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  score: number;
  num_comments: number;
  created_utc: number;
  subreddit: string;
  permalink: string;
}

// subreddits 默认 ['SideProject', 'indiehackers', 'startups']
export function fetchSubredditHot(subreddit: string, limit?: number): Promise<RedditPost[]>;
export function isNoisePost(p: RedditPost): boolean;
export function postSlug(p: RedditPost): string;
```

**2. 新增 `apps/worker/src/scripts/collect-reddit.ts`**
- 遍历 3 个 subreddit，每轮间隔 2s 防 rate limit
- 每个帖子写入 `raw.snapshot` (score=upvotes, num_comments=comments, raw_data=完整对象)
- 新建 project 记录到 `app.project`
- 写 `app.project_metric.reddit_score`（需新增列）
- 如果 post URL 是 github.com/owner/repo → hard-match 到已有项目（参考 HN collector 的 `findGithubProjectMatch`）

**3. schema migration**
```
alter table app.project_metric add column if not exists reddit_score integer;
```

**4. `.github/workflows/collect-reddit.yml`**
- 每 4h cron，偏移 2h 从其他 collector（避免同时跑）
- 需要 `DATABASE_URL` secret
- `workflow_dispatch: true`

**5. `apps/worker/package.json`**
```json
"collect:reddit": "tsx src/scripts/collect-reddit.ts"
```

**6. `packages/types/src/index.ts`** — 确保 Platform 枚举包含 `'reddit'`
```typescript
export const Platform = z.enum(['github', 'product_hunt', 'hacker_news', 'reddit', 'x']);
// Already should have 'reddit' — verify
```

### 验证
- `pnpm collect:reddit` 跑通
- 三个 subreddit 各产出帖子
- GitHub URL 帖子被 hard-match 到已有项目
- 纯 Reddit 帖子新建 project 记录

---

完成后写 RESPONSE.md
