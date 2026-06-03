-- =====================================================================
-- Product Tracer — Migration 0003: allow project.status = 'noise'
-- =====================================================================
-- The data-quality pipeline (apps/worker/src/scripts/run-quality-check.ts)
-- demotes low-signal projects to status='noise'. The `app.project.status`
-- column already exists (added in 0001) but its CHECK only permits
-- ('active', 'dead') — widen it to include 'noise'.
--
-- Apply via Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).
-- Idempotent — safe to re-run.
-- =====================================================================

alter table app.project
  drop constraint if exists project_status_check;

alter table app.project
  add constraint project_status_check
  check (status in ('active', 'dead', 'noise'));
