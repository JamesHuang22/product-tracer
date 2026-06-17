## Task: Fix YouTube OAuth token refresh + redesign YouTube pipeline as content discovery engine

### Context
The YouTube collector (`apps/worker/src/scripts/collect-youtube.ts`, `apps/worker/src/collectors/youtube.ts`) currently:
- Fetches videos from subscribed channels (via OAuth) or a static list (via API key)
- Extracts GitHub repo URLs from video descriptions
- Stores project links in `app.project` + `app.identity_link` + `raw.snapshot`
- Runs every 8h via `collect-youtube.yml`

**Problem 1: Token expired.** The OAuth refresh token (`GOOGLE_REFRESH_TOKEN`) returns `invalid_grant` — "Token has been expired or revoked." The workflow tries to refresh but fails, and the fallback API key alone only gets static channels.

**Problem 2: Limited scope.** The collector only looks for GitHub URLs in descriptions. The user wants to:
- Subscribe to channels, watch their new videos
- Use LLM (`callLlm()`) to summarize/analyze each video — extract insights, trends, topics, not just GitHub repos
- Store video insights as a new entity that the frontend can display (not just projects)

### What to create

#### Fix #1: OAuth token renewal
The `GOOGLE_REFRESH_TOKEN` in GitHub secrets needs to be re-generated (it's revoked). This requires a manual OAuth re-auth flow by James. **Add a helper script and clear instructions** so James can re-authorize:

1. Update `scripts/gmail-reauth.sh` (or create NEW `scripts/youtube-reauth.sh`) that opens the Google OAuth URL with `youtube.readonly` + `gmail.send` scopes, and guides James through pasting the new refresh token.
2. After James runs it, update `GOOGLE_REFRESH_TOKEN` in GitHub secrets.

#### Fix #2: YouTube Insights Engine (new)
Not just project URLs — create a new **YouTube Insights pipeline**:

1. **`apps/worker/src/scripts/youtube-insights.ts`** (new)
   - Fetches latest videos from subscriptions (same auth as collector)
   - For each NEW video (not seen before — track via a new table or dedupe by video id):
     - Extract all content: title, description, tags
     - Call `callLlm()` with DeepSeek to generate structured insights:
       ```json
       {
         "video_id": "...",
         "trends": ["trend1", "trend2"],           // trends discussed
         "topics": ["topic1", "topic2"],            // topics covered  
         "tools_mentioned": ["tool1", "tool2"],      // AI tools/products mentioned
         "sentiment": "positive/neutral/negative",   // overall tone about AI/tools
         "key_insight": "1-2 sentence summary of the video's main insight",
         "relevance_score": 1-10                     // how relevant to indie dev/AI space
       }
       ```
     - Store in a new DB table: `app.video_insight`
   - Schedule: daily at 05:00 UTC (before data-quality at 06:00)

#### Fix #3: New DB migration
**`packages/db/migrations/0008_video_insight.sql`** (new):
```sql
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

create index idx_video_insight_published on app.video_insight(published_at desc);
create index idx_video_insight_channel on app.video_insight(channel_id);
create index idx_video_insight_relevance on app.video_insight(relevance_score desc);
```

#### Fix #4: GitHub workflow
**`.github/workflows/youtube-insights.yml`** (new):
- Schedule: daily 05:00 UTC
- workflow_dispatch for manual trigger
- Reads DATABASE_URL, LLM_API_KEY, GOOGLE_REFRESH_TOKEN from secrets
- Uses same OAuth refresh pattern as collect-youtube.yml

### Scope
- DO touch: apps/worker/ (new scripts), packages/db/migrations/ (0008), .github/workflows/, scripts/
- Do NOT touch: apps/web/, assistant-queue/ files
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### Verification
```
pnpm --filter @product-tracer/worker typecheck
```

### Cross-cutting
This creates a new DB table `app.video_insight` that the frontend will need to display. There will be a SEPARATE FRONTEND_REQUEST.md for the UI.

### After completing
1. Create PR → wait for all CI checks ✅ → merge to main
2. Verify: curl -sI https://product-tracer.vercel.app/ returns HTTP 200
3. Update CHANGELOG.md (new entry at top)
4. Update DECISIONS.md (note: YouTube insights pipeline, DeepSeek usage for video analysis)
5. Write summary to assistant-queue/RESPONSE.md

---

Execute. Write RESPONSE.md when done.
