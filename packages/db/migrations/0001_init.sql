-- =====================================================================
-- Product Tracer — Migration 0001: Initial schema
-- =====================================================================
-- Creates the `raw` and `app` schemas with all core tables for v0.1.
-- Apply via Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).
--
-- After running, go to Project Settings → API → Exposed schemas and add
-- BOTH `app` and `raw` to the list, otherwise the JS client cannot query them.
-- =====================================================================

create extension if not exists vector;
create extension if not exists pgcrypto;

create schema if not exists raw;
create schema if not exists app;

-- ---------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- app.project
-- ---------------------------------------------------------------------
create table app.project (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  one_liner       text,
  category        text,
  primary_url     text,
  status          text not null default 'active'
                    check (status in ('active', 'dead')),
  seo_title       text,
  seo_description text,
  hero_image_url  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger project_set_updated_at
  before update on app.project
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------
-- app.identity_link — cross-platform identity matches (PRD §6)
-- ---------------------------------------------------------------------
create table app.identity_link (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references app.project(id) on delete cascade,
  platform     text not null
                 check (platform in ('github', 'product_hunt', 'hacker_news', 'reddit', 'x')),
  external_id  text not null,
  confidence   numeric(3,2) check (confidence >= 0 and confidence <= 1),
  source       text not null
                 check (source in ('hard', 'soft', 'embedding', 'manual')),
  created_at   timestamptz not null default now(),
  unique (platform, external_id)
);

create index identity_link_project_id_idx on app.identity_link(project_id);

-- ---------------------------------------------------------------------
-- app.project_metric — daily aggregated time-series for charts
-- ---------------------------------------------------------------------
create table app.project_metric (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid not null references app.project(id) on delete cascade,
  date                    date not null,
  github_stars            integer,
  github_stars_delta_24h  integer,
  ph_upvotes              integer,
  ph_rank                 integer,
  hn_score                integer,
  reddit_mentions         integer,
  unique (project_id, date)
);

create index project_metric_date_idx on app.project_metric(date);
create index project_metric_project_id_idx on app.project_metric(project_id);

-- ---------------------------------------------------------------------
-- app.project_embedding — pgvector for T2 identity match (PRD §6)
-- ---------------------------------------------------------------------
create table app.project_embedding (
  project_id        uuid primary key references app.project(id) on delete cascade,
  embedding         vector(1536) not null,
  source_text_hash  text not null,
  model_version     text not null,
  created_at        timestamptz not null default now()
);

create index project_embedding_hnsw
  on app.project_embedding using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------
-- app.signal — surfaced per-project signals (PRD §5)
-- ---------------------------------------------------------------------
create table app.signal (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references app.project(id) on delete cascade,
  type                 text not null
                         check (type in ('velocity', 'cross_platform', 'founder', 'alert')),
  severity             text not null default 'info'
                         check (severity in ('info', 'notable', 'high')),
  score                numeric(5,2),
  title                text not null,
  description          text,
  linked_snapshot_ids  uuid[],
  created_at           timestamptz not null default now(),
  sent_in_digest_at    timestamptz
);

create index signal_project_id_idx on app.signal(project_id);
create index signal_created_at_idx on app.signal(created_at desc);
create index signal_unsent_idx on app.signal(created_at desc)
  where sent_in_digest_at is null;

-- ---------------------------------------------------------------------
-- app.subscriber — email subscribers
-- ---------------------------------------------------------------------
create table app.subscriber (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  status          text not null default 'active'
                    check (status in ('active', 'unsubscribed', 'bounced')),
  preferences     jsonb not null default '{}'::jsonb,
  source          text,
  created_at      timestamptz not null default now(),
  last_opened_at  timestamptz
);

-- ---------------------------------------------------------------------
-- app.digest_run — record of each digest sent to each subscriber
-- ---------------------------------------------------------------------
create table app.digest_run (
  id                   uuid primary key default gen_random_uuid(),
  subscriber_id        uuid not null references app.subscriber(id) on delete cascade,
  sent_at              timestamptz not null default now(),
  included_signal_ids  uuid[] not null,
  opened_at            timestamptz,
  click_count          integer not null default 0
);

create index digest_run_subscriber_id_idx on app.digest_run(subscriber_id);
create index digest_run_sent_at_idx on app.digest_run(sent_at desc);

-- ---------------------------------------------------------------------
-- raw.snapshot — append-only raw collector output
-- ---------------------------------------------------------------------
create table raw.snapshot (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references app.project(id) on delete set null,
  platform    text not null
                check (platform in ('github', 'product_hunt', 'hacker_news', 'reddit', 'x')),
  timestamp   timestamptz not null default now(),
  stars       integer,
  forks       integer,
  upvotes     integer,
  comments    integer,
  rank        integer,
  raw_data    jsonb not null
);

create index snapshot_platform_timestamp_idx on raw.snapshot(platform, timestamp desc);
create index snapshot_project_id_idx on raw.snapshot(project_id)
  where project_id is not null;
create index snapshot_raw_data_idx on raw.snapshot using gin(raw_data);

-- ---------------------------------------------------------------------
-- raw.collector_error — observability for failed collector runs
-- ---------------------------------------------------------------------
create table raw.collector_error (
  id           uuid primary key default gen_random_uuid(),
  platform     text not null,
  error_type   text not null,
  payload      jsonb,
  occurred_at  timestamptz not null default now()
);

create index collector_error_platform_occurred_at_idx
  on raw.collector_error(platform, occurred_at desc);

-- ---------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------
-- service_role gets full access to both schemas.
grant usage on schema raw to service_role;
grant usage on schema app to service_role;
grant all on all tables in schema raw to service_role;
grant all on all tables in schema app to service_role;
grant all on all sequences in schema raw to service_role;
grant all on all sequences in schema app to service_role;
alter default privileges in schema raw grant all on tables to service_role;
alter default privileges in schema app grant all on tables to service_role;

-- ---------------------------------------------------------------------
-- RLS — deferred to a later migration
-- ---------------------------------------------------------------------
-- v0.1 is dogfood-only (single user, worker writes via service_role; web
-- reads via service_role until P1+). We'll add a follow-up migration that
-- enables RLS and adds public-read policies on app.project / app.signal /
-- app.project_metric before going public. See PRD §11.
