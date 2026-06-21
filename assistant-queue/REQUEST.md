## Task: Weekly Hot Trends pipeline — aggregation + LLM summary of the past 7 days

### Context
A frontend page `/trends` was shipped in PR #29 but it shows an empty state because the backend data pipeline doesn't exist yet. You already built the dedup pipeline (PR #28); this is a separate feature.

Goal: Every Monday (or on demand), scan all data collected in the past 7 days — projects, signals, video insights — and generate a structured weekly trend report using DeepSeek.

### What to create

#### 1. Migration — weekly trend table
**`packages/db/migrations/0012_weekly_trend.sql`** (new):
```sql
create table if not exists app.weekly_trend (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  summary_en text not null,
  summary_zh text not null,
  top_products jsonb default '[]',
  emerging_themes text[] default '{}',
  video_highlights text default '',
  total_projects_scanned int default 0,
  total_signals_generated int default 0,
  total_insights_collected int default 0,
  raw_llm_response jsonb,
  llm_prompt_tokens int default 0,
  llm_completion_tokens int default 0,
  created_at timestamptz not null default now(),
  unique(week_start)
);
create index if not exists idx_weekly_trend_created on app.weekly_trend(created_at desc);
```

#### 2. Weekly trend script
**`apps/worker/src/scripts/weekly-trend.ts`** (new) — ~250 lines.

Logic flow:

**Step 1 — Gather past 7 days data.**
Query the following and collect them in memory:
```sql
-- New projects (last 7 days)
select slug, name, one_liner, category, primary_url, created_at
from app.project
where created_at >= now() - interval '7 days';

-- New signals (last 7 days), grouped by project with count
select p.slug, p.name, p.one_liner, p.primary_url, count(s.id) as signal_count
from app.signal s
join app.project p on p.id = s.project_id
where s.created_at >= now() - interval '7 days'
group by p.slug, p.name, p.one_liner, p.primary_url
order by signal_count desc
limit 10;

-- Top video insights
select video_title, channel_title, key_insight, key_insight_zh, relevance_score, sentiment
from app.video_insight
where created_at >= now() - interval '7 days'
  and relevance_score >= 6
order by relevance_score desc
limit 20;
```

**Step 2 — Build the LLM input payload.**
Format everything into a text prompt:
```
Past 7 days summary for tech/indie product radar:

New projects tracked: {count}
Top projects by signal activity:
1. {name} — {one_liner} ({slug}, platform: {guess from url})
...

Top video insights (relevance >= 6):
- "{video_title}" by {channel}: {key_insight[:200]}
...

Generate:
- summary_en: 3-4 sentence English overview of the week's trends
- summary_zh: 3-4 sentence Chinese translation (natural Mandarin, not translationese)
- emerging_themes: ["theme1", "theme2", ...] — keywords describing this week's hot topics
- video_highlights: 1-2 sentence describing notable video coverage
```

**Step 3 — Call DeepSeek.**
Use `callLlmJson()` with the formatted prompt. Expected output:
```typescript
z.object({
  summary_en: z.string().min(1),
  summary_zh: z.string().min(1),
  emerging_themes: z.array(z.string()).default([]),
  video_highlights: z.string().default(''),
})
```

**Step 4 — Store result.**
```typescript
await sql`
  insert into app.weekly_trend (
    week_start, week_end,
    summary_en, summary_zh,
    top_products, emerging_themes, video_highlights,
    total_projects_scanned, total_signals_generated, total_insights_collected,
    raw_llm_response, llm_prompt_tokens, llm_completion_tokens
  )
  values (
    date_trunc('week', now())::date,
    (date_trunc('week', now()) + interval '6 days')::date,
    ${parsed.summary_en},
    ${parsed.summary_zh},
    ${sql.json(topProducts)},
    ${sql.array(parsed.emerging_themes)},
    ${parsed.video_highlights},
    ${projectCount},
    ${signalCount},
    ${insightCount},
    ${sql.json(rawLlmResponse)},
    ${promptTokens},
    ${completionTokens}
  )
  on conflict (week_start) do update set
    summary_en = excluded.summary_en,
    summary_zh = excluded.summary_zh,
    top_products = excluded.top_products,
    emerging_themes = excluded.emerging_themes,
    video_highlights = excluded.video_highlights,
    total_projects_scanned = excluded.total_projects_scanned,
    total_signals_generated = excluded.total_signals_generated,
    total_insights_collected = excluded.total_insights_collected,
    raw_llm_response = excluded.raw_llm_response,
    llm_prompt_tokens = excluded.llm_prompt_tokens,
    llm_completion_tokens = excluded.llm_completion_tokens,
    created_at = now()
`;
```

#### 3. Workflow
**`.github/workflows/weekly-trend.yml`** (new):
```yaml
name: Weekly Hot Trends
on:
  schedule:
    - cron: '0 4 * * 1'  # Every Monday 04:00 UTC
  workflow_dispatch: {}

jobs:
  generate:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Generate weekly trends
        run: pnpm weekly:trend
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
```

#### 4. Package.json script
In `apps/worker/package.json`:
```json
"weekly:trend": "node --import tsx src/scripts/weekly-trend.ts"
```

### Scope
- DO touch: apps/worker/ (new script), packages/db/migrations/ (0012), .github/workflows/ (new)
- Do NOT touch: apps/web/, assistant-queue/ files
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### Verification
```
pnpm --filter @product-tracer/worker typecheck
```

### After completing
1. Create PR → wait for all CI checks ✅ → merge to main
2. Verify: curl -sI https://product-tracer.vercel.app/ returns HTTP 200
3. Update CHANGELOG.md (new entry at top)
4. Update DECISIONS.md (weekly trend pipeline, migration 0012)
5. Write summary to assistant-queue/RESPONSE.md

---

Execute. Write RESPONSE.md when done.
