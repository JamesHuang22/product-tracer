-- =====================================================================
-- Product Tracer — Migration 0006: Growth-signal / trending engine
-- =====================================================================
-- Apply via Supabase SQL Editor (Project → SQL Editor → New query → Run).
--
-- ⚠️ NOTE: migration 0001 already created an `app.signal` table for the v0.1
-- digest design (columns: type/severity-text/score/linked_snapshot_ids/
-- sent_in_digest_at). A repo-wide search found **no code reads or writes it** —
-- it was schema-only. This migration replaces it with the trending-engine
-- schema below. Dropping is safe: nothing references app.signal (digest_run
-- stores signal ids as a plain uuid[], not a FK).
-- =====================================================================

drop table if exists app.signal cascade;

create table app.signal (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references app.project(id) on delete cascade,
  signal_type   text not null check (signal_type in (
    'github_star_burst',
    'hn_wave',
    'ph_launch_hot',
    'youtube_spike',
    'cross_platform_heat',
    'new_discovery',
    'rising_trend'
  )),
  severity      int not null check (severity between 1 and 5),
  title         text not null,                 -- headline, e.g. "⭐ 340 stars in 24h"
  description   text,                           -- one-liner detail
  metadata      jsonb not null default '{}'::jsonb,  -- {delta, timeframe_hours, platform_count, ...}
  created_at    timestamptz not null default now(),
  expires_at    timestamptz,                    -- auto-cleanup; null = no expiry
  -- One current signal of each type per project → lets run-signals.ts upsert.
  unique (project_id, signal_type)
);

create index idx_signal_project on app.signal(project_id);
create index idx_signal_type on app.signal(signal_type);
create index idx_signal_severity on app.signal(severity desc);

-- service_role already has blanket grants in schema app (0001), but be explicit
-- so this table is usable immediately regardless of default-privilege quirks.
grant all on app.signal to service_role;
