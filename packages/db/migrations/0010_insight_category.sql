-- =====================================================================
-- Product Tracer — Migration 0010: video insight content category
-- =====================================================================
-- The YouTube Insights pipeline (apps/worker/src/scripts/youtube-insights.ts) now
-- classifies each video's *content* into one of a small fixed set of categories —
-- ai_ml, developer_tools, startup_business, tech_news, hardware, security, design,
-- other — derived from the summary itself (not the title). This adds the column +
-- a filtering index.
--
-- Existing rows get category = NULL until the daily pipeline re-analyses them: the
-- script now treats a row as "done" only when both key_insight_zh AND category are
-- present, so pre-category rows within the latest-N fetch window are re-processed
-- and upserted with their category (bounded by MAX_INSIGHTS_PER_RUN).
--
-- Apply via Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).
-- Idempotent — safe to re-run.
-- =====================================================================

alter table app.video_insight
  add column if not exists category text;

create index if not exists idx_video_insight_category on app.video_insight(category);
