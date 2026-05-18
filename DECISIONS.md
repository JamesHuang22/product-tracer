# Decisions — Architecture & Design Decisions

> 每次重要决策记录在这里，所有 context 统一在 repo 内。
> 格式: YYYY-MM-DD | 类型 | 决策 | 理由 | 替代方案

---

## 2026-05-17

### Type: TECH — Monorepo: pnpm workspace + TS/Node
**Decision**: pnpm workspace monorepo，全部 TS/Node。
**Why**: 前后端共享类型（packages/types），单语言减少 context switch。
**Alternatives**: Python backend + TS frontend（被否 — type drift 必然）。
**Consequence**: Snapshot 时序分析不如 Python pandas 顺手。预案：P1 后可拆一个 Python worker。

### Type: TECH — Storage: Supabase Postgres + pgvector
**Decision**: Postgres via Supabase，不走 SQLite → Postgres 迁移。
**Why (per PRD §8.3)**: day 1 就需要 pgvector (T2 identity match), jsonb (snapshot), Supabase Auth (email magic link)。SQLite 直接不满足需求。
**Alternatives**: Neon + 自建 auth（被否 — solo dev 少一个 ops 面）。
**Risk**: Supabase 免费层 500 MB，v0.1 约 150K 行，远低于上限。

### Type: PRODUCT — Web + Email co-equal from v0.1
**Decision**: MVP 同时出 email digest + web 面板，不是 email-first。
**Why (per PRD §1.2)**: Target user 需要被动消费（email）和主动深挖（web）两种行为。
**Consequence**: 前期开发量比 email-only 大，但避免做错（launch 后没有 web → 用户留不住）。

### Type: PRODUCT — v0.1 single persona: "学习型 Indie Builder"
**Decision**: 只服务一个 persona，不做 competitor tracker 和 trend researcher。
**Why**: 三个 persona 的需求互相冲突（通知频率、数据粒度、price sensitivity 都不同）。
**Consequence**: 未来扩展需要重新做 user research。

### Type: DATA — T2 Identity Match: hard/soft/embedding/manual 四层
**Decision**: 四层匹配策略，precision ≥ 95%, recall ≥ 70% 才进 P1。
**Why**: Identity match 是产品差异化的核心技术，错配（把不同项目当成同一个）直接破坏信任。
**Risk**: recall 可能不够，需要手动 seed 100 个项目做 cold start truth set。

### Type: COST — PH 商用许可 P3 前申请
**Decision**: PH API 商用阻断点标记在 P3 里程碑前 1 个月。
**Why (per PRD §3)**: email subscriber 数据收集是否算商用边界？P3 前给 hello@producthunt.com 发邮件确认。
**Consequence**: 如果被拒，PH 数据需要替换为 scraping。

### Type: COST — X API 硬预算 $10/月
**Decision**: 只 follow watchlist 内 founder handles，不做全网监听。$10/月 token-bucket 限流。
**Why**: Pay-per-use $0.005/read，2000 reads/月 ≈ 每天看 65 条推文，watchlist 模式足够。
**Consequence**: 无法发现未知 founder（follow 圈子外的）。

---

## Template

### YYYY-MM-DD | Type: {TECH|PRODUCT|DATA|COST|PROCESS} — Title
**Decision**: ...
**Why**: ...
**Alternatives**: ...
**Consequence**: ...
