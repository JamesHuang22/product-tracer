# OpenProduct — Development Queue

---

## [2026-06-28] TASK-008: Regenerate weekly trends data — rerun pipeline for history weeks
- **Priority**: P0 BUG
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 22:05 PDT
- **Verify**: PASS — triggered `gh workflow run "Weekly Hot Trends"` (run succeeded). DB weeks are distinct: 06-22 → 137 signals, 10 products (OpenKnowledge·Nub·Atlas·…); 06-15 → 0 signals, no products (none collected that week). "Are You in the Weights?" gone from both weeks. `/trends` (+ `?week=`, `/en`, `/zh`) all 200. (Note: the 06-15/06-22 rows were regenerated earlier this session via a `--week` workflow run; that data persists in the DB regardless of the workflow-file revert. Ran via GitHub Actions since LLM/DB secrets live there.)
- **Acceptance**: "Are You in the Weights?" appears only in the week it was collected, not duplicated across multiple weeks. Each week shows unique top products and themes.
- **Spec**:
  **Problem:** TASK-007 fixed the query to use ISO week bounds (not trailing 7 days), but historical trend data was generated *before* the fix with the old query. Data in DB still has overlap between weeks.
  
  **Fix:** Trigger the Weekly Hot Trends GitHub Action with `gh workflow run "Weekly Hot Trends" --repo JamesHuang22/product-tracer`. The workflow has access to LLM_API_KEY and DATABASE_URL from GitHub secrets. No local env vars needed.
  
  After triggering, verify: `gh run list --repo JamesHuang22/product-tracer --json name,status,conclusion` shows "success" for the Weekly Hot Trends run.
  
  Then verify in DB / frontend: query `app.weekly_trend` for weeks 2026-06-15 and 2026-06-22 — top products and themes should differ between weeks.

---

## [2026-06-28] TASK-009: Remove GitHub link from footer
- **Priority**: P2
- **Status**: in-progress
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 22:12 PDT
- **Acceptance**: Footer only shows "OpenProduct © 2026 · Dashboard" — no GitHub link/reference visible to users
- **Spec**:
  *(filled by Planner)*

---

## [2026-06-28] TASK-010: Fix YouTube insights — translate Chinese content to English in EN locale
- **Priority**: P1
- **Status**: pending
- **Locked by**:
- **Locked at**:
- **Acceptance**: On /youtube-insights, when locale is EN: all cards display English text. Chinese titles/insights should be translated to English (not suppressed/hidden). When locale is ZH: Chinese content stays as-is. No cards should show a mix of EN and ZH (they should be fully localized per locale).
- **Spec**:
  *(filled by Planner)*

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
