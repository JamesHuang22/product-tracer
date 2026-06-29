# OpenProduct — Development Queue

---

## [2026-06-28] TASK-008: Regenerate weekly trends data — rerun pipeline for history weeks
- **Priority**: P0 BUG
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 21:20 PDT
- **PR**: #86 (merged — adds `week` workflow_dispatch input)
- **Verify**: PASS — regenerated via `gh workflow run "Weekly Hot Trends" -f week=2026-06-15` and `-f week=2026-06-22` (both runs succeeded). DB now: 06-22 → 137 signals, top products OpenKnowledge·Nub·Atlas·…; 06-15 → 0 signals (none that week), distinct themes (RSI·GLM-5.2·…); "Are You in the Weights?" gone from both weeks. `/trends` (+ `?week=`, `/en`, `/zh`) all 200; latest /trends shows the regenerated 06-22 data. Done via GitHub Actions (secrets live there; billing now unblocked) — local run not possible.
- **Acceptance**: "Are You in the Weights?" appears only in the week it was collected, not duplicated across multiple weeks. Each week shows unique top products and themes.
- **Spec**:
  **Problem:** TASK-007 fixed the query to use ISO week bounds (not trailing 7 days), but historical trend data was generated *before* the fix with the old query. Data in DB still has overlap between weeks.
  
  **Fix:** Rerun the weekly trends pipeline for the last 4 weeks to regenerate data with correct ISO week bounds:
  1. Run `pnpm --filter @product-tracer/worker run:weekly-trend --week=2026-06-15`
  2. Run `pnpm --filter @product-tracer/worker run:weekly-trend --week=2026-06-22`
  3. Verify in DB: query `app.weekly_trend` for those weeks — top products and themes should differ between weeks

---

## Done Tasks

## [2026-06-28] TASK-006: Fix empty YouTube insight cards on /youtube-insights
- **Priority**: P0 BUG
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 16:10 PDT
- **PR**: #82 (merged)
- **Verify**: PASS — EN /youtube-insights renders 20 cards, every card has a text block (title fallback for the 20 CJK-in-EN-column rows), no empty cards, no CJK insight leak; ZH still shows the Chinese insight.

## [2026-06-28] TASK-005: Landing page — "OpenProduct" marketing homepage
- **Priority**: P0
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 16:35 PDT
- **PR**: #84 (merged)
- **Verify**: PASS — landing at `/`, dashboard at `/dashboard`, login redirect works. Animated gradient mesh hero, 3 feature cards, live stats strip, bilingual.

## [2026-06-28] TASK-004: Product rename — "Product Tracer" → "OpenProduct"
- **Priority**: P0
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 16:20 PDT
- **PR**: #83 (merged)
- **Verify**: PASS — all frontend pages show "OpenProduct", `rg "Product Tracer"` returns 0.

## [2026-06-28] TASK-007: Fix weekly trends — dedup weeks, week-unique insights
- **Priority**: P0 BUG
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 17:30 PDT
- **Verify**: Code fixed (ISO week bound). Historical data regeneration = TASK-008.

## [2026-06-27] TASK-000: User Auth + Synced Bookmarks
- **Priority**: P0
- **Status**: done
- **PR**: #77
- **Verify**: PASS — all pages 200, auth flow works
