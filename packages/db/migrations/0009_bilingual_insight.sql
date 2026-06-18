-- =====================================================================
-- Product Tracer — Migration 0009: bilingual video insight summaries
-- =====================================================================
-- The YouTube Insights pipeline (apps/worker/src/scripts/youtube-insights.ts) now
-- writes a 2–4 sentence news-digest summary in BOTH English (key_insight) and
-- Mandarin Chinese (key_insight_zh) per video, instead of a single English
-- sentence. This adds the Chinese column; key_insight is already `text` (no
-- length limit) so no type change is needed — the alter below is a harmless
-- idempotent no-op kept for parity with the request.
--
-- Existing rows keep their English key_insight and get key_insight_zh = NULL until
-- the daily pipeline re-analyses them (it now re-processes rows whose
-- key_insight_zh is null, within the latest-N fetch window, and upserts both
-- languages).
--
-- Apply via Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).
-- Idempotent — safe to re-run.
-- =====================================================================

alter table app.video_insight
  add column if not exists key_insight_zh text;

-- key_insight is already unbounded `text`; assert it explicitly (no-op if so).
alter table app.video_insight
  alter column key_insight type text;
