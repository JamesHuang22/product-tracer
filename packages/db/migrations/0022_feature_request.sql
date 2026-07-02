-- 0022_feature_request.sql
-- Logged-in users' feature requests / feedback (TASK-033).
--
-- The web app writes via the server-side postgres.js connection (service role,
-- bypasses RLS), always scoping to the authenticated user id from the Supabase
-- session. RLS policies below are defense-in-depth for PostgREST. Note: the FK
-- targets auth.users(id) (the task spec's app.user(id) does not exist — every
-- other table references auth.users, cf. app.bookmark / app.user_submission).

create table if not exists app.feature_request (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  title       text        not null,
  description text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists feature_request_user_idx
  on app.feature_request (user_id, created_at desc);

alter table app.feature_request enable row level security;

drop policy if exists feature_request_insert_own on app.feature_request;
create policy feature_request_insert_own on app.feature_request
  for insert with check (auth.uid() = user_id);

drop policy if exists feature_request_select_own on app.feature_request;
create policy feature_request_select_own on app.feature_request
  for select using (auth.uid() = user_id);
