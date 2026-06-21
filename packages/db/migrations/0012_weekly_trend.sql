-- =====================================================================
-- Product Tracer — Migration 0012: weekly hot trends
-- =====================================================================
-- The weekly-trend pipeline (apps/worker/src/scripts/weekly-trend.ts) scans all
-- data collected in the past 7 days — new projects, signal activity, and video
-- insights — and asks an LLM (DeepSeek) to distill a structured weekly report:
-- bilingual EN+ZH overview, the week's emerging themes, and a note on notable
-- video coverage. The /trends page (PR #29) reads the latest row.
--
--   week_start / week_end — Monday..Sunday of the report's ISO week (unique on
--                           week_start so a re-run upserts the same week)
--   top_products          — jsonb array of the most signal-active products
--   emerging_themes       — text[] keyword themes describing the week
--   total_*               — corpus sizes the report was generated from
--   raw_llm_response       — the model's raw JSON, for debugging/audit
--   llm_*_tokens          — usage accounting (mirrors video_insight)
--
-- Apply via Supabase SQL Editor (Project → SQL Editor → New query → paste → Run),
-- or `psql "$DATABASE_URL" -f packages/db/migrations/0012_weekly_trend.sql`.
-- Idempotent — safe to re-run.
-- =====================================================================

create table if not exists app.weekly_trend (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  summary_en text not null,
  summary_zh text not null,
  top_products jsonb default '[]',
  emerging_themes text[] default '{}',
  video_highlights text default '',
  total_projects_scanned int default 0,
  total_signals_generated int default 0,
  total_insights_collected int default 0,
  raw_llm_response jsonb,
  llm_prompt_tokens int default 0,
  llm_completion_tokens int default 0,
  created_at timestamptz not null default now(),
  unique(week_start)
);

create index if not exists idx_weekly_trend_created on app.weekly_trend(created_at desc);
