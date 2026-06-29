-- 0020_newsletter.sql
-- Email capture for the weekly indie-product digest (TASK-017).
--
-- The landing page posts emails to /api/subscribe-newsletter, which inserts
-- here via the server-side postgres.js connection (service role). A future
-- worker (apps/worker send-newsletter) reads `unsubscribed_at is null` rows and
-- mails the latest weekly trends. RLS is enabled with no policies: the table is
-- never reached via PostgREST, only via the trusted service-role connection.

create table if not exists app.newsletter_subscriber (
  id              uuid        default gen_random_uuid() primary key,
  email           text        not null unique,
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create index if not exists newsletter_subscriber_active_idx
  on app.newsletter_subscriber (created_at desc)
  where unsubscribed_at is null;

alter table app.newsletter_subscriber enable row level security;
