## Frontend Tasks

### Task 1: New YouTube Insights page
The backend agent is creating `app.video_insight` table — YouTube video analysis with LLM-generated insights (trends, topics, sentiment, relevance score).

Create a new **YouTube Insights page** at `/youtube-insights`:

1. **`apps/web/app/youtube-insights/page.tsx`** (new)
   - Fetches recent video insights from `app.video_insight` via `getVideoInsights(limit, offset?)`
   - Renders a list of video cards, each showing:
     - Thumbnail (from `thumbnail_url`)
     - Video title (linked to `video_url`)
     - Channel name
     - Published date
     - Relevance score badge (1-10)
     - Key insight text (1-2 sentences from LLM)
     - Trends/topics as small pills/tags
     - Sentiment badge (positive/neutral/negative with color)
   - Pagination (reuse the existing pattern from /projects)
   - Order by `published_at DESC`

2. **`apps/web/lib/db.ts`** — add `getVideoInsights(limit, offset)` query function

3. **Navigation header** — add "Insights" link in the top nav (after "Projects")

4. **Home page section** — on the home page, below "Latest Activity", add a "Latest Video Insights" section showing the 3 most recent high-relevance insights (relevance_score >= 7)

### Task 2: Typecheck
```
pnpm --filter @product-tracer/web typecheck
```

### Rules
- PR → wait for Vercel preview ✅ → merge to main → verify production
- Only touch apps/web/ files
- The backend agent is creating the DB table + data pipeline; this frontend task assumes the data already exists
- Do NOT touch apps/worker/, packages/, .github/workflows/ — those are backend

### After completing
1. Update CHANGELOG.md (new entry at top)
2. Update DECISIONS.md if architecture decision changes
3. Write summary to assistant-queue/FRONTEND_RESPONSE.md
