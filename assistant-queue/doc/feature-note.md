# Product Tracer — Feature Status

*Last updated: 2026-06-21 17:15 PDT*

## ✅ Done & Merged

### Weekly Hot Trends (PRs #29–#32)
- **#29** — `/trends` page, nav link, locale-aware rendering (frontend)
- **#30** — Backend data pipeline: `0012_weekly_trend` migration, `weekly-trend.ts`, GitHub Actions cron
- **#31** — Fix `/trends` 500 on `emerging_themes` coalesce type
- **#32** — Fix `top_products` shape mismatch

Status: `/trends` renders real data, all prod-verified (HTTP 200).

## 🔧 PR #33 — Code review fixes (merged ✅)

- `apps/web/lib/db.ts` — `'{}'::text[]` explicit cast
- `apps/web/lib/format.ts` — Emoji-safe truncation via spread operator

Merged, no migration needed.

## ✅ Done Since Last Check

### PR #39 — Mobile horizontal scroll fix
- **Issue**: Full-bleed strips caused overflow on 375px viewports
- **Fix**: `overflow-x-clip` on `<body>` (not `hidden`, which breaks sticky header + inner scroll containers)
- **Scope**: `app/layout.tsx` only, covers `/`, `/projects`, `/youtube-insights`
- **Status**: Merged → prod verified (HTTP 200)

### PR #40 — Backend: AI-powered project summaries
- **Migration**: `0013_ai_summary.sql` — additive, nullable `ai_summary` on `app.project`
- **Worker**: `apps/worker/src/scripts/generate-summaries.ts` — LLM batch (50/project, daily cron)
- **CI**: `.github/workflows/generate-summaries.yml` — daily 04:00 UTC + `workflow_dispatch`
- **Design**: `ai_summary IS NULL` as work queue (idempotent, resumable, zero bookkeeping)
- **Status**: PR merged, migration 0013 applied to prod. **50 summaries generated, 4126 pending** (daily cron)

### PR #41 — Frontend: Display AI project summaries
- `lib/db.ts`: `ai_summary` on `ProjectListItem` + `ProjectDetail` (defensive via `to_jsonb`)
- `app/projects/projects-table.tsx`: truncated (80 char) ✨ italic summary with full-text tooltip
- `app/projects/[slug]/page.tsx`: full "AI Summary" block (rounded, light-gray bg, sparkle icon)
- `app/projects/page.tsx`: EN server-side stripping of `ai_summary` (same as one-liners)
- `lib/i18n.ts`: keys `detail.aiSummary` (EN "AI Summary", ZH "AI 概述")
- **Status**: PR merged, prod-verified (HTTP 200, 16 summaries on first EN page)

## ⏳ Queued

1. **Reddit collector** — `next-request.md`. Subreddits: SideProject, indiehackers, startups. 4h cron, JSON API (no key).
2. Product Hunt collector still executing.
