# Day 2 Sprint — Response (2026-06-23)

| # | Task | PR | Status |
|---|------|----|--------|
| U1 | Bookmark / save projects | #50 | ✅ merged, verified |
| U3 | Backfill llm_category | #52, #53 | ✅ backfilled (1.2% → 99.8%), verified |
| U2 | Backfill AI summaries | #55 | ✅ backfilled (150 → 4,537), verified |

### U2 — Backfill AI summaries

**Outcome: summaries 150 → 4,537** (active-project coverage ~99.7%), ~$0.15 in DeepSeek tokens, ~28 min, production HTTP 200 throughout.

- **Constraint**: `generate-summaries` makes one *sequential* LLM call per project (prose, not batchable like classify), so the backlog was ~3h serial and the daily cron only does 50/day.
- **Fix (PR #55)**: added `SUMMARY_CONCURRENCY` (default 1 = unchanged daily behaviour; clamped 1–16) via a shared-cursor worker pool, plus `batch`/`concurrency` workflow_dispatch inputs and a 45m timeout. The DB pool (max 2) serialises the UPDATEs; per-item errors are caught so failures retry next run.
- **Run**: two monitored dispatches at concurrency 6 (1000, then 3388) — 999 + 3388 summarised, ~6 + ~22 min, `/projects` polled every ~25–30s, steady 200. 12 newly-collected stragglers remain for the daily cron.
- **Verified**: detail page (`/projects/cloudflare-ai`) now renders the AI Summary block, the "you might also like" related row, and the Bookmark control together.

### Production incident note (shared with the team)

The U3 backfill's first unbounded run caused a brief production `EMAXCONNSESSION` outage (intermittent 500s) because the worker and the public site share one Supabase pooler. Root-caused and fixed (lean reads + chunking) before completing either backfill; every subsequent monitored run held production at HTTP 200. **Lesson for future bulk jobs: keep the worker's per-run DB footprint small and chunk long runs — the Supabase connection ceiling is the binding constraint.**

### U3 — Backfill llm_category coverage

**Outcome: active-project category coverage 1.2% → 99.8%** (≈150 → 4,490 classified), ~$0.11 in DeepSeek tokens, production HTTP 200 throughout (after the connection fix below).

- **Why a plain re-trigger couldn't work**: `llm-classify` is deliberately *gray-zone-only* (rule score 15–39) — one trigger classified just 24 projects. The rules never assign `llm_category` to confidently-scored projects, which is why ~99% sat uncategorised, breaking related-projects, the trends category chart, the `/projects` filter, and search ranking.
- **Fix (PR #52)**: added `LLM_CLASSIFY_ALL=1` mode (default off — scheduled runs unchanged) that classifies every active unclassified project, wired to a `classify_all` workflow_dispatch input.
- **Incident + fix (PR #53)**: the first unbounded run tripped Supabase `EMAXCONNSESSION` and intermittently 500'd the public site (shared pooler). Cancelled it, restored production, then: (1) ALL-mode now skips the snapshot + identity-link full scans (only gray-zone scoring needs them); (2) added `LLM_CLASSIFY_LIMIT` to chunk the backfill into short, connection-releasing runs. Re-ran in 200 → 1500 → 3000 → 50 chunks, monitoring `/projects` every ~25s — steady 200 throughout.
- **Side benefit**: the LLM pruned ≈520 genuine scraped-junk projects to `noise`. Final category mix: devtool 1465, ai/ml 710, productivity 399, open-source 367, other 322, saas 226, security 140, design 136, data 106. Frontend `LLM_CATEGORIES` already matches these 9 values exactly.

### U1 — Bookmark / Save Projects

No-auth bookmarks persisted in `localStorage` (`pt:bookmarks`).

- **`lib/bookmarks.ts`** — `getBookmarks` / `toggleBookmark` / `isBookmarked` + reactive `useBookmark(slug)` / `useBookmarks()` hooks. Same-tab sync via a `CustomEvent` (the native `storage` event only fires cross-tab), cross-tab via `storage`. SSR-safe: initial render is "not bookmarked", state reads localStorage after mount (no hydration mismatch).
- **`BookmarkButton`** (Lucide `Bookmark`/`BookmarkCheck`) — `icon` variant on every `/projects` desktop row + mobile card; `labeled` variant on the detail header. The button is a **sibling** of the card/row link (not nested — avoids invalid `<button>`-in-`<a>`) and raises itself above the row's full-bleed link overlay (`relative z-10` + `stopPropagation`/`preventDefault`) so saving never navigates.
- **`/bookmarks`** page + `BookmarksList` client — reads the slug set from localStorage, rehydrates project data from `GET /api/bookmarks?slugs=…` (new `getProjectsBySlugs()`, capped at 200 slugs). Rendered cards are filtered to the live slug set, so un-bookmarking removes a card instantly without waiting on a refetch. Shared `ProjectCard` component in the `/projects` mobile-card style.
- **Nav**: "Bookmarks" link added next to Trends. **i18n**: `nav.bookmarks`, `bookmarks.title`, `bookmarks.empty`, `detail.bookmark`, `detail.bookmarked` (EN/ZH).
- **Decision** (DECISIONS.md): localStorage-only, no DB/auth — zero backend state, no PII; tradeoff is no cross-device sync.

**Verification**: production `/`, `/projects`, `/bookmarks`, `/trends`, `/youtube-insights`, `/api/search?q=ai` → all **200**; `/api/bookmarks?slugs=cloudflare-ai` → 200 with correct project JSON. `pnpm typecheck` + full `next build` passed before PR.

---

# Full Feature Sprint — Response (2026-06-22 / 23)

All 7 tasks (T0–T6) implemented, each as its own branch → PR → squash-merge → production verification. `pnpm typecheck` passed before every PR. No direct pushes to main.

| # | Task | PR | Status |
|---|------|----|--------|
| T0 | Mobile horizontal scroll fix | #43 | ✅ merged, verified |
| T1+T6 | Detail-page richness + "You might also like" | #44 | ✅ merged, verified |
| T2 | Fuzzy search (pg_trgm) | #45 | ✅ merged, verified |
| T3 | Score heat indicator | #46 | ✅ merged, verified |
| T4 | Trends dashboard visuals | #47 | ✅ merged, verified |
| T5 | Reddit collector 403 fix | #48 | ✅ merged, **workflow run verified** |

T1 and T6 were combined into one PR (T6 explicitly extends T1, same files).

## What shipped

- **T0** — `globals.css`: clip `overflow-x` at both `html` + `body` with `max-width: 100%`. The prior body-only `overflow-x-clip` left the viewport scroll container free to propagate to `<html>`.
- **T1+T6** — breadcrumb (`Projects > {name}`), new `RelatedProjects` server component ("You might also like" / "猜你喜欢", up to 4 same-category mini-cards), localized graceful 404 (`not-found.tsx`), `getRelatedProjects()` + `RelatedProject` type, i18n keys. **AI summary already rendered correctly on prod** (verified `/projects/speakup`) — the reported bug was summary-less pages (only 150/4344 projects have a summary).
- **T2** — migration `0014_pg_trgm_search.sql` (**applied to prod**: `pg_trgm` + GIN trigram indexes), `GET /api/search?q=` (`searchProjects()`), debounced `ProjectSearch` client component with results dropdown.
- **T3** — coloured left border on `/projects` cards/rows keyed on GitHub stars (emerald ≥1000, amber ≥100).
- **T4** — `/trends`: CSS-only distribution bar chart, numbered Top-5 list, week-over-week comparison card. New `getRecentWeeklyTrends`, `getTrendCategoryDistribution`, `getTrendTopProducts`.
- **T5** — `fetchSubredditHot`: JSON on `old.reddit.com` (UA rotation, 403/429 retry) → **RSS fallback** (`parseRedditRss`). Verified on a real GitHub Actions run: **49 posts stored** where it previously 403'd entirely.

## Schema deviations (specs assumed columns that don't exist — see DECISIONS.md)

`app.project` has **no `stars`** (stars live in `raw.snapshot`, lateral-joined) and **no `quality_score`** column.
- T6 weighting `stars*0.7 + quality_score*0.3` → ordered by **stars desc**.
- T3 thresholds use **github_stars** instead of a 0–100 quality score.
- T2 search returns `stars` from snapshot, drops the nonexistent `score`.
- T4 "category distribution" falls back to `platform` (trend products are mostly unclassified HN/PH posts).

## Migrations applied

- `0014_pg_trgm_search.sql` — applied to prod (`wpleklpvjmzfhfqukwzz`) via Supabase. Idempotent (extension + indexes).

## Production verification (final)

`/`, `/projects`, `/trends`, `/youtube-insights`, `/feed/projects.xml`, `/projects/cloudflare-ai`, `/api/search?q=ai` → all **200**; unknown slug → **404**.

## Known limitations / follow-ups

- **Reddit RSS** carries no score/comment counts (stored as 0); GitHub cross-matching only works for link posts. A 3rd-subreddit RSS 429 can occur under rapid succession — increasing the inter-subreddit delay would smooth it.
- **Related projects / heat / search ranking** would all sharpen with a real project-level `quality_score` and `llm_category` backfilled beyond the current 87/4344.
