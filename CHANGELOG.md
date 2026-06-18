# Changelog

> Auto-generated summary of notable changes to product-tracer.
> Format: Keep a Changelog — date, PR/commit, type, description.

## 2026-06-17

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
