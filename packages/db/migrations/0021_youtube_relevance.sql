-- 0021_youtube_relevance.sql
-- Relevance flag for YouTube insights (TASK-024).
--
-- NOTE: the analysed-video table is `app.video_insight` (the task spec called it
-- `app.youtube_video`, which does not exist). `is_relevant` lets us hide non-tech
-- content (food vlogs, gossip, daily life) from /youtube-insights without
-- deleting rows. Defaults true so existing rows stay visible until the cleanup
-- pass (clean-irrelevant-youtube) classifies them. The web queries filter on it
-- defensively (coalesce(... , true)), so this is safe to apply before/after deploy.

alter table app.video_insight
  add column if not exists is_relevant boolean not null default true;

create index if not exists video_insight_relevant_idx
  on app.video_insight (is_relevant);
