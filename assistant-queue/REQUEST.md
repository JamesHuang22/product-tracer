# Assistant Queue — Alex → Claude Code

> 当前状态: 🟡 **任务排队中**

---

## 任务: 添加 Product Hunt Collector

### 目标
实现 Product Hunt 数据采集器，与 GitHub、HN 采集器并列，跑在 GH Actions cron 上。

### 技术细节

**API**: Product Hunt v2 API (GraphQL)
- 免费，无需 API key（只需 `User-Agent` header 或公开访问）
- 端点: `POST https://api.producthunt.com/v2/api/graphql`
- 查询最新 20 个产品，按 `featuredAt` 排序

**Schema**: 参考已有 collector 的模式
- `Platform` 枚举需包含 `'product_hunt'` → 已在 `packages/types/src/index.ts`
- `raw.snapshot` 写 `upvotes`, `comments`, `raw_data`
- `app.project_metric` 写 `ph_upvotes` 字段（注意：当前表只有 `github_stars` 和 `hn_score`，需新增 `ph_upvotes` 列）

**文件清单:**

1. **`apps/worker/src/collectors/producthunt.ts`**
   - `fetchFeaturedProducts(count: number): Promise<PHProduct[]>`
   - `isNoiseProduct(p: PHProduct): boolean`
   - `productSlug(p: PHProduct): string`
   - `type PHProduct = { id: number; name: string; tagline: string; url: string; votesCount: number; commentsCount: number; createdAt: string; topics: string[]; website: string; }`

2. **`apps/worker/src/scripts/collect-producthunt.ts`**
   - 参考 `collect-github.ts` 和 `collect-hackernews.ts` 的完整流程
   - 包含 `loadRepoEnv`, 主函数, try/catch handler

3. **`.github/workflows/collect-producthunt.yml`**
   - 每 4h cron，偏移 1h 从 GH 和 HN 的 cron（避免竞争）
   - 需要 `DATABASE_URL` secret

4. **schema migration**（可选）
   - 如果你还没在本地跑 migration，可以直接在 `packages/db/src/supabase/migrations/001_initial.sql` 加 `ph_upvotes` 列（ALTER TABLE 语句）。如果已经跑过 migration，可以新建 `002_ph_upvotes.sql`

### 代码参考
- `apps/worker/src/collectors/github.ts` — API 调用模式
- `apps/worker/src/collectors/hackernews.ts` — slug 生成、清理
- `apps/worker/src/scripts/collect-github.ts` — 完整脚本流程

### 验证
- 脚本应能独立运行: `pnpm collect:producthunt`
- 产出: 新项目写入 `app.project` + `raw.snapshot` + `app.project_metric.ph_upvotes`
- 如果 URL 匹配已有 GitHub 项目 → hard-match（参考 HN collector 的 `findGithubProjectMatch`）

---

### 完成后
写完 RESPONSE.md 总结做了什么、有什么问题。如果遇到 API 限制或 schema 问题，在 RESPONSE.md 里说明。
