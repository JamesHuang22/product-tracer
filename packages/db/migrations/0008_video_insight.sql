-- =====================================================================
-- Product Tracer — Migration 0008: YouTube video insights
-- =====================================================================
-- The YouTube Insights pipeline (apps/worker/src/scripts/youtube-insights.ts)
-- watches the authenticated user's subscriptions, and for each NEW video runs a
-- DeepSeek (LLM) pass that extracts structured insight — trends, topics, tools
-- mentioned, sentiment, a one-line key takeaway, and an indie-dev/AI relevance
-- score. Unlike the YouTube *collector* (which only mines descriptions for
-- GitHub repos → app.project), this stores the video itself as a first-class
-- entity the frontend can surface.
--
-- `video_id` is unique so the pipeline is idempotent — a video is analysed (and
-- billed to the LLM) exactly once. JSONB array columns default to '[]'.
--
-- Apply via Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).
-- Idempotent — safe to re-run.
-- =====================================================================

create table if not exists app.video_insight (
  id uuid primary key default gen_random_uuid(),
  video_id text not null unique,           -- YouTube video id
  channel_id text not null,
  channel_title text not null,
  video_title text not null,
  video_url text not null,
  thumbnail_url text,
  published_at timestamptz,
  trends jsonb default '[]',               -- [string]
  topics jsonb default '[]',               -- [string]
  tools_mentioned jsonb default '[]',        -- [string]
  sentiment text,
  key_insight text,
  relevance_score int check (relevance_score between 1 and 10),
  raw_llm_response jsonb,                  -- full LLM output for debugging
  llm_prompt_tokens int default 0,
  llm_completion_tokens int default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_video_insight_published on app.video_insight(published_at desc);
create index if not exists idx_video_insight_channel on app.video_insight(channel_id);
create index if not exists idx_video_insight_relevance on app.video_insight(relevance_score desc);
