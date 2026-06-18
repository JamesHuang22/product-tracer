## Task: Add insight categories — classify every YouTube insight by content type

### Context
The YouTube Insights pipeline (`youtube-insights.ts`) analyzes videos via DeepSeek and stores the result in `app.video_insight`. Currently it extracts: trends, topics, tools_mentioned, sentiment, key_insight, key_insight_zh, relevance_score.

The user wants:
- Each insight classified into a **category** (e.g. "AI/ML", "Developer Tools", "Startup/Business", "Tech News", "Hardware", "Security", "Design", "Other")
- The LLM should classify the **content** of the insight (not the video title — the actual summary paragraph)
- Categories stored in a new column, filterable from the frontend

### What to create

#### 1. Migration — add category column
**`packages/db/migrations/0010_insight_category.sql`** (new):
```sql
-- Add content-based category to video insights
alter table app.video_insight
  add column if not exists category text;

-- Index for filtering
create index if not exists idx_video_insight_category on app.video_insight(category);
```

#### 2. Update LLM prompt — add category to output
In **`apps/worker/src/scripts/youtube-insights.ts`**, update the zod response schema to include:
```typescript
z.object({
  trends: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  tools_mentioned: z.array(z.string()).default([]),
  sentiment: z.enum(['positive', 'neutral', 'negative']).default('neutral'),
  key_insight: z.string().min(1),
  key_insight_zh: z.string().min(1),
  relevance_score: z.number().int().min(1).max(10).default(5),
  category: z.enum([
    'ai_ml',
    'developer_tools',
    'startup_business',
    'tech_news',
    'hardware',
    'security',
    'design',
    'other'
  ]).default('other'),
});
```

Add to the system prompt: "Classify the video content into exactly one category: ai_ml (AI and machine learning), developer_tools (developer tools, frameworks, platforms), startup_business (startups, business strategy, funding), tech_news (general tech news and commentary), hardware (hardware, chips, devices), security (security, privacy, cryptography), design (UI/UX, product design), other (anything else)."

#### 3. Update DB insert — include category
In the INSERT/upsert into `app.video_insight`, add `category` to the column list:
```typescript
await sql`
  insert into app.video_insight (
    video_id, channel_id, channel_title, video_title,
    video_url, thumbnail_url, published_at,
    trends, topics, tools_mentioned, sentiment,
    key_insight, key_insight_zh, relevance_score, category,
    raw_llm_response, llm_prompt_tokens, llm_completion_tokens
  ) values (
    ...
    ${parsed.category},
    ...
  )
  on conflict (video_id) do update set
    ...
    category = excluded.category,
    ...
`;
```

#### 4. Backfill existing rows
The upsert `on conflict do update` already handles re-running existing rows — when the next YouTube Insights run processes them, category will be set. No separate backfill needed.

### Scope
- DO touch: apps/worker/src/scripts/youtube-insights.ts, packages/db/migrations/ (0010)
- Do NOT touch: apps/web/, assistant-queue/ files
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### Verification
```
pnpm --filter @product-tracer/worker typecheck
```

### Cross-cutting
This creates a `category` column that the frontend will need to show as a filter. There will be a SEPARATE FRONTEND_REQUEST.md for the UI.

### After completing
1. Create PR → wait for all CI checks ✅ → merge to main
2. Verify: curl -sI https://product-tracer.vercel.app/ returns HTTP 200
3. Update CHANGELOG.md (new entry at top)
4. Update DECISIONS.md (note: insight categories added to LLM output)
5. Write summary to assistant-queue/RESPONSE.md

---

Execute. Write RESPONSE.md when done.
