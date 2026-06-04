# Assistant Queue — Claude Code → Alex

> 状态: ✅ **X/Twitter Collector 已实现**

---

## 选用的库：`agent-twitter-client`

按要求用**开源库**而非自建 scraping。选 `agent-twitter-client`（elizaOS 维护，npm 上最流行的 TS X 客户端）：
- ✅ TypeScript 原生、带完整 `.d.ts`
- ✅ 无需官方 API key（用登录态 cookie / 账号密码）
- ✅ 能抓公开用户 timeline（`scraper.getTweets(handle, n)`）
- ✅ 纯 Node.js，可在 CI 跑
- 成本 0（除 GH Actions 运行时间）

> 注：该包当前版本 `0.0.18` 被标记 deprecated，但仍是该领域最成熟、可用的选择；接口稳定（`Scraper.login/setCookies/getTweets`）。后续如要换库，collector 已把库调用收敛在 `collectors/x.ts`，替换面很小。

---

## 改动清单

| 文件 | 说明 |
|---|---|
| `apps/worker/package.json` + `pnpm-lock.yaml` | 加依赖 `agent-twitter-client@^0.0.18`（lockfile 已更新，`--frozen-lockfile` 已验证通过） |
| `apps/worker/src/collectors/x.ts` | **新增** collector：`XPost` 类型、auth（`createAuthenticatedScraper`，cookie 优先）、`fetchUserTweets`、`normalizeTweet`、`isProductTweet`、`handleFromUrl`、`xPostSlug` 等 |
| `apps/worker/src/scripts/collect-x.ts` | **新增** batch 脚本：构建 founder 列表 → 逐人抓推 → 过滤 → match/创建 project → 写库 |
| `apps/worker/config/founders.json` | **新增** 初始 curated founder 种子列表（8 个知名 indie maker） |
| `packages/db/migrations/0004_x_metrics.sql` | **新增** migration：给 `app.project_metric` 加 `x_likes / x_retweets / x_replies` 列 |
| `.github/workflows/collect-x.yml` | **新增** workflow：每 6h（`15 */6 * * *`）+ workflow_dispatch，注入 X 认证 secrets |

---

## 实现细节（对照需求）

**1. 库选择** ✅ `agent-twitter-client`（理由见上）。

**2. `collectors/x.ts`** ✅ 遵循 github.ts / hackernews.ts / reddit.ts 的模式：
- `XPost` 是 `type`（不是 interface）——这样能传给 `sql.json()`（与 `RedditPost` 同理，db 层 `JSONValue` 需要 index signature）。
- 认证全部走 env / GitHub secrets，**永不入库/入仓**：`X_COOKIES`（JSON 字符串数组，最稳）优先；否则 `X_USERNAME`/`X_PASSWORD`（+ 可选 `X_EMAIL`/`X_2FA_SECRET` 及 `@chen_og0023` 的 OAuth 1.0a `X_API_KEY/SECRET`、`X_ACCESS_TOKEN/SECRET` 透传给 `login()`）。
- `isProductTweet`：保留含**外链**或含 launch/traction 关键词（launched/shipped/built/introducing/show hn/product hunt…）的推文，过滤闲聊。
- 只取原创推文（跳过 retweet / reply）。

**3. `scripts/collect-x.ts`** ✅ 与 collect-reddit.ts 结构一致：
- Founder 列表 = `config/founders.json` ∪ **从数据库提取**（`app.project.primary_url` 里含 twitter.com / x.com 的 profile 链接 → 抽 handle），去重。
- 逐人**串行 + 3s 间隔**（速率控制）。
- 匹配逻辑：推文外链 → 先按 GitHub repo 硬匹配现有 project，再按 host 匹配现有 `primary_url`；都没有且推文带外链 → 创建新 X-only project（无外链的纯文字推文不建 project，避免噪音）。
- 写 `app.identity_link`(platform='x', external_id=tweet id)、`raw.snapshot`(platform='x', upvotes=likes, comments=replies, raw_data=完整 post)、`app.project_metric`(x_likes/x_retweets/x_replies, 每 project 每天 latest wins)。

**4. workflow** ✅ `collect-x.yml`，结构同其它 collector，cron 错峰（每 6h，低频对 X 友好）。

**5. package.json** ✅ 依赖已加。

**6. 初始 founder list** ✅ `config/founders.json` 种子 + DB 提取双来源。

---

## 错误处理 & 健壮性（对照「注意事项」）
- **单个 user 失败不中断整体**：每个 founder 一个 try/catch，失败记 `raw.collector_error`(`fetch_user_failed`) 后继续下一个；单条 tweet 失败同理（`store_post_failed`）。
- **无认证不硬失败**：未配置 `X_COOKIES`/`X_USERNAME` 时脚本打印提示并 `return`（exit 0）——workflow 不会因缺 secret 变红，本地 typecheck/干跑也安全。
- **auth 失败**记 `auth_failed` 并 exit 1。
- 速率：串行 + 3s 间隔，每人最多 20 条。

---

## 验证
- `pnpm --filter @product-tracer/worker typecheck` ✅
- `pnpm install --frozen-lockfile` ✅（CI 用的就是这条，lockfile 一致）
- **纯函数 smoke test**（无网络/无账号）：`normalizeTweet`（过滤 twitter 自身链接、跳过 retweet/reply）、`isProductTweet`（外链/关键词命中、闲聊过滤）、`handleFromUrl`（profile→handle、reserved 路径→null）、`isAuthConfigured`（无 env→false）全部 `PASS ✓`。
- **不配真实 X 账号也能 typecheck/构建**（auth 缺失走 graceful skip）——符合验证要求。

## ⚠️ 需要你手动处理
1. **在 Supabase 执行 `0004_x_metrics.sql`**（加 x_* 列），否则 collector 写 `project_metric` 会失败（沿用本仓库手动 apply migration 的约定）。
2. **配置 GitHub secrets** 才能真正采集：推荐 `X_COOKIES`（从 `@chen_og0023` 登录后导出 `auth_token`/`ct0` 等 cookie，存成 JSON 字符串数组）；或 `X_USERNAME`/`X_PASSWORD`。
3. （可选）按需扩充 `config/founders.json`。

**自主完成，未提任何问题。**
