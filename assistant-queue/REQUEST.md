## Task: Upgrade YouTube Insights — bilingual summary paragraphs

### Context
The YouTube Insights pipeline (`youtube-insights.ts`) currently extracts a single-sentence `key_insight` from videos. The user wants:
- **Longer summary paragraphs** (2-4 sentences) that read like a news digest — substantive but not overly technical
- **Bilingual output** — store both English (`key_insight`) and Chinese (`key_insight_zh`) versions
- **Keep all existing fields** (trends, topics, tools_mentioned, sentiment, relevance_score) — just upgrade the insight text

### What to change

#### 1. Migration — add Chinese column
**`packages/db/migrations/0009_bilingual_insight.sql`** (new):
```sql
-- Add Chinese-language summary field to app.video_insight
alter table app.video_insight
  add column if not exists key_insight_zh text;

-- Widen key_insight limit if needed (remove limit, keep text)
alter table app.video_insight
  alter column key_insight type text;
```

#### 2. Update LLM prompt — bilingual output
In **`apps/worker/src/scripts/youtube-insights.ts`**, change the LLM prompt/system message to:

**New prompt requirements:**
- Output `key_insight` → **English** summary paragraph (2-4 sentences). Not a bullet list. Not a single sentence. A cohesive mini-paragraph summarizing the video's main point, what the product does, and why it matters. Write for a **busy tech reader** who wants to decide if it's worth watching.
- Output `key_insight_zh` → **Chinese** version of the same paragraph. Natural Mandarin, not machine-translationese. Target audience: Chinese indie devs / tech readers.
- Keep `trends`, `topics`, `tools_mentioned`, `sentiment`, `relevance_score` unchanged.

**Update the zod response schema** to expect:
```typescript
z.object({
  trends: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  tools_mentioned: z.array(z.string()).default([]),
  sentiment: z.enum(['positive', 'neutral', 'negative']).default('neutral'),
  key_insight: z.string().min(1),
  key_insight_zh: z.string().min(1),
  relevance_score: z.number().int().min(1).max(10).default(5),
});
```

#### 3. Update DB insert — write both columns
In the INSERT into `app.video_insight`, add `key_insight_zh`:
```typescript
await sql`
  insert into app.video_insight (
    video_id, channel_id, channel_title, video_title,
    video_url, thumbnail_url, published_at,
    trends, topics, tools_mentioned, sentiment,
    key_insight, key_insight_zh, relevance_score,
    raw_llm_response, llm_prompt_tokens, llm_completion_tokens
  ) values (
    ...
    ${parsed.key_insight}, ${parsed.key_insight_zh},
    ...
  )
  on conflict (video_id) do nothing
`;
```

#### 4. Handle existing rows
For existing `app.video_insight` rows that have `key_insight` but `key_insight_zh IS NULL`:
- Add a backfill query (commented out, not automated — user runs it manually) or skip (next run only affects NEW videos, which is acceptable since existing rows will be overwritten next time by the daily run)

Actually — change `on conflict (video_id) do nothing` to `on conflict (video_id) do update set key_insight_zh = excluded.key_insight_zh, key_insight = excluded.key_insight, ...` so existing rows get upgraded on the next run too.

Add **all non-primary-key columns** to the DO UPDATE set:
```sql
on conflict (video_id) do update set
  trends = excluded.trends,
  topics = excluded.topics,
  tools_mentioned = excluded.tools_mentioned,
  sentiment = excluded.sentiment,
  key_insight = excluded.key_insight,
  key_insight_zh = excluded.key_insight_zh,
  relevance_score = excluded.relevance_score,
  raw_llm_response = excluded.raw_llm_response,
  llm_prompt_tokens = excluded.llm_prompt_tokens,
  llm_completion_tokens = excluded.llm_completion_tokens
```

#### 5. Migration must be applied
James will run this in Supabase SQL Editor.

### Scope
- DO touch: apps/worker/ (prompt + insert), packages/db/migrations/ (0009)
- Do NOT touch: apps/web/, assistant-queue/ files
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### Verification
```
pnpm --filter @product-tracer/worker typecheck
```

### Cross-cutting
This changes the `app.video_insight` schema (new column `key_insight_zh`). The frontend needs a corresponding task to display `key_insight_zh` for Chinese locale — that's a SEPARATE FRONTEND_REQUEST.md.

### After completing
1. Create PR → wait for all CI checks ✅ → merge to main
2. Verify: curl -sI https://product-tracer.vercel.app/ returns HTTP 200
3. Update CHANGELOG.md (new entry at top)
4. Update DECISIONS.md (note: bilingual LLM output, upsert instead of do-nothing)
5. Write summary to assistant-queue/RESPONSE.md

---

Execute. Write RESPONSE.md when done.
