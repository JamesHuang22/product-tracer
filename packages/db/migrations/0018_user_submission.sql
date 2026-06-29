-- 0018_user_submission.sql — user-submitted products (TASK-013)
-- Logged-in users submit a product; an AI worker reviews it; approved rows
-- create an app.project and surface under "Recently Submitted by Developers".

create table if not exists app.user_submission (
  id             uuid        default gen_random_uuid() primary key,
  user_id        uuid        not null references auth.users (id) on delete cascade,
  product_name   text        not null,
  description    text        not null,
  product_url    text        not null,
  github_url     text,
  status         text        not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  -- AI review results
  review_status  text        check (review_status in ('pending', 'valid', 'invalid')),
  review_reason  text,        -- why it was flagged invalid
  review_errors  jsonb,       -- array of strings: each failed validation check
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz,
  -- If approved, links to the created project record
  project_id     uuid references app.project (id) on delete set null
);

create index if not exists user_submission_status_idx
  on app.user_submission (status);

create index if not exists user_submission_review_idx
  on app.user_submission (review_status);

create index if not exists user_submission_user_idx
  on app.user_submission (user_id);

alter table app.user_submission enable row level security;

-- Users see only their own submissions.
drop policy if exists user_submission_select_own on app.user_submission;
create policy user_submission_select_own on app.user_submission
  for select using (auth.uid() = user_id);

drop policy if exists user_submission_insert_own on app.user_submission;
create policy user_submission_insert_own on app.user_submission
  for insert with check (auth.uid() = user_id);
