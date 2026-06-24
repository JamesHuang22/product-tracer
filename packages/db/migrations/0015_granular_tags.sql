-- =====================================================================
-- Product Tracer — Migration 0015: granular project tags
-- =====================================================================
-- Adds finer-grained, LLM-generated tags on top of the single coarse
-- `llm_category` (8 categories). Each project gets 3–5 short topical tags
-- (e.g. "cli", "rust", "self-hosted", "llm", "kubernetes") surfaced as chips on
-- cards / the detail page and used for tag-based search & filtering.
--
-- `tags text[]` holds the tag list; a GIN index keeps `tags @> '{...}'` /
-- `&&` containment lookups fast at 4000+ rows. Populated by the
-- `generate-tags` worker script (LLM); NULL until generated.
--
-- Additive only — one nullable column + one GIN index, no data change.
--
-- Apply via Supabase SQL Editor (Project → SQL Editor → New query → paste → Run),
-- or `psql "$DATABASE_URL" -f packages/db/migrations/0015_granular_tags.sql`.
-- Idempotent — safe to re-run.
-- =====================================================================

alter table app.project add column if not exists tags text[];

create index if not exists idx_project_tags
  on app.project using gin (tags);
