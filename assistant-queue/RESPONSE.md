# RESPONSE.md — 执行结果

## 执行摘要

Product Hunt 采集器代码已完成并通过 typecheck，与 GitHub / HN 采集器并列。**有一个 blocker：PH v2 GraphQL API 需要 OAuth token，不是公开访问**（你需求里写错了）。代码已优雅处理，但你需要配 `PRODUCT_HUNT_TOKEN` secret 才能在生产跑通。

## 变更清单

| 文件 | 说明 |
| --- | --- |
| `apps/worker/src/collectors/producthunt.ts` | 新增。`fetchFeaturedProducts(count?)` / `isNoiseProduct(p)` / `productSlug(p)` + zod 解析层。 |
| `apps/worker/src/scripts/collect-producthunt.ts` | 新增。完整流程：`loadRepoEnv` → fetch → noise filter → upsert `app.project` + `app.identity_link` + `raw.snapshot` + `app.project_metric.ph_upvotes` → try/catch（失败写 `raw.collector_error`）→ `sql.end()`。 |
| `.github/workflows/collect-producthunt.yml` | 新增。cron `0 1-23/4 * * *`（每 4h，错开 GH :00 / HN :30）。 |
| `package.json`（根目录） | 加 `collect:producthunt` script。 |

## 遇到的问题 / 与需求的偏差

1. **`ph_upvotes` 列已存在，无需 migration。** `packages/db/migrations/0001_init.sql:80` 的 `app.project_metric` 已有 `ph_upvotes integer`（和 `ph_rank`）。所以**没建 `002_ph_upvotes.sql`**（会是 no-op）。另外 migration 目录是 `packages/db/migrations/`，不是你写的 `packages/db/src/supabase/migrations/`。

2. **platform 枚举是 `product_hunt`（带下划线）**，schema check 约束只接受这个，不是 `producthunt`。已按此写。

3. **⚠️ Blocker：PH v2 GraphQL 需要 OAuth token。** 实测无 token 返回 `401 invalid_oauth_token`。代码已处理：设了 `PRODUCT_HUNT_TOKEN` 就带 `Authorization: Bearer`，否则抛清晰错误。**你要做的**：到 https://www.producthunt.com/v2/oauth/applications 建 app 拿 developer token → 在 GitHub repo 加 secret `PRODUCT_HUNT_TOKEN`（workflow 里已接好，可选注入）。

4. **collect 脚本注册在根 `package.json`**，不是 `apps/worker/package.json`（需求文档写错位置）。已按现有 github/hn 约定放根目录。

5. 小修：`PHProduct` 从 `interface` 改成 `type`，否则不满足 db 层 `sql.json()` 的 `JSONValue` index-signature 约束（与 github/hn collector 用 zod-inferred type 同理）。

## 测试

- `pnpm --filter @product-tracer/worker typecheck` → ✅ 通过
- prettier 格式化新文件 → ✅
- 对线上 PH API 实跑 `fetchFeaturedProducts` → 请求/解析逻辑正确，唯一失败点是 401 认证（无 token）
- 端到端 DB 写入**未验证**：本地无 `DATABASE_URL` 也无 `PRODUCT_HUNT_TOKEN`。配好 token 后用 `workflow_dispatch` 手动触发一次即可验证落库。

## ⚠️ 需你手动提交 workflow 文件

`.github/workflows/collect-producthunt.yml` **已写好但未推送** —— 当前这台机器的 OAuth token 没有 `workflow` scope，GitHub 拒绝推送任何 `.github/workflows/` 改动（`refusing to allow an OAuth App ... without workflow scope`）。文件已在本地磁盘（untracked），你需要用有 `workflow` 权限的凭证提交它，二选一：

```bash
# 方式 A：本地有 workflow scope 的话
git add .github/workflows/collect-producthunt.yml
git commit -m "ci: add product hunt collector workflow"
git push

# 方式 B：刷新 gh token 拿 workflow scope
gh auth refresh -h github.com -s workflow
```

其余文件（采集器、脚本、package.json、RESPONSE）已正常推送。

## 下一步建议

1. 提交上面的 workflow 文件（需要 `workflow` scope）。
2. 配 `PRODUCT_HUNT_TOKEN` secret，手动触发 workflow 验证落库。
2. （可选）PH 数据已有 `ph_rank` 列但当前没采集 rank —— 如需要可在 query 里加 `featuredAt` 或用 edge 顺序回填 `ph_rank`。
3. （可选）在 web 端加 Product Hunt section（目前是 placeholder）。

---

**状态:** ✅ 已完成（代码）/ 🔴 需你配 PH token 才能生产跑通
