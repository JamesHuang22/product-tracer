# Product Tracer — PRD

> 跨平台独立产品发布/增长信号追踪器
> 状态: Draft
> 版本: v0.3 (2026-05-17)
> 历史: v0.1 → v0.2 → v0.3

---

## 0. 版本变化

**v0.2 → v0.3 主要改动**：
- **§1.2 Web + Email 双轨**: 前端从 Phase 2 提到 v0.1 co-equal surface（参考 levels.fyi 的质量水准）
- **§8 技术架构重写**: 给每个选择附明确理由（v0.2 的"和现有技术栈一致"不算理由）
- **§8.2 Storage 改 Postgres (Supabase)**: 放弃 SQLite → 后期迁移的路径，因为 v0.1 就需要 pgvector (T2 identity match) + 不想做无意义的迁移
- **§8.3 前端 stack 新增**: Next.js 15 + Tailwind + shadcn/ui + Tremor + TanStack Table
- **§10 里程碑调整**: web 和 email 一起出 v0.1，~6-7 个月到 paid beta（v0.2 估的 4-5 个月只覆盖了 email-only）
- **§9 数据模型**: 加 `ProjectMetric`（时间序列图用）、SEO 字段

**v0.1 → v0.2 主要改动**: 见 git 历史 / v0.2 文档。

---

## 1. Problem & Target User

### 1.1 Problem

Solo dev 每天能看到的信息已经过载（GitHub trending、Product Hunt、X、HN、Reddit 各自的 feed），但**没有跨平台的"信号"**：

- 一个项目在 GH 涨了 500 stars，是否同时也在 PH 排前 5？是否 founder 在 X 上发了增长数据？目前需要人工拼接。
- 现有产品（Product Hunt / Indie Hackers / Firsto / OpenHunts / BetaList）都是 **launch / community 平台**，不是 cross-platform **tracker**。
- 现有的 tracker 都是单平台 + 没有 deep-link 到具体项目（GitHub trending、PH today），不能拿来"做研究"。

### 1.2 Target User — v0.1 single persona

**Persona: "学习型 Indie Builder"**
- 自己在做 side project，每天/每周想看"市场上有什么值得学的新东西"
- 不要求 real-time，能容忍 24h 延迟
- 既要**被动消费**（每天打开邮件读 5 分钟），也要**主动 dig**（想深入研究某类项目时打开 web 翻历史）

这个 dual 行为模式直接决定 v0.1 的两个 surface：

| Surface | 行为 | 类比 |
|---------|------|------|
| **Daily Email** | 被动 / habit / 5 分钟读完 | Stratechery 早邮件 |
| **Web** | 主动 / research / 数据深挖 | levels.fyi |

未来扩展到 *Competitor Tracker* 和 *Trend Researcher* 两类 persona，v0.1 只服务前者。

---

## 2. Success Metrics (v0.1)

### 2.1 Email
| 指标 | 目标 | 时间窗 |
|------|------|--------|
| Dogfood | 我自己连续 4 周每天打开 digest | 上线后 4 周 |
| 订阅数 | ≥ 30 active（≥3 次打开） | 上线后 8 周 |
| Open rate | > 40% | 持续 |

### 2.2 Web
| 指标 | 目标 | 时间窗 |
|------|------|--------|
| 每月独立访问 | ≥ 500 | 上线后 8 周 |
| Email → Web 点击率 | > 25% | 持续 |
| Web → Email 订阅转化 | > 5% of 独立访问 | 持续 |
| 索引页数 | ≥ 200 项目页 SEO 收录 | 上线后 12 周 |

### 2.3 内容质量
| 指标 | 目标 |
|------|------|
| 用户/我反馈"今日 top 3 项目里至少 1 个值得点击" | 抽样 |
| Identity match 准确率（v0.1 seed 集上） | precision ≥ 95%, recall ≥ 70% |

**显式不做（v0.1）**: 付费、用户登录、watchlist、real-time alert、移动 app、多语言。

---

## 3. 监控源（2026 API 现状）

| 平台 | 数据点 | Access | 成本 | 商用限制 | MVP 优先级 |
|------|--------|--------|------|----------|-----------|
| **GitHub** | Stars 变化、release、fork | REST / GraphQL | 免费（5000 req/h authed） | 无 | **P0** |
| **Product Hunt** | 新 launch、upvotes 趋势 | GraphQL | 免费 | ⚠️ **非商用**，付费前需邮件 hello@producthunt.com 申请 | **P0** |
| **Hacker News** | Show HN、comments | Firebase API | 免费 | 无 | **P1** |
| **Reddit** (r/SaaS, r/indiehackers, r/SideProject) | 帖子热度、mention | OAuth API | 免费（60 req/min） | 无 | **P1** |
| **X / Twitter** | Founder 动态、产品讨论 | pay-per-use ($0.005/read, cap 2M/月) | 边际成本 | 商用 OK | **P2** |

**关键决策**：
- **PH 商用阻断点**: P3 收费前必须先发邮件取得商用许可，提前 1 个月启动。
- **X 成本控制**: 不做全网监听，只 follow watchlist 内 founder handles。硬性预算 $10/月（约 2000 reads），token-bucket 限流。

---

## 4. AI 精炼 — 4 个具体任务

| 任务 | 输入 | 输出 | 模型 | v0.1 |
|------|------|------|------|------|
| **T1: Summarize** | Project metadata + GH README + PH description | ≤ 20 字一句话产品描述 | Haiku（prompt cache README） | ✅ |
| **T2: Identity Match** | 多平台项目记录 | 同一项目的 cluster ID（见 §6） | Embedding (pgvector) + Haiku verify | ✅ |
| **T3: Signal Scoring** | 一个项目的 24h snapshots | velocity / cross-platform / founder 三类分 | 启发式 + LLM tie-break | ✅ |
| **T4: Digest Curation** | 当天 top 50 候选 + 历史发送记录 | 5 个"今日值得读" + 1 段周综述 | Haiku，去重最近 14 天已推送 | ✅ |

成本估算：v0.1 每日 ≈ 100 项目 × 4 任务 ≈ < $0.50/天 LLM 开销。

---

## 5. 核心信号

1. **Velocity Signal** — Stars / upvotes 的 24h 加速度（不只是绝对值）
2. **Cross-platform Signal** — Identity 匹配后，同一项目 24h 内在 ≥2 个平台活跃
3. **Founder Signal** — Watchlist 里 founder 发数据型推文（含数字 / 百分比 / $）
4. **Alert Signal** — Deferred 到 P3（需要 user-level watchlist）

---

## 6. 跨平台身份匹配

产品差异化的核心技术难题。

**v0.1 策略**：
1. **Hard match (确定性高)**: PH 页面 / 项目主页明确链接到的 GitHub repo / X handle → 直接 link
2. **Soft match (启发式)**: 域名一致 + 名字编辑距离 ≤ 3 → LLM 二次确认
3. **Embedding fallback**: pgvector 上的 cosine similarity 找候选，再 LLM verify
4. **Manual seed**: 手工 100 个已知 indie 项目作为冷启 truth set
5. **持久化**: `IdentityLink(project_id, platform, external_id, confidence, source)`，可人工修正

**不做**: 任何"无外链、纯文本提及"的模糊匹配。

**验证标准**: 100 个 seed 项目上，hard + soft 的 precision ≥ 95%、recall ≥ 70% 才进 P1。

---

## 7. Competitive Landscape & Wedge

| 类别 | 代表 | 它们做什么 | 我们的差异 |
|------|------|-----------|-----------|
| Launch 平台 | Product Hunt, Firsto, OpenHunts, BetaList | 让 maker 发布、让用户发现 | 我们不是发布渠道，是**追踪信号** |
| Community | Indie Hackers | 内容、case study、讨论 | 我们是数据，不是社区 |
| Maker analytics | Sleek Analytics | 给 maker 看**自己**的数据 | 我们给 observer 看**别人**的数据 |
| Trend research | Trends.vc, Exploding Topics | 月度宏观趋势报告 | 我们是**项目级 daily** 粒度 |
| 直接参考 (UX) | **levels.fyi** | 薪资数据，但 UX 极强 | 我们抄它的"数据密集 + 单条目深页"模式 |

**Wedge (一句话)**: *"Bloomberg Terminal for indie products" — 项目级跨平台日度信号 + 可被 Google 收录的单项目深页（levels.fyi-style）。*

---

## 8. 技术架构

### 8.1 整体

**数据流（high level）**:

```
┌──── Sources ─────────────────┐
│ GitHub  PH  X  HN  Reddit    │   (P0: GH + PH only;
│                              │    P1: + HN, Reddit;
└──────────────┬───────────────┘    P2: + X)
               ▼ cron 每 6h
┌──────────────────────────────┐
│ Collectors + Normalizer      │   apps/worker
│ (rate-limit guard, retry)    │   per-platform workers
└──────────────┬───────────────┘
               ▼ raw rows
┌─────────────────────────────────────────┐
│ Supabase Postgres                       │
│ ┌──────────────┐  ┌───────────────────┐ │
│ │ raw schema   │  │ app schema        │ │
│ │ ─ snapshots  │  │ ─ project         │ │
│ │ ─ collector_ │  │ ─ identity_link   │ │
│ │   errors     │  │ ─ project_metric  │ │
│ │              │  │ ─ project_embed   │ │
│ │              │  │   (pgvector)      │ │
│ │              │  │ ─ signal          │ │
│ │              │  │ ─ subscriber      │ │
│ │              │  │ ─ digest_run      │ │
│ └──────┬───────┘  └─────────▲─────────┘ │
└────────┼────────────────────┼───────────┘
         │                    │
         ▼                    │ writes
┌──────────────────┐    ┌─────┴──────────┐
│ Match Engine     │    │ Signal Engine  │
│ (T1 summarize +  │───▶│ (T3 score +    │
│  T2 identity     │    │  T4 curate)    │
│  match)          │    │                │
│ + LLM (Haiku/    │    │ + LLM (Haiku)  │
│   Sonnet)        │    │                │
└──────────────────┘    └────────┬───────┘
                                 ▼
                        ┌────────────────────┐
                        │ Notification       │
                        │ Engine             │
                        │ → Resend → inbox   │
                        └────────────────────┘

  Web client (browser)
        ⇅
  Next.js 15 SSR + Server Components       apps/web
        ⇅
  Supabase (Postgres + RLS + Auth)
```

**架构决策**:

- **单一 Postgres，两个 schema (`raw` / `app`)**，不是两个物理 DB。Raw 是 append-only，可以重跑 matching；app 是 query-ready，给 web 用。一个 backup、一个连接池、一套权限。
- **Match Engine 和 Signal Engine 分开**，节奏不同：matching 在 raw 数据落地时触发（增量），scoring/curate 每天 1 次（为 digest）。
- **Web 没有独立 Read API service**。Next.js SSR / Server Components 通过 `@supabase/ssr` + RLS 直接查 Postgres。少一个服务 = 少一个 ops 面。一旦需要公开 API 或非 web client（mobile / 第三方），再加 API 层。
- **Monorepo 布局**:
  ```
  apps/web         Next.js 15 (Vercel)
  apps/worker      Collectors + Match + Signal + Notification (Railway/Fly cron)
  packages/types   Shared zod schemas + TS types
  packages/db      Supabase client + migrations
  ```

### 8.2 Backend — TS / Node

**选 TS/Node 的原因（不是"现有技术栈一致"）**:
- **Shared types**: Frontend (Next.js) 和 backend (worker) 共享 `Project`, `Signal`, `Snapshot` schema（packages/types + zod runtime validation）。Python backend + TS frontend 会重复定义 type，drift 是必然。
- **LLM SDK 一致**: Anthropic / OpenAI 的 TS SDK 已经成熟，没有 Python-only 的功能差。
- **部署生态匹配**: Cloudflare Workers / Vercel Functions 原生 TS，符合后期 edge 部署计划。
- **Solo dev 单语言**: 减少 context switch。

**TS/Node 的弱点（诚实标注）**:
- Snapshot 时间序列分析 (T3 signal scoring) 不如 Python (pandas) 顺手
- 大量 embedding 处理也是 Python 强项

**预案**: 如果 T3 走向严肃 data science，可以拆一个 Python worker（snapshots 表是共享的，跨语言成本可控）。**v0.1 不做。**

### 8.3 Storage — Postgres via Supabase（替换 v0.2 的 SQLite）

**为什么不用 SQLite**:
v0.2 写的"SQLite → Postgres 后期迁移"是无意义的工作量。本项目从 day 1 就需要：

| 需求 | SQLite | Postgres |
|------|--------|----------|
| Embedding 存储 + 相似度搜索 (T2 identity match) | ❌ 无 vector 类型 | ✅ `pgvector` |
| JSON snapshot 嵌套查询 | OK | ✅ `jsonb` + GIN |
| 项目描述全文搜索 (web 上必需) | FTS5 限制多 | ✅ `tsvector` |
| Email 订阅 + 后期 auth (P2+) | 自己造 | ✅ Supabase Auth (magic link 内置) |
| Web SSR 多区域读 | 不友好 | ✅ 读副本 |

**为什么 Supabase 而不是 Neon**: 把 Postgres + Auth + Magic-link email 三件事合并成一个 managed dep。v0.1 是 solo dev，少一个组件就少一个 ops 面。Neon 是后备方案。

**容量**: Supabase 免费层 500 MB + 50K monthly active users，v0.1 (~100 项目 × 4 snapshots/day × 365 day ≈ 150K 行) 远低于上限。

### 8.4 Frontend — Next.js 15 + 数据密集组件

**核心要求（来自 levels.fyi 类比）**:
- 数据密集表格（sortable / filterable / 移动响应）
- 单项目深页 SEO（每个项目 = 一个 indexable URL）
- 时间序列图表（stars 变化、cross-platform 信号轴）
- 视觉精致度高于默认 shadcn

**Stack**:

| 层 | 选型 | 理由 |
|----|------|------|
| Framework | **Next.js 15 (App Router)** | SSR 让项目页 SEO 收录 = 类 levels.fyi 的 organic 流量复利 |
| Styling | **Tailwind** | 速度 + Next.js 生态默认 |
| Component | **shadcn/ui (heavily themed)** | 起步快，但 v0.1 要明确主题化，避免"generic shadcn"观感 |
| Data table | **TanStack Table** | levels.fyi-style sortable/filterable |
| Charts | **Tremor** (主) + **Recharts** (复杂图) | Signal velocity / 时间序列 |
| Forms | **React Hook Form + zod** | 订阅表单 / 后期 watchlist |
| Animation | **Framer Motion** (轻量使用) | hover / transition polish |
| Analytics | **Vercel Analytics + PostHog** | Web 行为 + 邮件 → web 漏斗 |
| Deploy | **Vercel** | SSR + edge cache + 0 ops |

**v0.1 必须有的页面**:
- `/` — 首页（今日 top 5 + 订阅 CTA + 近期 highlights）
- `/projects` — 全量数据表（TanStack Table，按类目/velocity/平台筛选）
- `/projects/[slug]` — 单项目深页（cross-platform 信号 timeline、stars 曲线、相关项目）
- `/digest/[date]` — 历史 digest 归档（与邮件等价的 web 版）
- `/categories/[slug]` — 类目页（AI / SaaS / DevTools 等，SEO 用）
- `/about` — 项目说明 + 订阅
- 邮箱订阅组件（出现在 `/` 和 `/digest/*`）

**响应式**: Tailwind breakpoints (`sm/md/lg/xl`)，所有数据表移动端切换为 card list 而不是横向滚动。

### 8.5 Worker — Collectors & Cron

- **Runtime**: Node 22，部署到 Railway 或 Fly.io（cron + 长 task 比 CF Workers 友好）
- **Scheduler**: Node cron 包 / Railway cron jobs。每 6h 触发一次。
- **Failure handling**: 失败重试 3 次 → 写入 `collector_errors` 表
- **Rate-limit guard**: token-bucket per platform，硬性预算（尤其 X）

### 8.6 Email — Resend

- **免费层**: 100/day，足够 v0.1 dogfood + 初期 alpha
- **Template**: React Email（与 Next.js 共享组件，邮件和 web 视觉一致）
- **订阅来源**: Supabase Auth magic-link → 用户邮箱写入 `Subscriber` 表

### 8.7 LLM

- **主模型**: Claude Haiku（成本敏感任务: T1 summarize, T4 digest curation）
- **复杂判定**: Claude Sonnet（T2 identity verify, T3 tie-break）
- **Prompt cache**: 长 README / 历史发送记录用 prompt cache，省 token

---

## 9. 数据模型

```
Project {
  id, slug, name, one_liner, category
  primary_url, status (active/dead)
  seo_title, seo_description           // for web
  hero_image_url                       // PH thumbnail or GH og-image
  created_at, updated_at
}

IdentityLink {                         // §6
  id, project_id, platform, external_id
  confidence, source (hard/soft/embedding/manual)
  created_at
}

Snapshot {
  id, project_id, platform, timestamp
  stars, forks, upvotes, comments, rank
  raw_data: jsonb
}

ProjectMetric {                        // 时间序列图用，聚合自 Snapshot
  id, project_id, date (date, not timestamp)
  github_stars, github_stars_delta_24h
  ph_upvotes, ph_rank
  hn_score, reddit_mentions
  // 一个项目每天 1 行，~150 KB 全量数据，web 图表查询用
}

ProjectEmbedding {                     // pgvector，T2 用
  project_id, embedding (vector(1536))
  source_text_hash, model_version
}

Signal {
  id, project_id, type, severity, score
  title, description, linked_snapshot_ids
  created_at, sent_in_digest_at
}

Subscriber {
  id, email, status (active/unsubscribed)
  preferences: jsonb (categories, frequency)
  source (web_form/manual/import)
  created_at, last_opened_at
}

DigestRun {
  id, subscriber_id, sent_at
  included_signal_ids, opened_at, click_count
}

CollectorError {
  id, platform, error_type, payload, occurred_at
}
```

---

## 10. 里程碑（part-time solo dev 真实节奏，web + email co-equal）

| Phase | 内容 | 真实时间 |
|-------|------|---------|
| **P0** | Monorepo skeleton + Supabase setup + GH + PH collectors + Identity match v1 + Next.js 基础页面 (`/`, `/projects`, `/projects/[slug]`) + 手工邮件 dogfood | **5–6 周** |
| **P1** | + HN + Reddit collectors + Signal engine (T1-T4) + Resend + Supabase Auth magic-link 订阅 + `/digest/[date]` + `/categories/[slug]` + 50 alpha 用户 | **+5–6 周** |
| **P2** | + X (watchlist 模式) + 视觉 polish + Tremor 图表完整 + SEO 优化 + sitemap + PostHog 漏斗 + 200+ 订阅 | **+5–6 周** |
| **P3** | + 用户账号 + 个人 watchlist + 邮件 alert + Stripe 付费试水 + PH 商用许可 | **+8–10 周** |

总计：**约 6–7 个月**到 paid beta。

---

## 11. Out of Scope (v0.1)

- 用户登录系统（订阅只需 email magic link）
- 个人 watchlist（P3）
- 付费 (P3)
- 移动 app（响应式 web 足够）
- 实时 push（每日邮件 + web 已足够）
- 用户主动提交项目（v0.1 由 collector 自动发现 + 我手工 seed 100 个）
- 多语言（先英文，UI 文案英文为主，doc 可保持中英混合）
- 用户评论 / 互动

---

## 12. Open Questions

1. **PH 商用许可** — P3 才申请是否太晚？email subscriber 数据从 v0.1 就在收集，是否算商用边界？
2. **T2 Identity Match LLM 验证预算** — 100 项目 × ~5 平台 ≈ 500 次 verify，一次性预算 + 缓存够吗？
3. **类目策略** — 邮件混合发送 vs. 用户选类目订阅？v0.1 推荐先混合，邮件底部加"想看 AI 类目专属邮件 → 点这里"留口子。
4. **Founder watchlist bootstrap** — 复用 IdentityLink 表里已有 X handle 的项目？
5. **Web 首屏 vs. SEO 长尾** — 首页要不要默认无 paywall 展示全量数据？利于 SEO 但减少订阅压力。

---

## Appendix A — 协作

- **James**: Claude Code / Codex 高强度编码，本地开发
- **Alex / JBK**: PRD 维护、PR review、文档、自动化脚本
- 所有 context 在 GitHub repo 内统一管理

---

_Discussion thread: Telegram 2026-05-17_
