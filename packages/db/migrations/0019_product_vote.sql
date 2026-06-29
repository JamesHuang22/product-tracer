-- 0019_product_vote.sql
-- Upvote/downvote system for products (TASK-015).
--
-- One row per (user, project) capturing a +1 (upvote) or -1 (downvote). The
-- web app writes via the server-side postgres.js connection (service role,
-- bypasses RLS), always scoping to the authenticated user id resolved from the
-- Supabase session. RLS policies below are defense-in-depth for PostgREST.
--
-- Denormalised running totals live on app.project (upvotes/downvotes) so the
-- /projects list can sort by score without a per-row aggregate. The vote API
-- recomputes both counts from app.product_vote after every write.

create table if not exists app.product_vote (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  project_id uuid        not null references app.project (id) on delete cascade,
  vote       smallint    not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (user_id, project_id)
);

create index if not exists product_vote_project_idx on app.product_vote (project_id);

alter table app.product_vote enable row level security;

drop policy if exists product_vote_select_own on app.product_vote;
create policy product_vote_select_own on app.product_vote
  for select using (auth.uid() = user_id);

drop policy if exists product_vote_insert_own on app.product_vote;
create policy product_vote_insert_own on app.product_vote
  for insert with check (auth.uid() = user_id);

drop policy if exists product_vote_update_own on app.product_vote;
create policy product_vote_update_own on app.product_vote
  for update using (auth.uid() = user_id);

drop policy if exists product_vote_delete_own on app.product_vote;
create policy product_vote_delete_own on app.product_vote
  for delete using (auth.uid() = user_id);

-- Denormalised tallies on the project row.
alter table app.project add column if not exists upvotes   int not null default 0;
alter table app.project add column if not exists downvotes int not null default 0;

-- Backfill any pre-existing rows to a known zero baseline.
update app.project set upvotes = 0 where upvotes is null;
update app.project set downvotes = 0 where downvotes is null;
