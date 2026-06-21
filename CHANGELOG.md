# Changelog

> Auto-generated summary of notable changes to product-tracer.
> Format: Keep a Changelog — date, PR/commit, type, description.

## 2026-06-21

- **fix(web)**: tighten EN-mode CJK suppression to catch mixed-language one-liners. The earlier 20%-CJK threshold let mostly-English one-liners with a few Chinese tokens through, leaking ~19 stray CJK chars into `/projects` EN. `localizedText`/`localizedPair` now drop a one-liner / English-column value on *any* CJK character (replacing `cjkShare` with a simple `hasCjk`), so the only CJK left in EN mode is genuine product names
- **fix(web)**: `/youtube-insights?view=grid` now lays out four columns on large screens instead of two. The grid was capped at `sm:grid-cols-2`; added an `lg:grid-cols-4` step and widened the page container to `max-w-6xl` in grid view (list view keeps its `max-w-3xl` reading width)
- **fix(web)**: strip Chinese `one_liner`/insight content from the serialized RSC payload server-side on `/` and `/projects`. The client-side suppression hid Chinese from the *rendered* UI, but the home and projects pages hand their data to client components, so every row's one-liner (incl. the 4153-row projects list) still rode along in the page *source*. Now nulled out per request locale in the server components — `router.refresh()` on locale toggle re-runs them, so Chinese mode is unaffected. Page source CJK on `/projects` EN dropped from ~6.5k to names-only
- **fix(web)**: English mode no longer leaks Chinese data content. Some single-column text fields hold Chinese even in EN — project `one_liner` (203 rows) and the nominally-English `key_insight` (12 rows) — which rendered verbatim regardless of locale. New `cjkShare`/`localizedText`/`localizedPair` helpers in `lib/format.ts` suppress predominantly-CJK text in EN mode (no English alternative exists) and stop the bilingual insight fields from falling back across languages. Applied to the home Latest-activity cards + insight strip, `/projects` table (desktop + mobile), and `/youtube-insights` digest cards. Product **names** (the one place CJK is expected in EN) are untouched
- **fix(web)**: `/projects` rows now link to the internal `/projects/[slug]` detail page for every project instead of sending GitHub rows straight to github.com — the list had zero internal project links (top-by-stars rows are all GitHub). The detail page still carries a "Visit site" button out to the original URL, so external access is preserved

## 2026-06-20

- **fix(worker)**: weekly-trend `top_products` now matches the `/trends` page contract (`{name, slug, platform, description, score}`). It previously wrote `{slug, name, one_liner, primary_url, signal_count}`, so once a row existed the page 500'd in `PlatformBadge` (`platform.slice` on `undefined`). `platform` is now the snake_case badge key (`github`/`hacker_news`/…)
- **PR #30** — feat(worker): Weekly Hot Trends pipeline — backs the `/trends` page (PR #29). Migration 0012 adds `app.weekly_trend`; `weekly-trend.ts` scans the trailing 7 days (new projects, per-project signal activity, video insights ≥ relevance 6), asks DeepSeek for a bilingual EN+ZH overview + emerging themes + video highlights, and upserts one row per ISO week (keyed on `week_start`). New `Weekly Hot Trends` workflow at 04:00 UTC Mondays + manual dispatch. Token usage stored via raw `callLlm` (not `callLlmJson`, which drops `usage`)
- **fix(web)**: `/trends` no longer 500s once migration 0012 lands — `getLatestWeeklyTrend()` coalesced `emerging_themes` (a `text[]`) against `'[]'::jsonb`, a `42804` type mismatch the empty-state try/catch didn't cover (it only caught `42P01`/`42703`). Coalesce against the `text[]` empty literal `'{}'` instead

## 2026-06-19

- **PR #29** — feat(web): new `/trends` Weekly Hot Trends page (summary, top products, emerging themes, video highlights, totals) over `app.weekly_trend` with an empty state that degrades gracefully until migration 0012 lands; adds a "Trends" nav link; trims the home page's RSC payload to a single locale per insight so page source no longer carries both languages
- **feat(worker)**: dedup pipeline — daily LLM (DeepSeek) pass that finds near-duplicate projects and video insights, confirms each candidate pair, and merges confirmed ones into a keeper (re-pointing identity_links + snapshots); medium-confidence pairs are flagged `duplicate_candidate`. Migration 0011 adds `merged_into_id` / `dedup_status`; new `Dedup` workflow at 03:00 UTC

## 2026-06-18

- **PR #27** — feat(web): YouTube Insights gains a List/Grid view toggle (`?view=`), 20-per-page pagination (`?page=`), and a category filter dropdown (`?category=`, the 8 `category` values with live counts); insight cards drop the trends/topics line and gain a muted category badge. Reads `category` defensively (`to_jsonb`) so it degrades to NULL until migration 0010 is live
- **feat(worker)**: YouTube Insights — content `category`. LLM now classifies each insight into one of ai_ml / developer_tools / startup_business / tech_news / hardware / security / design / other (by the summary content, not the title); migration 0010 adds the column + index; dedupe now requires `category` too, so pre-category rows backfill on re-analysis
- **PR #25** — feat(web): YouTube Insights are now locale-aware — `/youtube-insights` and the home strip show a single paragraph in the active language (en→`key_insight`, zh→`key_insight_zh`) instead of both, with fallback to the other language. Renames the page + home headings to "Latest insights" (最新洞察) and the subtitle to "Insights come from up to date trends." (洞察来自最新趋势。)

## 2026-06-17

- **fix(worker)**: YouTube Insights prompt — summaries now open with the substance; the LLM is told never to start with "This video"/"本视频"-style preamble (reads as a news digest, not a video description)
- **PR #23** — feat(web): bilingual news-digest redesign of YouTube Insights — `/youtube-insights` and the home strip now render the English `key_insight` over its Chinese `key_insight_zh` translation (text-only, no thumbnails/pagination); sentiment dot, 🔥 for relevance ≥ 7, Trends/Topics meta. Reads `key_insight_zh` defensively (`to_jsonb`) so it degrades to NULL until migration 0009 is live
- **feat(worker)**: YouTube Insights — bilingual digest summaries. LLM now writes a 2–4 sentence news-digest paragraph in both English (`key_insight`) and Mandarin (`key_insight_zh`); migration 0009 adds `key_insight_zh`; insert is now an upsert so pre-upgrade rows get backfilled on re-analysis

## 2026-06-16

- **PR #21** — feat(web): YouTube Insights page (`/youtube-insights`) — paginated list of analysed videos (thumbnail, relevance score, sentiment, key insight, trend/topic pills) over `app.video_insight`; adds an "Insights" nav link and a home "Latest video insights" strip (top 3 with relevance ≥ 7)
- **feat(worker)**: YouTube Insights pipeline — LLM (DeepSeek) extracts trends/topics/tools/sentiment/key-insight/relevance per new video into `app.video_insight` (migration 0008, daily 05:00 UTC); adds `scripts/youtube-reauth.sh` to re-mint a revoked `GOOGLE_REFRESH_TOKEN`
- **PR #19** — feat(web): drop detail one-liner, format ai/ml category as AI/ML
- **PR #18** — feat(web): surface LLM classification — category filter & badges
- **chore**: Git identity globally set to JamesHuang22 (fix Vercel block on new commits)
- **feat(worker)**: LLM classification pipeline for gray-zone projects (migration 0007, DeepSeek, daily 06:30 UTC)
- **fix(web)**: lazily construct postgres client (bundle size fix)
- **ops**: redeploy with DATABASE_URL=session-pooler(5432) + .node-version
- **PR #17** — feat(web): redesign landing page for 4 sources, remove Reddit/X from UI

## 2026-06-12~15

- **ops**: Vercel Git integration repaired, Node 22 pinned, DATABASE_URL fixed
- **chore**: Redeploy with project-owner commit author to unblock Vercel

## 2026-06-11

- **fix**: postgres connection pool settings for Vercel serverless (max_lifetime, idle_timeout, connect_timeout)
- **fix**: cache postgres connection in globalThis for Vercel serverless

## 2026-06-10

- **feat(worker)**: YouTube collector (OAuth + API key, 3 channels scanned, migration 0005)
- **feat(worker)**: X/Twitter collector via agent-twitter-client
- **feat(worker)**: Reddit no-OAuth refactor (public JSON API)
- **feat(worker)**: Signal/Trending engine (migration 0006, 7 signal types, daily 07:00 UTC)
- **feat(web)**: Homepage redesign — stats bar (Total/Active/New/Hot) + Latest Activity section
- **feat(web)**: Reddit/X "Coming Soon" removed from homepage

## ~2026-06-08

- **feat(web)**: /projects pagination (10/50/100 + jump-to-page)
- **feat(web)**: EN/中文 bilingual UI (i18n React Context)
- **feat(web)**: HN/PH project detail pages with sparkline trends
- **docs**: AI integration research, X/Twitter collector research
- **quality**: Rule-based data quality pipeline (migration 0003)

## ~2026-05-25

- **feat(worker)**: GitHub, HN, PH collectors running
- **feat(web)**: Home page with live data (platform sections)
- **setup**: pnpm monorepo scaffold, Supabase DB, Vercel deploy
- **setup**: Gmail OAuth, Portfolio briefing script
