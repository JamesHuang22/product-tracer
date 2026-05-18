# Product Tracer — PRD

> 跨平台独立产品发布/增长信号追踪器
> 状态: Draft
> 版本: v0.2 (2026-05-17)
> 上一版: v0.1 (2026-05-17)

---

## 0. v0.2 改动概要

相比 v0.1：
- 新增 §1 Problem & Target User、§2 Success Metrics（v0.1 完全缺失）
- §3 监控源表更新为 **2026 API 现状**（X 已改为 pay-per-use，PH 非商用受限）
- §4 把"AI 精炼"拆成 4 个明确任务（v0.1 只是 hand-wave）
- 新增 §6 跨平台身份匹配 — v0.1 没回答的核心技术难题
- 新增 §7 Competitive Landscape & Wedge
- §10 里程碑节奏调整为 part-time solo dev 的真实节奏（5-6 周 → 4-5 个月）
- §9 数据模型补 `IdentityLink` / `Subscriber` / `DigestRun`

---

## 1. Problem & Target User

### 1.1 Problem

Solo dev 每天能看到的信息已经过载（GitHub trending、Product Hunt、X、HN、Reddit 各自的 feed），但**没有跨平台的"信号"**：

- 一个项目在 GH 涨了 500 stars，是否同时也在 PH 排前 5？是否 founder 在 X 上发了增长数据？目前需要人工拼接。
- 现有产品（Product Hunt / Indie Hackers / Firsto / OpenHunts / BetaList）都是 **launch / community 平台**，不是 cross-platform **tracker**。

### 1.2 Target User — v0.1 single persona

**Persona: "学习型 Indie Builder"**
- 自己在做 side project，每周想看"市场上有什么值得学的新东西"
- 不要求 real-time，能容忍 24h 延迟
- 不需要分析工具，需要**精选的、5 分钟读完**的 digest

未来可扩展到 *Competitor Tracker* 和 *Trend Researcher* 两类 persona，但 v0.1 只服务前者。这个选择决定了：
- 输出格式 = 每日邮件
- 内容 = 跨品类精选 5 个项目 + 1 段周综述
- 不做 watchlist / 实时 alert（那是 Competitor Tracker 的需求）

---

## 2. Success Metrics (v0.1)

| 指标 | 目标 | 时间窗 |
|------|------|--------|
| Dogfood | 我自己连续 4 周每天打开 digest 邮件 | 上线后 4 周内 |
| Email 订阅数 | ≥ 30 active subscribers（≥3 次打开） | 上线后 8 周内 |
| Open rate | > 40% | 持续 |
| Signal quality | 用户/我自己反馈"今日 top 3 项目里至少 1 个值得点击" | 抽样反馈 |

**显式不做**：付费、用户登录、Web UI、real-time alert、移动端。

---

## 3. 监控源（2026 API 现状）

| 平台 | 数据点 | Access | 成本 | 商用限制 | MVP 优先级 |
|------|--------|--------|------|----------|-----------|
| **GitHub** | Stars 变化、release、fork | REST / GraphQL | 免费（5000 req/h authed） | 无 | **P0** |
| **Product Hunt** | 新 launch、upvotes 趋势 | GraphQL | 免费 | ⚠️ **非商用**，付费前需邮件 hello@producthunt.com 申请 | **P0**（v0.1 非商用阶段） |
| **Hacker News** | Show HN、comments | Firebase API | 免费 | 无 | **P1** |
| **Reddit** (r/SaaS, r/indiehackers, r/SideProject) | 帖子热度、mention | OAuth API | 免费（60 req/min） | 无 | **P1** |
| **X / Twitter** | Founder 动态、产品讨论 | pay-per-use ($0.005/read, cap 2M/月) | 边际成本 | 商用 OK | **P2** |

**关键决策**：

- **PH 商用阻断点**: P3 开始收费前必须先发邮件取得商用许可，否则架构上需要切换到 alternative（如 OpenHunts API、或直接 scraping 风险）。这是个明确的 P3 阻塞项，提前 1 个月启动。
- **X 成本控制**: 不做全网监听，只 follow watchlist 里的 founder handles。硬性预算上限 $10/月（约 2000 次 read），用 token-bucket 限流。
- **GH 是免费且 quota 充足的，所以 P0 双平台 = GH + PH** 仍然 OK。

---

## 4. AI 精炼 — 4 个具体任务

v0.1 把"AI"拆成 4 个独立可评估的任务：

| 任务 | 输入 | 输出 | 模型 | v0.1 |
|------|------|------|------|------|
| **T1: Summarize** | Project metadata + GH README + PH description | ≤ 20 字一句话产品描述 | Haiku（prompt cache README） | ✅ |
| **T2: Identity Match** | 多平台项目记录 | 同一项目的 cluster ID（见 §6） | Embedding + Haiku verify | ✅ |
| **T3: Signal Scoring** | 一个项目的 24h snapshots | velocity / cross-platform / founder 三类分 | 启发式 + LLM tie-break | ✅ |
| **T4: Digest Curation** | 当天 top 50 候选 + 历史发送记录 | 5 个"今日值得读"+ 1 段周综述 | Haiku，去重最近 14 天已推送 | ✅ |

成本估算：v0.1 每日 ≈ 100 项目 × 4 任务 ≈ < $0.50/天 的 LLM 开销，可承受。

---

## 5. 核心信号

1. **Velocity Signal** — Stars / upvotes 的 24h 加速度（不只是绝对值）
2. **Cross-platform Signal** — Identity 匹配后，同一项目 24h 内在 ≥2 个平台活跃
3. **Founder Signal** — Watchlist 里的 founder 发数据型推文（含数字 / 百分比 / $）
4. **Alert Signal** — Deferred 到 P3（需要 user-level watchlist）

---

## 6. 跨平台身份匹配（v0.2 新增 — 核心技术难题）

这是产品差异化的核心，也是 v0.1 大部分技术难度所在。

**v0.1 策略**：

1. **Hard match (确定性高)**: PH 页面 / 项目主页明确链接到的 GitHub repo / X handle → 直接 link
2. **Soft match (启发式)**: 域名一致 + 名字编辑距离 ≤ 3 → LLM 二次确认
3. **Manual seed**: 手工整理 100 个已知 indie 项目作为 cold-start truth set，同时验证 (1)(2) 的准确率
4. **持久化**: 所有 link 存 `IdentityLink(project_id, platform, external_id, confidence, source)`，可人工修正

**显式不做**：任何"无外链、纯文本提及"的模糊匹配。Noise 太高，会污染信号。

**验证标准**: 在 100 个 seed 项目上，hard + soft match 的 precision ≥ 95%，recall ≥ 70% 才进 P1。

---

## 7. Competitive Landscape & Wedge

| 类别 | 代表 | 它们做什么 | 我们的差异 |
|------|------|-----------|-----------|
| Launch 平台 | Product Hunt, Firsto, OpenHunts, BetaList | 让 maker 发布、让用户发现 | 我们不是发布渠道，是**追踪信号** |
| Community | Indie Hackers | 内容、case study、讨论 | 我们是数据，不是社区 |
| Maker analytics | Sleek Analytics | 给 maker 看**自己**的数据 | 我们给 observer 看**别人**的数据 |
| Trend research | Trends.vc, Exploding Topics | 月度宏观趋势报告 | 我们是**项目级 daily** 粒度 |

**Wedge (一句话)**: *"Bloomberg Terminal for indie products" — 不是发布渠道、不是社区、不是宏观 trend，而是**项目级跨平台日度信号**。*

---

## 8. 技术架构

```
┌─────────────────┐
│  Scheduler/CRON │── 每 6h 触发，每平台独立 worker
└────────┬────────┘
         ▼
┌─────────────────┐
│  Collectors     │── 含 rate-limit guard / retry / dead-project GC
└────────┬────────┘
         ▼
┌─────────────────┐
│  Identity Match │── §6，单独可重跑
└────────┬────────┘
         ▼
┌─────────────────┐
│  Signal Engine  │── §4 的 T1-T4
└────────┬────────┘
         ▼
┌─────────────────┐
│  Output Layer   │── Email (Resend) → 后期 Web
└─────────────────┘
```

- **Backend**: TS / Node
- **Storage**: SQLite (v0.1) → PostgreSQL (P2+)
- **Email**: Resend (免费 100/day 对 v0.1 足够)
- **LLM**: Claude Haiku 为主（成本敏感），Sonnet 仅用于 T2/T3 的难判定
- **Deploy**: 本地 cron (v0.1) → Cloudflare Workers + D1 (P2+)

---

## 9. 数据模型

```
Project {
  id, name, slug, one_liner, category
  primary_url, status (active/dead)
  created_at, updated_at
}

IdentityLink {                          // §6
  id, project_id, platform, external_id
  confidence, source (hard/soft/manual)
  created_at
}

Snapshot {
  id, project_id, platform, timestamp
  stars, forks, upvotes, comments, rank
  raw_data: JSON
}

Signal {
  id, project_id, type, severity, score
  title, description, linked_snapshot_ids
  created_at, sent_in_digest_at
}

Subscriber {                            // v0.1 起就需要
  id, email, status
  preferences: JSON (categories, frequency)
  created_at, last_opened_at
}

DigestRun {
  id, subscriber_id, sent_at
  included_signal_ids, opened_at, click_count
}
```

---

## 10. 里程碑（part-time solo dev 真实节奏）

| Phase | 内容 | 真实时间 |
|-------|------|---------|
| **P0** | GitHub + PH 双平台 collector + Identity match v1 + 个人邮箱 daily digest（dogfood only） | **3–4 周** |
| **P1** | + HN + Reddit collector + Signal engine (T1–T4) + Resend 邮件订阅落地页 | **+3–4 周** |
| **P2** | + X (watchlist 模式) + 50 alpha 用户 + 简单 Web 落地页 | **+4–6 周** |
| **P3** | + Web Dashboard + watchlist 功能 + 付费试水 + **PH 商用许可申请** | **+6–8 周** |

总计：**约 4–5 个月**到付费 beta（v0.1 估的 5–6 周不现实）。

---

## 11. Out of Scope (v0.1)

- 用户登录系统（订阅只需 email）
- 移动 app
- 实时 push（email 已足够）
- 用户主动提交项目（v0.1 由 collector 自动发现 + 我手工 seed 100 个）
- 全文搜索 / 高级过滤
- 多语言（先英文）

---

## 12. Open Questions

1. PH 商用许可 — 计划 P2 末申请，是否可以提前？
2. T2 Identity Match 的 LLM 验证 — 100 项目 × ~5 平台 ≈ 500 次 verify，是否一次性预算 + 缓存即可？
3. v0.1 是否需要类目（AI / SaaS / DevTools / Consumer）？还是混合发送让用户在邮件里筛？
4. Founder Signal 的 watchlist 怎么 bootstrap？是否复用 Identity Match 表里 X handle 已知的项目？

---

## Appendix A — 协作

- **James**: Claude Code / Codex 高强度编码，本地开发
- **Alex / JBK**: PRD 维护、PR review、文档、自动化脚本
- 所有 context 在 GitHub repo 内统一管理

---

_Discussion thread: Telegram 2026-05-17_
