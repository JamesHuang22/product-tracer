# RESPONSE.md — 执行结果

## 执行摘要

Reddit 采集器代码已完成并通过 typecheck，遍历 r/SideProject、r/indiehackers、r/startups，含 GitHub URL 硬匹配。**有一个 blocker：Reddit 现在对数据中心/云 IP 的匿名 JSON 请求返回 403**（实测无论什么 User-Agent 都被 block），你需求里写的"无需 API key"已不可靠。我加了**可选的 Reddit OAuth fallback**（app-only `client_credentials`），配了 `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET` 就走 `oauth.reddit.com`，否则退回匿名 JSON。

## 变更清单

| 文件 | 说明 |
| --- | --- |
| `apps/worker/src/collectors/reddit.ts` | 新增。`fetchSubredditHot(subreddit, limit?)` / `isNoisePost(p)` / `postSlug(p)` + `DEFAULT_SUBREDDITS` + zod 解析 + 可选 OAuth token 获取。 |
| `apps/worker/src/scripts/collect-reddit.ts` | 新增。遍历 3 个 subreddit（每轮间隔 2s）→ noise filter → GitHub URL 硬匹配（复用 HN collector 的 `extractGithubRepo`）→ upsert `app.project` + `identity_link` + `raw.snapshot` + `project_metric.reddit_score`。失败写 `raw.collector_error`。 |
| `packages/db/migrations/0002_reddit_score.sql` | 新增。`alter table app.project_metric add column if not exists reddit_score integer;`（幂等）。 |
| `.github/workflows/collect-reddit.yml` | 新增。cron `0 2-23/4 * * *`（每 4h，偏移 2h 错开其他 collector）。接好可选 `REDDIT_CLIENT_ID/SECRET` secret。 |
| `package.json`（根目录） | 加 `collect:reddit` script。 |

## 遇到的问题 / 与需求的偏差

1. **⚠️ Blocker：Reddit 匿名 JSON 被 403 block。** 实测从本机（及云 IP）请求 `www.reddit.com/r/.../hot.json`，无论 `ProductTracer/1.0` 还是浏览器 UA、www/old.reddit，全部 `403 Blocked`（Reddit 反爬页面）。这是 Reddit 这一两年收紧的结果 —— 数据中心 IP 基本被封，GitHub Actions runner（Azure IP）大概率也会被 block。
   - **应对**：代码加了 OAuth fallback。**你要做的**：到 https://www.reddit.com/prefs/apps 建一个 "script" 类型 app，拿 client id + secret，在 GitHub repo 加两个 secret `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`（workflow 已接好）。配上后 collector 走 `oauth.reddit.com`，这是程序化读取的可靠路径。
   - 没配 secret 时，collector 仍按你的原始需求走匿名 JSON —— 但在 CI 大概率拿到 403 并把错误写进 `raw.collector_error`（不会 crash）。

2. **列名：用了 `reddit_score`（按你的需求新增）。** 注意 `app.project_metric` 里**已经有** `reddit_mentions` 列（schema 0001），语义不同（mentions=跨平台提及数，score=帖子 upvote）。我没动 `reddit_mentions`，新增了 `reddit_score`。需要先在 Supabase 跑 `0002_reddit_score.sql` 这个 migration，否则 collector 写入会失败。

3. **Platform 枚举已含 `'reddit'`**，types 和 DB check 约束都有，无需改动（已 verify）。

4. **collect 脚本注册在根 `package.json`**，不是 `apps/worker/package.json`（需求文档写错位置，沿用现有 github/hn/ph 约定）。

5. 小修：`RedditPost` 用 `type` 而非 `interface`（否则不满足 `sql.json()` 的 `JSONValue` index-signature，与 PH collector 同理）。

## ⚠️ 需你手动提交 workflow 文件

`.github/workflows/collect-reddit.yml` **已写好但我无法推送** —— 本机 OAuth token 没有 `workflow` scope（和上次 PH 一样）。文件在本地磁盘（untracked）。请用有 `workflow` 权限的凭证提交，或像上次 PH 那样你这边补提交：

```bash
git add .github/workflows/collect-reddit.yml
git commit -m "ci: add reddit collector workflow"
git push
```

其余文件（collector、脚本、migration、package.json、RESPONSE）已正常推送。

## 测试

- `pnpm --filter @product-tracer/worker typecheck` → ✅ 通过
- prettier 格式化新 ts/yml/json → ✅（`.sql` 不在 prettier glob 内，正常）
- 对线上 Reddit API 实跑 `fetchSubredditHot` → **403 Blocked（IP 级封锁）**，解析逻辑本身正确，被 Reddit 反爬拦截
- 端到端 DB 写入**未验证**：本地无 `DATABASE_URL`，也无 Reddit OAuth creds。配好 creds + 跑 migration 后用 `workflow_dispatch` 手动触发验证。

## 下一步建议

1. 跑 `0002_reddit_score.sql` migration（Supabase SQL Editor）。
2. 建 Reddit script app，配 `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` secret。
3. 提交 `collect-reddit.yml`（需 `workflow` scope），手动触发验证落库。
4. （可选）r/startups 噪音较多，可考虑收紧 noise filter 或只保留 SideProject + indiehackers。

---

**状态:** ✅ 已完成（代码）/ 🔴 需你配 Reddit OAuth creds + 跑 migration + 提交 workflow 才能生产跑通
