-- =====================================================================
-- Product Tracer — Migration 0005: allow platform='youtube'
-- =====================================================================
-- The YouTube collector (apps/worker/src/scripts/collect-youtube.ts) writes
-- app.identity_link and raw.snapshot rows with platform='youtube'. Migration
-- 0001's CHECK constraints only allow github/product_hunt/hacker_news/reddit/x,
-- so those inserts would be rejected without this. Widen both constraints.
--
-- No new metric columns: YouTube engagement (views/likes) lands in
-- raw.snapshot (upvotes=views, comments=likes) and raw_data, which is enough
-- for the frontend's platform views.
--
-- Apply via Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).
-- Idempotent — safe to re-run.
-- =====================================================================

alter table app.identity_link
  drop constraint if exists identity_link_platform_check;
alter table app.identity_link
  add constraint identity_link_platform_check
  check (platform in ('github', 'product_hunt', 'hacker_news', 'reddit', 'x', 'youtube'));

alter table raw.snapshot
  drop constraint if exists snapshot_platform_check;
alter table raw.snapshot
  add constraint snapshot_platform_check
  check (platform in ('github', 'product_hunt', 'hacker_news', 'reddit', 'x', 'youtube'));
