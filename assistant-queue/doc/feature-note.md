# Product Tracer — Feature Status

*Last updated: 2026-06-23 21:15 PDT*

## ✅ Day 2 Sprint — All Tasks Complete (PRs #43–#64)

### Full Feature Sprint (T0–T6) — PRs #43–#48
- **T0** — Mobile horizontal scroll fix (`overflow-x: clip` on `html` + `body`)
- **T1+T6** — Detail page richness + "You might also like" (breadcrumb, related projects, AI summary block, graceful 404)
- **T2** — Fuzzy search (pg_trgm, `GET /api/search`, debounced dropdown)
- **T3** — Score heat indicator (colored left border by GitHub stars)
- **T4** — Trends dashboard (bar chart, top-5 list, week-over-week comparison)
- **T5** — Reddit collector 403 fix (JSON → RSS fallback with UA rotation)

**Migrations**: `0014_pg_trgm_search.sql` applied.

### U1 — Bookmarks / Save Projects (PR #50)
- localStorage-only, no auth needed
- `BookmarkButton` on `/projects` rows/cards + detail page
- `/bookmarks` page with live card removal
- Nav link with i18n (EN/ZH)

### U2 — Backfill AI Summaries (PR #55)
- **150 → 4,537 projects** (~99.7% coverage)
- ~$0.15 DeepSeek tokens, ~28 min
- Added `SUMMARY_CONCURRENCY` (shared-cursor worker pool)

### U3 — Backfill llm_category (PR #52, #53)
- **1.2% → 99.8%** (~150 → 4,490 classified)
- ~$0.11 DeepSeek tokens
- Added `LLM_CLASSIFY_ALL=1` mode with chunking

### U4 — AI Granular Tags (PR #57)
- Migration `0015_granular_tags.sql`: `app.project.tags text[]` + GIN index
- `generate-tags.ts` worker (3–5 tags/project)
- **3,953/3,953 active projects tagged** (~$0.13, ~12 min)
- `TagChips` component, `?tag=` client-side filter

### U5 — YouTube OG Image (PR #60)
- Dynamic 1200×630 OG card at `/og/youtube-insights`
- Open Graph / Twitter `summary_large_image` metadata
- `metadataBase` in root layout

### U6 — Insight Multi-Select Filter (PR #59)
- Toggle chips replacing single-category dropdown
- URL state: `?category=a,b,c`
- `= any(...)` DB query

### Production Incident — Supabase Connection Pool Exhaustion
- Root-caused `EMAXCONNSESSION` (15-client session-pooler cap)
- Mitigated: pool `max` 2→1 (#62); transaction-pooler opt-in (#63/#64)
- Site stable under normal/light load
- **Operator action needed**: Raise Supabase session Pool Size or switch to transaction pooler (`:6543`)

## ⏳ Open (requires operator action)

1. **Supabase connection pool** — raise Pool Size or verify `:6543` transaction pooler works
2. **Project-level `quality_score`** — 0–100 column for better heat/recommendation ranking
3. **Reddit collector hardening** — longer inter-subreddit delay, OAuth for score data
4. **Minor UI** — `favicon.ico` 404, homepage H1 spacing

---

## 🎯 Day 2 Sprint Complete (2026-06-23 21:45 PDT)

All 6 U-tasks shipped and production-verified. See RESPONSE.md and FRONTEND_RESPONSE.md for full details.
