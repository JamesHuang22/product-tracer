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
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 22:12 PDT
- **PR**: #87 (merged)
- **Verify**: PASS — production landing footer shows only "OpenProduct © 2026" + Dashboard; GitHub link removed (and unused GITHUB_REPO constant dropped); homepage 200.
- **Acceptance**: Footer only shows "OpenProduct © 2026 · Dashboard" — no GitHub link/reference visible to users
- **Spec**:
  *(filled by Planner)*

---

## [2026-06-28] TASK-011: Hide future/incomplete weeks on /trends + fix cron time
- **Priority**: P1
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 22:35 PDT
- **PR**: #88 (merged)
- **Verify**: PASS — /trends now defaults to "Week of 2026-06-22 – 06-28" (latest *ended* week); the in-progress 06-29 week is gone from the selector (options: 06-15, 06-22 only) and the header. `getLatestWeeklyTrend`/`getTrendWeeks`/`getRecentWeeklyTrends` filter `week_end < current_date`; cron → `5 0 * * 1`. /en/trends, /zh/trends, ?week= all 200. (Used `week_end < current_date`, not the spec's `week_start <= current_date`, because the DB is UTC where current_date is already 06-29 — the spec's rule would still show the in-progress week.)
- **Acceptance**: /trends does NOT show weeks that haven't ended yet. Current week (2026-06-29 ~ 07-05) should NOT appear on 2026-06-28. Cron should run at a time that captures full week data.
- **Spec**:
  **Problem:** The `/trends` page currently shows the current week (2026-06-29 ~ 07-05) even though the week hasn't ended yet. The cron that triggers the Weekly Hot Trends workflow runs at a time that may not capture a full week's worth of data.
  
  **Fix (Frontend):** In the `/trends` page route or component, filter out weeks whose start date has not yet passed. Specifically: only show weeks where `week_start <= current_date`. This prevents incomplete weeks from appearing in the week selector dropdown and on the page.
  
  **Fix (Cron):** Update the cron schedule for the Weekly Hot Trends GitHub Action to run on **Monday at 00:05 UTC** (which is Sunday ~5pm PT / ~8pm ET, and captures the full previous ISO week). Current cron may be at a different time; change it to `5 0 * * 1`.
  
  **Files to touch:**
  - Frontend trends page/component — filter weeks by `week_start <= today`
  - `.github/workflows/weekly-hot-trends.yml` (or wherever cron is defined) — update schedule to `5 0 * * 1`

---

## [2026-06-28] TASK-010: Fix YouTube insights — translate Chinese content to English in EN locale
- **Priority**: P1
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 22:50 PDT
- **PR**: #89 (merged) + ran "Backfill Insight English" workflow
- **Verify**: PASS — 20 legacy rows had Chinese in the English `key_insight` column (Chinese already preserved in `key_insight_zh`). New `backfill-insight-en` worker (run via GitHub Actions, LLM=DeepSeek) translated them → English. DB now: 0 CJK in `key_insight` (was 20), all 117 English, ZH preserved (116). Production EN /youtube-insights shows English insights (e.g. "ByteDance unveiled the Doubao 2.1 Pro…"), 20 cards, 0 "Analysis pending"; ZH still shows Chinese. No frontend change needed (titles are only a fallback, never shown once insights are English). Idempotent; the YT-insights generator already prompts for English `key_insight` going forward.
- **Acceptance**: On /youtube-insights, when locale is EN: all cards display English text. Chinese titles/insights should be translated to English (not suppressed/hidden). When locale is ZH: Chinese content stays as-is. No cards should show a mix of EN and ZH (they should be fully localized per locale).
- **Spec**:
  **Problem:** The `/youtube-insights` page has YouTube video cards that sometimes show Chinese titles or insight text even when the locale is set to EN (English). This creates a mixed-language experience that looks broken.
  
  **Root Cause:** The YouTube insight data is fetched from the database, where Chinese content is stored in its original form. The frontend renders this content directly without translation when the locale is EN.
  
  **Fix:**
  1. **Backend (API layer):** In the YouTube insights API endpoint, add locale-aware translation logic. When `locale=EN` is requested, detect non-English text (CJK characters) in titles and insight fields, and translate them to English using LLM API before returning the response. When `locale=ZH`, return data as-is.
     - Suggested approach: batch-translate CJK fields per card. Cache translations in the DB (`translations` table or a `title_en` / `insight_en` column) to avoid re-translating on every request.
     - Alternatively: translate on read via a middleware/helper, with a simple in-memory cache (caveat: won't persist).
  
  2. **Frontend:** No change needed — the API should serve properly localized data.
  
  **Files to touch (likely):**
  - Backend: YouTube insights route/controller — add locale detection + translation logic
  - Possibly add a DB migration for cached translations if using persistent cache
  - No frontend changes expected if API handles it cleanly

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
