# Product Tracer — Feature Status

*Last updated: 2026-06-21 14:15 PDT*

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

## ⏳ Queued

1. **Reddit collector** — `next-request.md`. Subreddits: SideProject, indiehackers, startups. 4h cron, JSON API (no key).
2. Product Hunt collector still executing.
