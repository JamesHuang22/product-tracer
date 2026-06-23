# Next request / backlog

> Previous sprint (T0–T6) completed 2026-06-23 — see RESPONSE.md / FRONTEND_RESPONSE.md.

## Done this sprint
- T0 mobile horizontal scroll · T1+T6 detail-page richness + recommendations · T2 fuzzy search (pg_trgm, migration 0014 applied) · T3 score heat · T4 trends visuals · T5 Reddit 403 fix (RSS fallback, verified on a live workflow run).

## Suggested follow-ups (not yet done)
1. **Project-level `quality_score`** — add a real 0–100 column (e.g. blended stars/recency/cross-platform signal). Would let T3 heat, T6 recommendation weighting, and search ranking use the intended `stars*0.7 + quality_score*0.3` formula instead of stars-only.
2. **Backfill `llm_category`** — only 87 / 4344 projects are classified, so most detail pages show no "You might also like" row and the trends chart falls back to platform. Run/extend `llm-classify` over the backlog.
3. **Reddit collector hardening** — RSS posts have score=0 (no engagement signal); a 3rd-subreddit RSS 429 occurs under rapid succession. Consider a longer inter-subreddit delay, or a proxy/OAuth path if Reddit ever reopens app registration, to recover score/comment counts.
4. **Generate more AI summaries** — coverage is ~3.5%; the daily 50/day cron will take months. Consider a one-off larger batch.
