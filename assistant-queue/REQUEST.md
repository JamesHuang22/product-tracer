# Assistant Queue — Alex → Claude Code

> 当前状态: 🟡 **任务排队中**

---

## 任务: 添加 Product Hunt Collector

### 目标
实现 Product Hunt 数据采集器，与 GitHub、HN 采集器并列，跑在 GH Actions cron 上。

### API: Product Hunt v2 (GraphQL)
- 端点: `POST https://api.producthunt.com/v2/api/graphql`
- 公开访问，无需 API key（只需要 User-Agent header）
- 查询最新 20 个产品，按 `featuredAt` 排序

查询示例:
```graphql
{
  posts(first: 20, order: RANKING) {
    edges {
      node {
        id
        name
        tagline
        url
        votesCount
        commentsCount
        createdAt
        website
        topics {
          edges {
            node {
              name
            }
          }
        }
      }
    }
  }
}
```

### 需要修改的文件

**1. 新增 `apps/worker/src/collectors/producthunt.ts`**
```typescript
export interface PHProduct {
  id: number;
  name: string;
  tagline: string;
  url: string;
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  topics: string[];
  website: string;
}

export function fetchFeaturedProducts(count?: number): Promise<PHProduct[]>;
export function isNoiseProduct(p: PHProduct): boolean;
export function productSlug(p: PHProduct): string;
```

**2. 新增 `apps/worker/src/scripts/collect-producthunt.ts`**
- 参考 `collect-github.ts` 和 `collect-hackernews.ts` 的完整流程
- `loadRepoEnv` → 主函数 → try/catch → sql.end()
- 新建 PH-only project 记录（不尝试 match，PH 没有 GitHub URL 字段）
- 写 `raw.snapshot` (upvotes, comments, raw_data)
- 写 `app.project_metric` 需新增 `ph_upvotes` 列

**3. schema migration**
- `packages/db/src/supabase/migrations/001_initial.sql` 里加 `ph_upvotes integer` 列
- 如果迁移已跑，建 `002_ph_upvotes.sql`

```sql
alter table app.project_metric add column if not exists ph_upvotes integer;
```

**4. `.github/workflows/collect-producthunt.yml`**
```yaml
name: Collect Product Hunt
on:
  schedule:
    - cron: '0 */4 * * *'   # every 4h, offset 1h from GH (:00) and HN (:30)
  workflow_dispatch: {}
jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm collect:producthunt
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**5. `apps/worker/package.json`** — 加 script entry:
```json
"collect:producthunt": "tsx src/scripts/collect-producthunt.ts"
```

### 验证
- `pnpm collect:producthunt` 跑通
- 数据写入 `raw.snapshot` + `app.project` + `app.project_metric.ph_upvotes`
- 不硬匹配已有项目（PH 没有 GitHub URL），纯新增

---

### 完成后
写 RESPONSE.md 总结：改了什么文件、跑了哪些测试、有没有遇到问题。
