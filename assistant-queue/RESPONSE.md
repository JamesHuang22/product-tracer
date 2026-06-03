# Assistant Queue — Claude Code → Alex

> 状态: ✅ **三个任务全部完成**

---

## 任务一: HN / PH 独立项目详情页 ✅（前端 UI，已实现）

### 新增/修改文件
| 文件 | 说明 |
|---|---|
| `apps/web/lib/db.ts` | 新增 `getProjectBySlug()` + 类型 `ProjectDetail` / `ProjectPlatformSnapshot` / `ProjectMetricPoint`；`ProjectListItem` 加 `platforms: string[]`，`getAllProjects()` 用 `array_agg` 带出每个项目的平台列表 |
| `apps/web/app/projects/[slug]/page.tsx` | **新增**详情页（Server Component, force-dynamic）：项目名 + category + one_liner + 「Visit site」按钮，每平台一张跨平台数据卡片（GH stars/forks、HN points/comments、PH upvotes、Reddit upvotes/comments），含纯 SVG sparkline 趋势 + 「Updated 日期」；不存在 → `notFound()`；含 `generateMetadata` |
| `apps/web/app/projects/projects-table.tsx` | 新增 **Source 列**（GH/HN/PH/R/X 彩色 badge）；改链接逻辑：**含 github 的项目 → 外部 primary_url 新标签页（保持原行为）；其余（HN/PH/Reddit）→ 内部 `/projects/[slug]` 详情页**；桌面表格 + 移动卡片都已处理 |
| `apps/web/app/projects/page.tsx` | 副标题改为说明跨平台来源 + 提示点开非 GitHub 项目看详情 |

### 设计/实现说明
- 详情页风格沿用现有中性色 + 圆角 + 卡片栅格，**一屏内**展示全部平台信号。
- **趋势图零依赖**：自写 SVG sparkline（从 `app.project_metric` 日序列取对应平台的指标列），历史不足 2 点时显示「Not enough history yet」，不留空。
- 单平台项目（如只有 PH）也能正常渲染，只显示那一张卡。
- 详情页保持英文，与现有 `/projects` 页一致（i18n 上一轮只覆盖首页 + header，未扩展到 projects 区，本次维持一致；如需双语可后续接 `useI18n`）。

### ⚠️ 一处与给定接口的偏差（schema 准确性）
原 `ProjectDetail.metrics` 接口列了 `github_forks`，但 **`app.project_metric` 表里并没有 forks 列**（0001 schema 只有 github_stars / ph_upvotes / hn_score / reddit_score 等，0002 加了 reddit_score）。所以：
- `metrics`（日趋势）只含真实存在的列：`github_stars / ph_upvotes / hn_score / reddit_score`。
- **forks / comments 改从「每平台最新 snapshot」取**（`ProjectPlatformSnapshot.forks / comments`，来自 `raw.snapshot`），卡片照常显示。功能不缺失，只是数据源更准确。

### 验证
- `pnpm --filter @product-tracer/web typecheck` ✅
- `next build`：**编译 + 类型检查通过**（`✓ Compiled successfully`，typedRoutes 对新动态路由 `/projects/[slug]` 校验通过）。最后收集数据步骤因本地无 `DATABASE_URL` 报错 —— 环境问题、改动前即如此（页面 force-dynamic 直连库），线上配 secret 即可。

---

## 任务二: AI/LLM 自动分类 Research ✅（仅文档）

📄 **`research/llm-classification.md`** — 含全部要求内容：
1. **候选 LLM 对比**：Claude Haiku 4.5 / 旧 Haiku / GPT-4o mini / DeepSeek / 本地 Ollama 的成本·延迟·准确度·JSON 支持表（标注价格需核对）。
2. **批处理策略**：prompt-level batching（一请求 20–30 项 + prompt caching）+ provider Batch API 5 折；输入裁剪到 ~200 tokens/项目。
3. **分类 Schema**：category/subcategory/quality_score/tags/requires_review/reasoning，附 Anthropic tool-use 与 OpenAI json_schema 落地方式。
4. **与现有 pipeline 整合**：规则评分做 pre-filter，**只有灰色地带（score 30–70）送 LLM**；高分直接 keep、低分直接 noise；建议 migration 0004 加 `llm_*` 列 + status 增加 `'review'`；input-hash 幂等。
5. **成本估算**：1564 项目 × 30% 灰色地带，**月成本个位数美元**（叠加增量幂等更低）。
6. **实现架构建议**：`llm-classifier.ts` + 可切换 provider 抽象 + 投票机制 + fallback（LLM 挂掉回退纯规则，绝不误删）。

**未写任何代码**，纯研究文档（含示意性架构片段）。

---

## 任务三: X/Twitter 数据采集方案 Research ✅（仅文档）

📄 **`research/x-twitter-collector.md`** — 含全部要求内容：
1. **方案 A–D 对比**：开源库 / Nitter（现状基本已死）/ 浏览器 cookie 抓取 / Syndication API（`cdn.syndication.twimg.com/tweet-result?id=`，无需认证但只能按 ID 取单条）。给了能否发现新推文·是否需登录态·封号风险·维护成本的对比表。
2. **推荐架构（纸上）**：**方案 C（浏览器 cookie 抓 curated founder 名单 timeline 做发现）+ 方案 D（Syndication 补全指标）混合**；`founder-list.json` 输入；写 `raw.snapshot(platform='x')` + 建议 migration 0005 加 `x_posts/x_likes/x_retweets/x_replies` 列（注：snapshot/identity_link 的 platform check 在 0001 已含 `'x'`，无需改约束）。
3. **额外研究点**：founder 名单来源（GitHub profile 的 twitter_username、PH/HN 自带 X 链接最零风险）、频率限制、IP 轮换（**别用 GH Actions 数据中心 IP**，用住宅常驻机器）、与 identity_link 硬/软匹配集成。
4. **道德与安全**：只抓公开数据、低频+抖动、cookie 等同密码需加密存储不进 git、可降级。
5. **专门回应你补充的 `@chen_og0023` 账号**（§0 新增章节）：解释了为什么现有 Bearer（OAuth2 app-only）和 OAuth 1.0a user-context token 在 **Free 套餐**下都读不到公开推文（search/timeline 需 Basic $100/月）；结论是这个账号的真正价值是**当 method C 的浏览器登录会话**用（导出 cookie 抓公开 timeline），而非当 API 读取凭证；§4 给了「用真实号 vs 另开小号」的封号权衡。

**未写任何代码**，纯研究文档。

---

## 总结
- 任务一已落地并通过 typecheck/编译；唯一与原接口的偏差是 `github_forks` 不在 metric 表（已改用 snapshot 取数，见上）。
- 任务二、三为研究文档，分别落在 `research/llm-classification.md` 与 `research/x-twitter-collector.md`。
- 两份文档都标注了「建议的 migration 编号（0004 / 0005，未实现）」，沿用本仓库手动 apply migration 的习惯，待你决定是否落地。
- 全程自主完成，未提任何 yes/no 问题。
