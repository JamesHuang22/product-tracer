# Decisions — Product Tracer

> Permanent record of architectural, process, and product decisions.
> Each entry: date, decision, rationale, alternatives considered.

## 2026-06-22 — Reddit collector: JSON→RSS fallback (403 fix)

**Decision**: `fetchSubredditHot` now tries the JSON endpoint on `old.reddit.com` first (rotating a pool of realistic browser User-Agents across up to 3 attempts, retrying 403/429 with backoff), and **falls back to parsing the Atom RSS feed** (`www.reddit.com/r/{sub}/hot/.rss`) when JSON stays blocked. New `REDDIT_HOST` env override; `parseRedditRss()` extracts id/title/timestamp/subreddit and the submitted URL from the entry's `[link]` anchor.

**Rationale**: Reddit now 403s the `.json` endpoint from essentially all datacenter IPs (GitHub Actions runners) **and** my local residential IP, regardless of UA — verified via Node `fetch` and curl against `www`, `old`, and `oauth` hosts and several path variants (all 403/429). The RSS feed, however, returns 200 with full entries from the same client (verified). RSS is the only anonymous path that still works, so it's the reliable fallback. JSON is kept as the preferred first attempt because, where reachable, it carries richer data (scores, comment counts, external URLs).

**Tradeoff**: RSS carries no `score`/`num_comments` (stored as 0) and, for self-posts, no body text. GitHub cross-matching still works for link posts via the `[link]` URL. This is a deliberate data-richness-for-availability trade — a Reddit-only project record with 0 score beats a 403 and no data.

**Alternatives considered**: (1) JSON-only with UA rotation per the request's Option 1 — rejected, verified still 403 everywhere reachable from here; (2) OAuth via a registered app — blocked by Reddit's "Responsible Builder Policy"; (3) mark the collector "requires manual deploy" (request's Option 3) — unnecessary now that RSS works.

---

## 2026-06-22 — Feature sprint adapted to the real app.project schema

**Decision**: Several sprint specs assumed columns that don't exist on `app.project` (verified against the live schema): there is **no `stars` column** (GitHub stars live in `raw.snapshot`, read via a lateral join) and **no `quality_score` column**. Adaptations: related-projects + search return stars from `raw.snapshot`; the T6 "you might also like" weighting (`stars*0.7 + quality_score*0.3`) collapses to **stars desc**; the T3 heat indicator keys on `github_stars` thresholds (≥1000 emerald / ≥100 amber) instead of a 0–100 quality score; the T4 trend "category distribution" buckets by `llm_category` but falls back to `platform` because trend `top_products` are mostly unclassified HN/PH posts.

**Rationale**: Build against the schema that exists rather than block on missing columns. Stars are the quality proxy already surfaced everywhere in the UI, so they're the natural substitute. Each substitution preserves the feature's user-facing intent.

**Also**: T1's "AI summaries don't render" was a false alarm — the rendering chain is correct and summaries show on production (verified on `/projects/speakup`); only 150/4344 projects currently have a summary, so most detail pages legitimately show none.

---

## 2026-06-21 — AI project summaries: NULL column as work queue

**Decision**: `app.project.ai_summary` (migration 0013, nullable text) holds an LLM-written 2-3 sentence summary per project. The backfill script (`generate-summaries.ts`) selects `where ai_summary is null limit 50` each run, summarises with one plain `callLlm` per project (prose, not JSON; `maxTokens: 150`), and updates the row. Daily cron at 04:00 UTC; batch size overridable via `SUMMARY_BATCH`.

**Rationale**: With ~4k projects, summarising everything in one shot is slow and costly and risks the workflow timeout. Using the `ai_summary IS NULL` predicate as *both* the work queue and the done-marker makes the job idempotent and resumable with zero extra bookkeeping — each daily run advances the frontier, re-running is safe, and new projects are picked up automatically once collected. No separate status column or job table needed.

**Convention divergence from the request**: the requested workflow used `npm i -g pnpm` + `pnpm build` + `pnpm worker generate-summaries`. Followed the repo's established pattern instead (`pnpm/action-setup`, `pnpm install --frozen-lockfile`, `pnpm --filter @product-tracer/worker summaries:generate`) — there is no root `pnpm worker` command, and `tsx` runs the script directly without a build step.

**Alternatives considered**: (1) summarise inline during collection — rejected, couples LLM cost/latency to every collector run and can't backfill existing rows; (2) a dedicated job-queue table — rejected, the NULL predicate already gives queue semantics for free.

---

## 2026-06-20 — Weekly Hot Trends pipeline (one upserted row per ISO week)

**Decision**: A new worker script (`weekly-trend.ts`, migration 0012 → `app.weekly_trend`) aggregates the trailing 7 days — new projects, the top-10 projects by signal activity, and the top-20 video insights with `relevance_score ≥ 6` — into a compact prompt, then asks DeepSeek for `{summary_en, summary_zh, emerging_themes[], video_highlights}`. The result is **upserted keyed on `week_start = date_trunc('week', now())`** so a re-run for the same week overwrites in place rather than duplicating. Corpus totals (`total_*`) come from separate `count(*)` queries, independent of the LIMITed prompt slices. Runs Mondays 04:00 UTC + on-demand `workflow_dispatch`.

**Rationale**: The `/trends` page (PR #29) shipped with no data source. One row per week with a stable unique key makes the page a trivial "latest row" read and makes the job safely idempotent/re-runnable. Used the raw `callLlm` + manual zod-parse (the `youtube-insights.ts` pattern) rather than `callLlmJson`, because the latter discards `usage` and we want `llm_prompt_tokens`/`llm_completion_tokens` persisted for cost accounting. Graceful no-op when `LLM_API_KEY` is unset, mirroring the collectors and `llm-classify.ts`.

**Type-mismatch fix**: applying 0012 exposed a latent bug in `getLatestWeeklyTrend()` — it coalesced `emerging_themes` (`text[]`) against `'[]'::jsonb`, which Postgres rejects with `42804`. That code isn't `42P01`/`42703`, so the empty-state try/catch let it 500. Fixed by coalescing against the `text[]` empty literal `'{}'`, which postgres.js parses into a JS `string[]`.

**Alternatives considered**: (1) append-only history table — rejected, the page only needs the latest and an upsert keeps re-runs clean while still allowing a future history read by `week_start`; (2) `callLlmJson` — rejected, drops token usage.

---

## 2026-06-19 — LLM-based dedup with cheap candidate generation

**Decision**: Dedup runs in two stages — cheap deterministic _candidate generation_ (group active rows by normalised primary_url / name key for projects, normalised video_title key for insights, pair within each group) followed by an _LLM confirmation_ (one DeepSeek call per pair → `{is_duplicate, confidence, reason}`). Confirmed pairs (confidence ≥ 0.8) are merged; 0.5–0.8 are flagged `dedup_status='duplicate_candidate'` for human review; below that, left alone. Migration 0011 adds `merged_into_id` + `dedup_status` to both `app.project` and `app.video_insight`. Daily at 03:00 UTC.

**Rationale**: Sending every O(n²) pair to the LLM is wasteful and unbounded. Normalised-key grouping turns it into a handful of genuine candidates, and the LLM only adjudicates the ambiguous ones a string-compare can't (same product, different name/URL). Soft-delete via `dedup_status='merged'` + `merged_into_id` (rather than a hard DELETE) keeps the merge auditable and reversible, and the project merge re-points `identity_link` + `raw.snapshot` to the keeper so no cross-platform evidence or engagement history is lost. The global `unique(platform, external_id)` on `identity_link` guarantees the two projects never share a link, so re-pointing is a plain UPDATE with no collision handling.

**Keeper choice**: the project with more `identity_link` rows wins (more cross-platform corroboration), tie-broken by the older `created_at`; insights keep the older row. A `DEDUP_MAX_PAIRS` cap (default 80) bounds LLM cost (~$0.001/pair → cents/day).

**Alternatives considered**: (1) embedding similarity + threshold — more infra (pgvector queries, tuning) for what a keyed group + one cheap LLM call already covers at this scale; (2) hard-delete duplicates — rejected, irreversible and loses history.

---

## 2026-06-18 — Content category on video insights

**Decision**: The YouTube Insights LLM now also classifies each video into exactly one of a fixed 8-category set — `ai_ml`, `developer_tools`, `startup_business`, `tech_news`, `hardware`, `security`, `design`, `other` — stored in `app.video_insight.category` (migration 0010). It's part of the same DeepSeek call as the rest of the insight (no extra request), classified from the generated summary content rather than the video title. Unknown/missing values collapse to `other` (zod `enum().catch('other')`).

**Rationale**: A flat list of insights isn't browsable; a small, fixed category vocabulary gives the frontend a cheap, reliable filter without a second model call or a separate classification pass. Reusing the snake_case enum convention from the classification pipeline keeps category values consistent across the app.

**Backfill**: the insert is already an upsert, but the pipeline dedupes "done" videos before analysis — so the dedupe predicate was widened from "has `key_insight_zh`" to "has `key_insight_zh` AND `category`". Pre-category rows within the latest-N fetch window are thus re-analysed and upserted with a category, bounded by `MAX_INSIGHTS_PER_RUN`. (Same adaptation as the bilingual upgrade — a bare upsert alone wouldn't reach already-seen rows.)

---

## 2026-06-17 — Bilingual video insights + upsert on re-analysis

**Decision**: The YouTube Insights LLM now returns a 2–4 sentence news-digest paragraph in both English (`key_insight`) and Mandarin (`key_insight_zh`) per video. The `app.video_insight` insert became an **upsert** (`on conflict (video_id) do update`), and the dedupe key changed from "row exists" to "row has `key_insight_zh`".

**Rationale**: A single English sentence is too thin for a reader deciding whether to watch, and the audience includes Chinese indie devs — so one DeepSeek call produces both languages at once (no separate translation pass, no extra provider call). The upsert + `key_insight_zh IS NULL` dedupe means rows created before this change get backfilled the next time the daily run sees them, without a one-off migration script; `MAX_INSIGHTS_PER_RUN` and the latest-N fetch window bound the backfill so there's no cost spike.

**Why one bilingual call vs. translate-after**: DeepSeek is strongly bilingual EN+ZH, so asking for both paragraphs in the same JSON response is cheaper and keeps the two versions semantically aligned (a translation pass can drift). Both summaries are required (zod `min(1)`) — a response missing either is a failed analysis and is retried, never stored half-done.

**Trade-off**: re-analysing pre-upgrade rows re-spends tokens on videos already seen, but only those still inside the latest-N fetch window are reachable, so the backfill is naturally small and self-limiting.

---

## 2026-06-16 — YouTube Insights frontend surface (PR #21)

**Decision**: Surface `app.video_insight` as a dedicated `/youtube-insights` page with **server-side pagination** (`?page=`, 12/page via `getVideoInsights(limit, offset)` + `getVideoInsightCount()`), plus a home "Latest video insights" strip showing the top 3 with `relevance_score >= 7`.

**Rationale**: Insight rows are richer and potentially far more numerous than projects (one per analysed video, growing daily), so loading the full set client-side — as `/projects` does with TanStack — doesn't scale. Server-side `limit/offset` keeps each request bounded and the page `force-dynamic` so it always reflects the latest analysis run. The home strip filters to `relevance_score >= 7` so only high-signal videos get prime placement.

**Alternatives considered**: (1) reuse the `/projects` client-side TanStack table — rejected, it would ship the entire insight set to the browser; (2) infinite scroll — rejected for now, a simple Prev/Next pager matches the existing `/projects` pager UX with no extra client state.

---

## 2026-06-16 — YouTube Insights pipeline (video as a first-class entity)

**Decision**: Add a second YouTube pipeline (`youtube-insights.ts` → `app.video_insight`) that runs a DeepSeek LLM pass over each _new_ subscription video and stores structured insight (trends, topics, tools_mentioned, sentiment, key_insight, relevance_score 1–10). It is separate from the existing collector, which only mines descriptions for GitHub repos → `app.project`.

**Rationale**: The collector throws away most of a video's signal — it only cares about repo links. The user wants the _content_ itself (what's trending, which tools are discussed, the takeaway) as a frontend-surfaceable entity, which a rule-based scraper can't produce. DeepSeek is already wired in (`callLlm`, JSON mode) and is cheap (~$0.0005/video), so per-video LLM analysis is affordable. Idempotency is enforced by a unique `video_id` and a `MAX_INSIGHTS_PER_RUN` cap so the first-run backlog can't blow up cost.

**Why DeepSeek for video analysis**: same provider as the classification pipeline — one OpenAI-compatible client, one `LLM_API_KEY` secret, $0.14/$0.28 per 1M in/out tokens, JSON mode. No reason to add a second provider.

**OAuth note**: `GOOGLE_REFRESH_TOKEN` was revoked (`invalid_grant`). Re-minting requires manual consent, so `scripts/youtube-reauth.sh` walks James through the flow rather than trying (and failing) to automate it. Both YouTube workflows share the same refresh-token → access-token step.

**Alternatives considered**: (1) extend the collector in-place — rejected, it would entangle two different concerns (project-mining vs. content-insight) and two storage shapes; (2) batch multiple videos per LLM call — rejected for now, per-video calls keep the raw response cleanly attributable and the richer schema reliable.

---

## 2026-06-15 — PR-based deployment workflow

**Decision**: Every code change (frontend AND backend) must go through PR → CI/Vercel passes → merge → verify production.

**Rationale**: Vercel Hobby Plan has no rollback; one bad push can take the entire site down. The PR gate ensures preview deployments catch build/runtime errors before they hit production.

**Alternatives considered**: Direct push to main (rejected after Vercel 500 crisis).

---

## 2026-06-15 — Git identity for Vercel compatibility

**Decision**: All commits authored as `JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>`.

**Rationale**: Vercel Hobby Plan only allows deployments from commits by authorized users. External agent commits (authored as CS436finalProject) were blocked.

**Alternatives**: Vercel Pro ($20/mo to add collaborators — not worth it yet).

---

## 2026-06-14 — Session pooler over Transaction pooler

**Decision**: Use Supabase session pooler (`:5432`) instead of transaction pooler (`:6543`) for Vercel serverless.

**Rationale**: Transaction pooler on Supabase free tier has unreliable connection management. After 27 days of idle, pooled connections timed out on every query including `SELECT 1`. Session pooler works reliably.

**Alternatives**: PgBouncer config tuning, connection pooling middleware (would have delayed the fix).

---

## 2026-06-15 — DeepSeek for LLM tasks

**Decision**: Use DeepSeek `deepseek-chat` for classification and AI features.

**Rationale**: Cheapest viable option ($0.14/$0.28 per 1M tokens), strong bilingual EN+ZH, OpenAI-compatible API no SDK needed, JSON mode available.

**Alternatives**: Claude Haiku 4.5 (~$1/$5 per 1M, better but 7× cost), GPT-4o mini (~$0.15/$0.60, competitive), local Ollama (zero cost but no GPU in CI).

---

## 2026-06-10 — Reddit no-OAuth refactor

**Decision**: Use public JSON API (`/r/{sub}/hot.json`) instead of OAuth for Reddit.

**Rationale**: User unable to create Reddit script app due to "Responsible Developer Policy" restrictions. Public endpoint works for read-only top/hot listings.

**Trade-off**: No auth means lower rate limits and may 403 from GitHub Actions IPs.

---

## 2026-05 — LLM over Rule-only classification

**Decision**: Two-tier classification: rule-based for clear good/noise, LLM for gray zone (score 15-39).

**Rationale**: Rules catch 80%+ at zero cost. LLM on 15-39 band costs <$0.02/day and catches edge cases. Combined accuracy > either alone.

---

## Early 2026 — pnpm monorepo

**Decision**: pnpm workspace over npm/turborepo/nx.

**Rationale**: pnpm is the de facto standard for monorepos today. NPM workspaces lack features (no content-addressable store), Turborepo/NX add complexity without benefit at this scale.

---

## Early 2026 — Supabase over raw Postgres

**Decision**: Supabase (hosted Postgres + managed auth + dashboard) over self-hosted or RDS.

**Rationale**: Free tier is generous, manages backups/extensions/pgbouncer, includes project dashboard. `pgvector` support out of box (needed for embeddings). No DevOps overhead.

---

## Early 2026 — Next.js + App Router

**Decision**: Next.js 15 App Router over Remix/CRA/Vite+ReactRouter.

**Rationale**: Best server component + streaming support. Vercel native deployment. i18n via React Context (simple, no next-intl bloat). Tailwind + shadcn for zero-design CSS.
