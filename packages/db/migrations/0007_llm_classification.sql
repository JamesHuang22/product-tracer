-- =====================================================================
-- Product Tracer — Migration 0007: LLM classification tracking
-- =====================================================================
-- The LLM classification pipeline (apps/worker/src/scripts/llm-classify.ts)
-- re-examines "gray zone" projects (rule-classifier score 15–39) with a
-- DeepSeek call and records the model's verdict. These additive columns make
-- the pass idempotent (skip anything already classified) and preserve the
-- LLM's opinion alongside the rule-based `status`.
--
--   llm_status        — model verdict: 'active' | 'noise'
--   llm_category      — model category (ai/ml, devtool, saas, …)
--   llm_confidence    — model self-rated confidence, 1–5
--   llm_classified_at — when the LLM last classified this project (null = never)
--
-- Apply via Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).
-- Idempotent — safe to re-run.
-- =====================================================================

alter table app.project
  add column if not exists llm_status        text,
  add column if not exists llm_category      text,
  add column if not exists llm_confidence    smallint,
  add column if not exists llm_classified_at timestamptz;

-- Constrain the model verdict to the same vocabulary as `status` (minus 'dead',
-- which the LLM never assigns). Dropped-and-readded so the migration is re-runnable.
alter table app.project
  drop constraint if exists project_llm_status_check;

alter table app.project
  add constraint project_llm_status_check
  check (llm_status is null or llm_status in ('active', 'noise'));

-- Partial index: the classify script repeatedly asks "which projects has the
-- LLM not seen yet?" — keep that lookup cheap as the table grows.
create index if not exists project_llm_unclassified_idx
  on app.project (status)
  where llm_classified_at is null;
