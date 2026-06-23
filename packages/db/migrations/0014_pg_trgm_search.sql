-- =====================================================================
-- Product Tracer — Migration 0014: fuzzy project search (pg_trgm)
-- =====================================================================
-- Backs the /api/search endpoint and the debounced search box on /projects.
-- With 4000+ tracked projects there was no way to search by name. pg_trgm gives
-- us trigram similarity (`%` operator, similarity()) and GIN indexes so fuzzy
-- name / one-liner lookups stay fast at scale.
--
-- Additive only — creates an extension + two GIN indexes, no schema/data change.
--
-- Apply via Supabase SQL Editor (Project → SQL Editor → New query → paste → Run),
-- or `psql "$DATABASE_URL" -f packages/db/migrations/0014_pg_trgm_search.sql`.
-- Idempotent — safe to re-run.
-- =====================================================================

create extension if not exists pg_trgm;

create index if not exists idx_project_name_trgm
  on app.project using gin (name gin_trgm_ops);

create index if not exists idx_project_one_liner_trgm
  on app.project using gin (one_liner gin_trgm_ops);
