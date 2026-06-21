-- =====================================================================
-- Product Tracer — Migration 0013: AI-generated project summaries
-- =====================================================================
-- Projects today carry only a short `one_liner` (often scraped from GitHub).
-- The generate-summaries pipeline (apps/worker/src/scripts/generate-summaries.ts)
-- asks an LLM (DeepSeek) for a 2-3 sentence summary per project — what it does,
-- who it's for, why it's interesting — and stores it here. NULL means "not yet
-- summarised"; the script's batch query selects on `ai_summary is null`, so the
-- column doubles as the work queue and the result store (idempotent backfill).
--
-- Additive + nullable: existing rows keep NULL until the daily job reaches them.
--
-- Apply via Supabase SQL Editor (Project → SQL Editor → New query → paste → Run),
-- or `psql "$DATABASE_URL" -f packages/db/migrations/0013_ai_summary.sql`.
-- Idempotent — safe to re-run.
-- =====================================================================

alter table app.project
  add column if not exists ai_summary text;
