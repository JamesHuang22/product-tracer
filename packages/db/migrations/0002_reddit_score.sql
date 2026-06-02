-- =====================================================================
-- Product Tracer — Migration 0002: reddit_score metric column
-- =====================================================================
-- Adds a daily Reddit upvote-score column to app.project_metric, written by
-- the Reddit collector (raw post `score`). Distinct from the existing
-- `reddit_mentions` column (a future cross-post count), which is left as-is.
--
-- Apply via Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).
-- Idempotent — safe to re-run.
-- =====================================================================

alter table app.project_metric
  add column if not exists reddit_score integer;
