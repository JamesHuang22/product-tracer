# Research — X / Twitter 数据采集方案

> 状态：**research only — 不实现代码**。本文分析在**不使用官方付费 API** 的前提下，采集 X(Twitter) 公开数据的可行方案、推荐架构、研究点与道德/安全考量。
>
> 背景：X API v2 的 Bearer Token 一直 401；有搜索能力的套餐需 $100/月（Basic）起，对本项目不划算。核心思路是：**围绕一份人工精选的 founder 名单，只抓他们的公开推文**（不做全网搜索），把「提及自己项目」的推文转成 signal。
>
> **已有资产**：X 账号 `@chen_og0023`（alexchenog23@gmail.com 注册），手里有一套 OAuth 1.0a 凭证（consumer key/secret + access token/secret）。下方 §0 专门分析这套凭证/账号到底能干什么。

---

## 0. 已有账号 `@chen_og0023` 与现有 token 能做什么？

这是本次研究的关键约束，先讲清楚，再谈方案。

### 为什么 Bearer Token 一直 401 / 用不了
- 手里的「Bearer token」是 **OAuth 2.0 app-only**（应用级）令牌。X API v2 在 **Free 套餐**下，app-only 几乎**读不到任何内容**：search / user timeline / tweet lookup 这些读接口都要 **Basic（$100/月）及以上**。
- 所以 401/403 不是配置错，而是**套餐权限本身不开放**——再怎么调 Bearer token 也拿不到公开推文的读权限。

### OAuth 1.0a 用户凭证（consumer + access token/secret）能做什么
- 这套是 **user-context（用户级）** 凭证，代表 `@chen_og0023` 本人。
- **Free 套餐**下 user-context 主要开放**写**（每月约 1,500 条发推额度）+ `users/me` 等极少数自读接口；**通用的「读别人 timeline / 搜索」依旧需要 Basic+**。
- 结论：**单靠这套 API token，在 Free 套餐下仍然读不到 founder 们的公开推文**。它的价值不在「官方 API 读取」。

### 那这个账号的真正价值在哪
1. **作为 method C（浏览器 cookie 抓取）的登录态来源** —— 这是最实际的用法。用 `@chen_og0023` 在浏览器/Playwright 里登录，导出 `auth_token` + `ct0` cookie，复用它去读公开 timeline。一个**真实、有历史的账号**比临时小号更不容易被风控（见 §1-C、§4）。
2. **method D（Syndication）根本不需要账号** —— 按 tweet ID 取单条，零认证，与这个账号无关，可独立用。
3. **OAuth 1.0a 写权限**（可选，超出本采集目标）——未来若要「自动发布/转发本站发现的项目」可用，但与「采集」无关。

> 一句话：**`@chen_og0023` 当「登录的浏览器会话」用（method C），而不是当「API 读取凭证」用。** 现有的 Bearer/OAuth token 在 Free 套餐下都打不开公开推文的读取门，付费才行——所以绕开 API、走 cookie + Syndication 才是性价比之选。

---

## 1. 可行方案对比（不实现，只分析）

### 方案 A：开源 scraper 库（模拟客户端，不走官方 API）
代表项目（生态变动快，名字仅供检索）：`twscrape`、`twikit`（Python）、`agent-twitter-client`（Node/TS）等；`snscrape` 这类老牌工具自 2023 guest-token 收紧后大多失效。
- **原理**：复用 X 内部 GraphQL/旧 API 端点，需要登录态（cookies / auth_token + ct0）或 guest token。
- **优点**：能拿到用户 timeline、单条推文指标（likes/retweets/replies），TS 生态有 `agent-twitter-client` 可直接进 worker。
- **缺点 / 风险**：
  - 端点随 X 改版频繁失效，**维护成本高**。
  - 需要账号登录态 → 账号有被限流/封禁风险。
  - 数据中心 IP（CI runner）极易触发风控。
- **结论**：技术上最接近「能用」，但本质等同方案 C（都要登录态），库只是封装。

### 方案 B：Nitter 实例
- **原理**：Nitter 是 Twitter 的开源前端，曾提供无需认证的 RSS/JSON。
- **现状**：自 2023/2024 X 关闭 guest account 后，**绝大多数公开 Nitter 实例已死**；自建实例需要可用的认证 token，且仍受 X 风控，寿命短。
- **优点**：若能跑起来，接口干净、有 RSS（天然适合定时拉取）。
- **缺点**：可用性差、维护成本高、随时可能整体失效。
- **结论**：**不推荐作为主路径**；可作为「锦上添花」的备选源（若恰好有稳定实例）。

### 方案 C：浏览器级抓取（Playwright/Puppeteer + 复用 cookie）
- **原理**：用一个（建议**专用/小号**）账号在 Playwright 里登录一次，导出 `auth_token` + `ct0` cookie，之后复用 cookie 直接请求用户主页 timeline 或拦截其 XHR(GraphQL) 响应。
- **优点**：
  - 最贴近真实浏览器，**风控容忍度相对最高**。
  - 能稳定拿到指定用户的最新推文及互动数。
  - **只读 timeline、不搜索**，行为模式温和。
- **缺点 / 风险**：
  - 违反 X ToS（自动化访问）；账号可能被限/封。
  - 需要安全存储登录态（见 §4）。
  - 比纯 HTTP 重（要起浏览器），但每天跑一次、~50 用户可接受。
- **结论**：**在「监控 curated 名单」这一目标下最可行**，是推荐主路径。

### 方案 D：Syndication API（X 仍保留的非官方 embed JSON）
- **端点**：`https://cdn.syndication.twimg.com/tweet-result?id=<TWEET_ID>&lang=en`（embed 小组件在用，**无需认证**）。
- **优点**：零认证、稳定、合规风险低（是公开 embed 基础设施）。
- **致命限制**：**只能按 tweet ID 取单条**，**不能搜索、不能列 timeline**。要先有 tweet ID 才能查。
- **可行用法**：若已经通过别的途径拿到「founder 发的某条推文 ID」，用它来**补全/刷新**该推文的最新指标，非常合适。
- **结论**：**不能独立发现新推文**，但适合作为 enrichment 层（给已知 ID 补数据），与方案 C 互补。

### 对比小结
| 方案 | 能否发现新推文 | 需登录态 | 合规/封号风险 | 维护成本 | 角色 |
|---|---|---|---|---|---|
| A 开源库 | ✅ | ✅ | 高 | 高 | C 的封装，可选 |
| B Nitter | ✅（若实例活着） | 自建需 token | 高 | 高 | 不推荐 |
| **C 浏览器 cookie** | ✅ | ✅ | 中–高 | 中 | **推荐主路径** |
| **D Syndication** | ❌（需先有 ID） | ❌ | 低 | 低 | **enrichment 补充** |

---

## 2. 推荐架构（纸上方案，不实现）

**主路径 C（发现）+ D（补全）混合**，围绕 curated founder 名单：

```
founder-list.json (人工维护, ~50 人)
        │
        ▼
apps/worker/src/collectors/x.ts
  for each handle in list:
    方法1（主）: Playwright + 复用 cookie → 拉该用户最近 N 条 timeline
    方法2（备）: 若有稳定 Nitter 实例 → 拉 RSS
        │
        ▼
  过滤：只保留「提及自己项目」的推文
    - 推文含已知项目的外部 URL（匹配 app.project.primary_url 域名）
    - 或含项目名关键词
        │
        ▼
  对命中的推文（已有 tweet ID）→ 方案 D Syndication 补全/校准 likes/retweets/replies
        │
        ▼
  写入 raw.snapshot (platform='x') + app.project_metric (新增 x_* 列)
  建立/更新 app.identity_link (platform='x', external_id=tweet_id 或 user_id)
```

### 输入：curated founder list
`apps/worker/config/founder-list.json`（建议）：
```json
[
  { "handle": "levelsio", "user_id": "...", "note": "PH/indie maker" },
  { "handle": "...", "user_id": "..." }
]
```
- `user_id`（数字 id）比 handle 稳定（handle 可改），建议两者都存。

### 输出：schema 变更建议（沿用手动 migration 习惯）
```sql
-- migration 0005（建议，未实现）
alter table app.project_metric
  add column if not exists x_posts     integer,
  add column if not exists x_likes     integer,
  add column if not exists x_retweets  integer,
  add column if not exists x_replies   integer;
-- raw.snapshot 已支持 platform='x'（0001 的 check 含 'x'），
-- upvotes 复用为 likes、comments 复用为 replies，raw_data 存完整推文 JSON。
-- identity_link.platform 也已含 'x'。
```
> 注意：`raw.snapshot` 和 `app.identity_link` 的 platform check **在 0001 里已包含 `'x'`**，无需改约束，只需补 project_metric 的 x_* 列。

---

## 3. 额外研究点

### 如何获取 curated founder list
- **Product Hunt 活跃 maker**：从已采集的 PH 数据里取 maker 的 X handle（PH profile 常挂 Twitter）。
- **HN Show HN 作者**：Show HN 帖子作者常在正文/评论留 X 链接。
- **GitHub trending 作者**：GitHub profile 的 `twitter_username` 字段（GitHub API 直接可取）→ 高质量来源，零额外抓取风险。
- **手工种子**：先人工放 ~30–50 个知名 indie founder，跑通后再半自动扩充。
- 建议**人工 review** 后入名单，避免噪音账号。

### 频率限制
- 每个用户**每天 1–2 次**足够（founder 发推频率不高）。
- 50 用户 × 1 次/天 = 50 次请求/天，配合随机抖动（每次间隔 30–90s），行为温和。
- 浏览器方案：每次会话复用同一 cookie，串行访问，避免并发。

### IP 轮换策略
- **不要用 GitHub Actions runner IP**（数据中心段，X 风控重灾区，易被 challenge/封）。
- 选项：
  - 跑在**住宅网络的常驻机器**（树莓派 / 家里的小服务器 / 开发者机器 cron）。
  - 或经**住宅代理池**（成本与合规需评估）。
  - 单账号 + 单 IP 保持稳定，比频繁换 IP 更不容易触发风控（频繁换 IP 反而像爬虫）。

### 与现有 identity_link 系统的集成
- 建立 X 账号 ↔ 已知项目 的关联：
  - **硬匹配**：推文里的外部 URL 命中某 `app.project.primary_url` 的域名 → `identity_link(platform='x', external_id=user_id, source='hard')`。
  - **软匹配**：推文文本含项目名 → `source='soft'`，给较低 confidence。
  - 复用现有 collector 的 `extractGithubRepo` 思路（见 reddit/hackernews collector）：从推文 URL 提取 github owner/repo 做跨平台硬匹配。
- 一个 founder 可能关联多个项目 → 一条推文按其链接/关键词归到对应 project。

---

## 4. 道德与安全考量

- **仅抓公开数据**：只读公开账号的公开推文，不碰私信、私密账号、受保护推文。
- **速率与负载**：低频 + 随机抖动 + 串行，绝不并发轰炸；对 X 服务器影响可忽略。尊重 `robots`/限流信号，遇到 429/challenge 立即退避。
- **ToS 风险透明**：方案 A/C 自动化访问违反 X ToS，账号有被限/封风险，明确这是产品风险点。
  - **关于用 `@chen_og0023`**：用这个已有账号做 method C 的登录态，好处是「真实、有历史的账号」风控容忍度更高；代价是**一旦被封就损失这个账号**。权衡建议：若这个账号对本人无所谓（专为项目注册的品牌号）→ 直接用；若有价值 → 另注册一个低成本小号专门跑采集，把 `@chen_og0023` 留作备用。无论用哪个，都**只读公开 timeline、低频、带抖动**以降低被封概率。
- **登录态安全存储**：
  - cookie（`auth_token`/`ct0`）= 账号凭证，**等同密码**。
  - 存为 secret（GitHub Actions secret / 本地 `.env`，**绝不进 git**）。
  - 加密静态存储，最小权限访问；定期轮换；泄露即作废重登。
- **数据最小化与留存**：只存做 signal 所需字段（指标 + 推文 URL + 文本摘要），不囤积无关个人数据。
- **可关闭/可降级**：X collector 应是可选模块，失败/被封时整条 pipeline 不受影响（参考现有 collector 的 try/catch + `raw.collector_error` 记录）。

---

## 5. 小结与建议
- **现有 token 救不了**：Free 套餐下 Bearer（app-only）和 OAuth 1.0a（user-context）都读不到公开推文（search/timeline 需 Basic $100/月）。详见 §0。
- **官方 API 暂不值得**（$100/月）。短期用 **方案 C（浏览器 cookie 抓 curated 名单的 timeline）做发现 + 方案 D（Syndication）补全指标**的混合方案；`@chen_og0023` 当作 **method C 的登录会话**来用（不是当 API 读取凭证）。
- **不要在 GitHub Actions 上跑**（数据中心 IP 风险）；放住宅网络常驻机器、低频运行；账号选择见 §4 的权衡。
- 名单来源优先**零风险渠道**（GitHub profile 的 twitter_username、PH/HN 自带的 X 链接）。
- 集成上完全复用现有 `identity_link` 硬/软匹配机制，X 只是又一个 platform。
- 落地顺序建议：① 定 founder-list.json schema + 人工种子 50 人；② migration 0005 加 x_* 列；③ 先用方案 D 对已知推文 ID 做 enrichment 跑通写库链路（零风险）；④ 再上方案 C 的 timeline 发现（评估账号/IP 后）。
