# Decisions — Product Tracer

> Permanent record of architectural, process, and product decisions.
> Each entry: date, decision, rationale, alternatives considered.

## 2026-06-27 — User auth & account-synced bookmarks

**Auth provider — Supabase Auth via `@supabase/ssr`.** The user asked to "leverage Supabase," which already backs the data layer. `@supabase/ssr` is the documented App-Router pattern (cookie-based sessions + middleware refresh). *Alternative considered:* rolling our own auth on the existing postgres.js connection (bcrypt + JWT) — rejected: reinvents a security-critical surface and ignores the explicit ask. Email/password chosen as the universal, self-contained method (no email-deliverability dependency to *log in*); OAuth (GitHub/Google) can be layered on the same callback later.

**Bookmark storage — DB for members, localStorage for guests, with one-time merge.** Rather than force sign-in for bookmarks (regression for anonymous users) or keep everything client-only (no cross-device sync), bookmarks are dual-mode behind one `BookmarksProvider` so the `useBookmark`/`useBookmarks` hook signatures are unchanged. On first login the guest's localStorage set is POSTed to `/api/bookmarks/merge` (idempotent), then cleared locally. Toggles for members are optimistic with server reconciliation + revert-on-error.

**Data access path — postgres.js, not PostREST.** `app.bookmark` is read/written through the existing server-side postgres.js connection (consistent with the rest of `app`/`raw`, which aren't on PostgREST's exposed-schema allow-list), always scoping by the **session-verified** `user.id` from `supabase.auth.getUser()`. RLS (own-rows-only) is still enabled as defense-in-depth in case the table is ever reached via the anon/authenticated PostgREST role. *Note:* `app.weekly_trend` remains RLS-disabled (pre-existing; flagged by the Supabase advisor) — out of scope here, surfaced to the operator.

**Graceful degradation.** Every auth entry point guards on `isSupabaseConfigured()`; with the public env vars absent the middleware no-ops, `getUser()` returns null, `/login` shows a notice, and bookmarks stay on localStorage. This keeps `next build` and all routes green in preview/fork environments that lack the keys, so the HTTP-200 verification never depends on auth being configured.

## 2026-06-24 — Phase 2: empty-insight fix, historic trends, collector quality

**Empty insight card (Task 1)** — The bug's real cause was an insight whose `key_insight` ("English") column actually held Chinese; in EN mode `localizedPair` correctly suppresses it (→ null) but the card rendered anyway. **Decision**: drop any insight with no displayable text in the active locale rather than fall back to the other language. The spec suggested EN→ZH fallback, but that conflicts with the established CJK-suppression rule (no Chinese in the EN UI), so a textless EN card is **skipped**, not back-filled with Chinese. Defence in depth: query guard (skip rows empty in both languages) + page-level filter (fetch a buffer of 8, drop empties, slice to 3 so the strip stays full) + a client-side `InsightCard` null-return for locale switches.

**Historic trends (Task 2)** — Generalised the existing single-week trend queries with an optional `weekStart` (defaulting to latest) instead of adding parallel "by-week" functions, and validated the `?week=` param against the real week list (`getTrendWeeks()`) so a stale/garbage value falls back to latest. The WoW "last week" is the immediately-preceding entry in the week list, not a fixed `getRecentWeeklyTrends(2)`, so the comparison stays correct for any selected week.

**Collector quality (Task 3)** — `open_prs_count` and `recent_commits_30d` aren't on the GitHub repo object, so they need extra API calls (PR count via the rate-limited search API). **Decision**: make enrichment **bounded best-effort** — ≤40 repos/run, each field swallowed to null on any failure/rate-limit, and `coalesce`d on upsert so a non-enriching run never erases a prior value. Coverage accretes across runs rather than risking a rate-limit storm that breaks the whole collector. Freshness filter (skip repos unpushed >6mo unless >1000 stars) is applied to **discovery only**, not to re-snapshots of already-tracked repos (those still get their metrics refreshed). Dedup's stricter gate (same `llm_category` OR Dice name-similarity > 0.8) is applied to **name-key** candidate pairs only — URL-identical matches remain trusted as-is. Schedule bumped 4h→2h per the task; note this increases GitHub Actions usage (currently blocked by an account billing limit — see RESPONSE.md).

---

## 2026-06-23 — Granular tags: text[] + GIN, LLM-generated, tag links to /projects?tag (U4)

**Decision**: Added `app.project.tags text[]` (migration 0015, GIN-indexed) holding 3–5 LLM-generated lowercase tags per project, on top of the coarse `llm_category`. A new `generate-tags.ts` worker populates them; the frontend renders clickable `#tag` chips that link to `/projects?tag=<tag>`, where the existing projects table filters client-side. Applied the migration via Supabase MCP (user-authorized for this autonomous session) and backfilled all 3,953 active projects.

**Rationale**: One coarse category (9 buckets) is too blunt for discovery — "devtool" spans 1,465 projects. Tags add a finer, cross-cutting axis (language, runtime, domain, use-case) for browsing. Storing them as a Postgres `text[]` with a GIN index keeps `@>`/`&&` containment fast and avoids a join table for what is read-mostly, low-cardinality-per-row data. Reused the summary backfill's `batch`/`concurrency` worker-pool pattern so the ~4k backfill ran as monitored chunks within the Supabase connection ceiling (the U3 `EMAXCONNSESSION` lesson) — production stayed HTTP 200 throughout.

**Scope cut**: The spec also listed tag-based search in `/api/search`. Skipped — the `/projects?tag=` filter already delivers "click a tag → all projects with that tag", and the search endpoint is name-fuzzy (pg_trgm), a different concern. Can revisit if a dedicated tag-search surface is wanted.

**UI note**: Tag chips and the bookmark button are interactive siblings of the card/row link (raised with `relative z-10` above the link's full-bleed `::before` overlay) rather than nested inside the anchor — keeps valid HTML (no `<a>`-in-`<a>`) while the whole card stays a click target.

---

## 2026-06-23 — Backfill llm_category catalogue-wide via an opt-in ALL mode (U3)

**Decision**: Added `LLM_CLASSIFY_ALL=1` to `llm-classify.ts` — a one-off mode that classifies **every active unclassified project**, not just the gray zone (rule score 15–39) the daily run targets. Exposed via a `classify_all` + `limit` `workflow_dispatch` input. Backfilled the full catalogue in monitored chunks, lifting active-project category coverage from **1.2% to 99.8%** (~4,490 classified, ~$0.11).

**Rationale**: The rule classifier only ever assigns `llm_category` in the gray zone; confidently-scored projects (the vast majority) were left uncategorised, so every category-dependent feature (related projects, trends chart, `/projects` filter, search ranking) was effectively dead for ~99% of the catalogue. A plain re-trigger of the existing workflow could never fix this — it's gray-zone-only by design. The LLM is the intended final curator, so running it over the whole active set both assigns categories (the goal) and demotes genuine junk to `noise` (≈520 projects, a quality bonus).

**Tradeoff / incident**: The first unbounded ALL-mode run tripped Supabase **`EMAXCONNSESSION`** (pooler client-session limit) and intermittently 500'd the public site, which shares the same Supabase pooler. Root cause: the gray-zone code path eagerly reads *all* `raw.snapshot` + `app.identity_link` rows for thousands of project ids (two full scans) to recompute scores — unnecessary in ALL mode — and a long-lived run holds its pooled connections while site traffic and a concurrent Vercel redeploy compete for the same ceiling. **Fixes**: (1) ALL mode skips the snapshot/link reads entirely (one light read instead of three heavy ones); (2) `LLM_CLASSIFY_LIMIT` chunks the backfill into short runs that release connections on exit. After both, every chunk ran with production steady at HTTP 200.

**Alternatives considered**: (1) widening the gray zone — rejected, it conflates the daily-run's purpose with a one-off backfill; (2) raising the worker pool / Supabase connection ceiling — doesn't address the wasteful heavy reads and costs money; (3) a separate `classify-all.ts` script — rejected as duplicative; a guarded branch in the existing script keeps the prompt, parsing, and verdict-application logic in one place.

---

## 2026-06-23 — Bookmarks: localStorage-only, no auth (U1)

**Decision**: Project bookmarks are stored entirely in the browser's `localStorage` (one key, `pt:bookmarks`, holding a JSON array of slugs). No accounts, no DB table, no server-side persistence. The `/bookmarks` page reads the slug set on the client and rehydrates project data from a new read-only `GET /api/bookmarks?slugs=…` endpoint (`getProjectsBySlugs`, capped at 200 slugs).

**Rationale**: The app has no auth system, and bookmarks are a "give users a reason to return" convenience feature, not shared/critical data. localStorage delivers the entire feature with zero backend state, zero migration, and no PII. Same-tab reactivity is handled with a `CustomEvent` (the native `storage` event only fires in *other* tabs), so every mounted button and the list stay in sync instantly.

**Tradeoff**: Bookmarks don't sync across devices or survive a cleared browser. Acceptable for the feature's value tier; a future authed account model could migrate the local set up to the server.

**Alternatives considered**: (1) a DB-backed `bookmark` table keyed on an anonymous client id — rejected as over-engineered without auth and introducing PII/GDPR surface; (2) shipping the full project list to `/bookmarks` and filtering client-side (mirrors `/projects`) — rejected as wasteful (4k+ rows serialized to filter ~5); the targeted `getProjectsBySlugs` endpoint keeps the payload tiny.

---

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
