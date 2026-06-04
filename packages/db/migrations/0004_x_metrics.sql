-- =====================================================================
-- Product Tracer — Migration 0004: X (Twitter) metric columns
-- =====================================================================
-- The X collector (apps/worker/src/scripts/collect-x.ts) writes per-day
-- engagement for tweets it attributes to a project. Add the columns it upserts.
--
-- raw.snapshot and app.identity_link already allow platform='x' (migration
-- 0001's CHECK constraints include it), so only app.project_metric needs new
-- columns here.
--
-- Apply via Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).
-- Idempotent — safe to re-run.
-- =====================================================================

alter table app.project_metric
  add column if not exists x_likes    integer,
  add column if not exists x_retweets integer,
  add column if not exists x_replies  integer;
