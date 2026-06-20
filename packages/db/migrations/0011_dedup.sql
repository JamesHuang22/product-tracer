-- =====================================================================
-- Product Tracer — Migration 0011: dedup support
-- =====================================================================
-- The dedup pipeline (apps/worker/src/scripts/dedup.ts) finds near-duplicate
-- rows that arise when the same product/insight is collected from several
-- sources, asks an LLM (DeepSeek) to confirm each candidate pair, and merges the
-- confirmed duplicates into a single keeper.
--
--   merged_into_id — when merged, points at the keeper row this was folded into
--   dedup_status   — 'active' (normal) | 'merged' (folded into merged_into_id) |
--                    'duplicate_candidate' (LLM unsure — flagged for human review)
--
-- `add column … default 'active'` backfills existing rows to 'active'. The merge
-- step re-points app.identity_link + raw.snapshot from the merged project to the
-- keeper, so no engagement history is lost.
--
-- Apply via Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).
-- Idempotent — safe to re-run.
-- =====================================================================

-- ---- app.project -----------------------------------------------------
alter table app.project
  add column if not exists merged_into_id uuid references app.project(id),
  add column if not exists dedup_status text default 'active';

alter table app.project
  drop constraint if exists project_dedup_status_check;
alter table app.project
  add constraint project_dedup_status_check
  check (dedup_status in ('active', 'merged', 'duplicate_candidate'));

-- ---- app.video_insight ----------------------------------------------
alter table app.video_insight
  add column if not exists merged_into_id uuid references app.video_insight(id),
  add column if not exists dedup_status text default 'active';

alter table app.video_insight
  drop constraint if exists video_insight_dedup_status_check;
alter table app.video_insight
  add constraint video_insight_dedup_status_check
  check (dedup_status in ('active', 'merged', 'duplicate_candidate'));

-- ---- scanning indexes (partial: only the candidate rows) -------------
create index if not exists idx_project_dedup_status
  on app.project(dedup_status) where dedup_status = 'duplicate_candidate';
create index if not exists idx_video_insight_dedup_status
  on app.video_insight(dedup_status) where dedup_status = 'duplicate_candidate';
