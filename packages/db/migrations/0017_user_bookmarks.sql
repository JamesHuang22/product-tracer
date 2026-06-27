-- 0017_user_bookmarks.sql
-- Per-user saved projects, backing the authenticated bookmark feature.
--
-- Anonymous visitors keep their bookmarks in localStorage (unchanged). Once a
-- user signs in, bookmarks are persisted here and synced across devices; the
-- localStorage set is merged in on first login.
--
-- Access path: the web app reads/writes this table via the server-side
-- postgres.js connection (service role, bypasses RLS), always scoping queries
-- to the authenticated user id resolved from the Supabase session. RLS policies
-- below are defense-in-depth in case the table is ever reached via PostgREST
-- with the anon/authenticated role.

create table if not exists app.bookmark (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  project_id uuid        not null references app.project (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

-- List a user's bookmarks newest-first.
create index if not exists bookmark_user_created_idx
  on app.bookmark (user_id, created_at desc);

alter table app.bookmark enable row level security;

-- Users may only see and mutate their own rows.
drop policy if exists bookmark_select_own on app.bookmark;
create policy bookmark_select_own on app.bookmark
  for select using (auth.uid() = user_id);

drop policy if exists bookmark_insert_own on app.bookmark;
create policy bookmark_insert_own on app.bookmark
  for insert with check (auth.uid() = user_id);

drop policy if exists bookmark_delete_own on app.bookmark;
create policy bookmark_delete_own on app.bookmark
  for delete using (auth.uid() = user_id);
