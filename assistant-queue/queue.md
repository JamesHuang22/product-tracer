# OpenProduct — Development Queue

---

## [2026-06-28] TASK-008: Regenerate weekly trends data — rerun pipeline for history weeks
- **Priority**: P0 BUG
- **Status**: ready
- **Locked by**:
- **Locked at**:
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
- **Locked by**: coder-ondemand
- **Locked at**: 2026-06-28 16:05 PDT
- **Acceptance**: Footer only shows "OpenProduct © 2026 · Dashboard" — no GitHub link/reference visible to users
- **Spec**:
  Remove the GitHub icon (<svg> with octocat) and the "GitHub" text link from the footer component. In the Footer component (likely `components/Footer.tsx` or `app/layout.tsx`), find the anchor tag pointing to `https://github.com/JamesHuang22/product-tracer` and the associated GitHub icon SVG — delete both the link and the icon. Also check and clean up any corresponding CSS for the GitHub link (e.g., `.github-link`, `.footer-icon`). Ensure the footer remains responsive and centered after removal.

---

## [2026-06-28] TASK-010: Fix YouTube insights — translate Chinese content to English in EN locale
- **Priority**: P1
- **Status**: ready
- **Locked by**:
- **Locked at**:
- **Acceptance**: On /youtube-insights, when locale is EN: all cards display English text. Chinese titles/insights should be translated to English (not suppressed/hidden). When locale is ZH: Chinese content stays as-is. No cards should show a mix of EN and ZH (they should be fully localized per locale).
- **Spec**:
  In the YouTube insights page/data layer, detect when the current locale is "en". If any Chinese text appears in fields like `title`, `summary`, `insight`, or `transcript_snippet`, pipe it through a translation function (e.g., Google Translate API or an LLM call) before rendering. For "zh" locale, render the original Chinese text as-is. Ensure the translation is done at render time (or cached per session) and that no card shows a mix of Chinese and English — each card's text should be fully in the target locale. If using an LLM, batch-translate all Chinese fields in a single prompt for efficiency, with a simple fallback to the original text if translation fails.

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
