# Product Tracer — 项目状态报告 (2026-05-28)

> 跨平台独立产品发布/增长信号追踪器
> PRD: v0.3

---

## ✅ 已完成

### 1. PRD v0.3
- 双轨策略定稿：Daily Email（被动消费）+ Web（主动研究）
- 技术栈：Next.js 15 + Supabase/Postgres + Tailwind v4 + TanStack Table + pnpm monorepo
- 里程碑：~6-7 个月到 paid beta

### 2. Database Schema
- `app` + `raw` 双 schema，8 张核心表
- pgvector 已就绪（T2 identity match）
- 包含迁移 SQL (`migrations/0001_init.sql`)

### 3. Collector — GitHub 🟢
- 多 query 发现（trending + topic/search queries + known repos refresh）
- 噪点过滤（isNoiseRepo: awesome-list, tutorial, book 等）
- 每 4h GH Actions cron

### 4. Collector — Hacker News (Show HN) 🟢
- 获取 Show HN 首页 100 条
- 自动 hard-match GitHub 项目（通过 URL 提取 owner/repo）
- 每 4h GH Actions cron（偏移 30min）

### 5. Web 前端
- **首页**: Hero + "Today's top 5"（实时 SQL join 数据）
- **Projects 页**: 全量项目表格，支持排序、搜索过滤（TanStack Table）
- **设计**: dark/light 双模式，Tailwind v4，Inter font
- **数据**: project + latest snapshot stars 实时查询

### 6. 数据模型
- `@product-tracer/types` — Zod schema（Platform, Project, SignalType 等）
- `@product-tracer/db` — Supabase JS client + 直连 Postgres 客户端
- `app.project`, `app.identity_link`, `raw.snapshot`, `app.project_metric` 等已跑通

### 7. Research Docs
- 18 个索引源（research-docs/INDEX.md）
- 11 次扫描记录

### 8. 基础设施
- pnpm monorepo（workspace 协议）
- TypeScript strict mode
- `.github/workflows/` 两个 CI cron

---

## 🚧 未完成

| 项目 | 优先级 | 状态 | 备注 |
|---|---|---|---|
| Product Hunt collector | P0 | ❌ | 官方 API v2（GraphQL, free），代码在 jbk/skeleton-v0.1 分支未合并 |
| T1 Summarizer (LLM) | P0 | ❌ | PRD §6.3: 用 Claude Haiku 总结项目描述 |
| Daily Email Digest | P0 | ❌ | Resend + React Email 模板未开始 |
| T4 Digest Curator | P0 | ❌ | 每日精选 5-7 个项目推送 |
| X/Twitter collector | P1 | ❌ 阻塞 | 401 bearer token 未解决 |
| Reddit collector | P1 | ❌ | 无代码 |
| 本地开发环境 | — | ❌ | 无 `.env` 文件，Supabase 配置缺失 |

---

## ⚠️ 潜在风险

1. 缺少本地 `.env` — Supabase URL/keys 未确认是否配置完成
2. Web app 依赖 `.env`（`NEXT_PUBLIC_SUPABASE_URL` + `DATABASE_URL`）
3. GH Actions collector 是否在生产环境成功运行需确认 logs

---

## 建议下一步

- **选项 A**: 补 Product Hunt collector（最快可出成就感的增量）
- **选项 B**: 搭 Daily Email 骨架（Resend 注册 + React Email 模板 + 定时任务）
- **选项 C**: 上 T1 Summarizer（Claude Haiku 整合到 worker 管线）

---

*报告时间: 2026-05-28 22:22 PDT*
*由 Alex Chen 生成*
