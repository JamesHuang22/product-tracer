-- =====================================================================
-- Product Tracer — Migration 0016: collector quality columns
-- =====================================================================
-- Richer per-project signal captured by the GitHub collector: issue / PR /
-- fork counts, repo topics, last push time, recent commit velocity, plus a
-- `last_checked_at` freshness stamp. Feeds future ranking / staleness logic.
--
-- Additive only — nullable columns on app.project, no data change.
--
-- Apply via Supabase SQL Editor (Project → SQL Editor → New query → paste → Run),
-- or `psql "$DATABASE_URL" -f packages/db/migrations/0016_collector_quality.sql`.
-- Idempotent — safe to re-run.
-- =====================================================================

alter table app.project add column if not exists last_checked_at  timestamptz;
alter table app.project add column if not exists issues_count      int;
alter table app.project add column if not exists open_prs_count    int;
alter table app.project add column if not exists forks_count       int;
alter table app.project add column if not exists topics            text[];
alter table app.project add column if not exists last_push_at      timestamptz;
alter table app.project add column if not exists recent_commits_30d int;
