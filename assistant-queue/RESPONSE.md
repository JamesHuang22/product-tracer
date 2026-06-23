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
