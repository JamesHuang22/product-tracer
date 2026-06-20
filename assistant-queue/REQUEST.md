## Task 1: Dedup pipeline — LLM-powered daily dedup of projects and insights

### Context
The product-tracer collects from 5+ platforms. Same product gets mentioned across sources, creating near-duplicate project/insight rows. Add a daily dedup cron:

1. Scans `app.project` for near-duplicates (same product, different slug/name)
2. Scans `app.video_insight` for duplicate insight rows
3. Uses DeepSeek (`callLlm()`) to classify each candidate pair as duplicate or not
4. Merges duplicates (mark merged, re-point identity_links, migrate snapshots)

### What to create

#### 1. Migration — dedup support columns
**`packages/db/migrations/0011_dedup.sql`** (new):
```sql
-- Add dedup support columns to app.project
alter table app.project
  add column if not exists merged_into_id uuid references app.project(id),
  add column if not exists dedup_status text default 'active'
    check (dedup_status in ('active', 'merged', 'duplicate_candidate'));

-- Add dedup support columns to app.video_insight
alter table app.video_insight
  add column if not exists merged_into_id uuid references app.video_insight(id),
  add column if not exists dedup_status text default 'active'
    check (dedup_status in ('active', 'merged', 'duplicate_candidate'));

-- Index for efficient scanning
create index if not exists idx_project_dedup_status on app.project(dedup_status) where dedup_status = 'duplicate_candidate';
create index if not exists idx_video_insight_dedup_status on app.video_insight(dedup_status) where dedup_status = 'duplicate_candidate';
```

#### 2. Dedup script
**`apps/worker/src/scripts/dedup.ts`** (new) — ~250 lines:
- **Phase 1 — Find candidates**:
  - Projects: same `primary_url` normalised, or same repo slug, or very similar name
  - Insights: similarity in `key_insight` text
- **Phase 2 — LLM dedup check**: For each candidate pair, call DeepSeek:
  ```
  System: You are a dedup classifier. Given two database entries, output:
  { "is_duplicate": boolean, "confidence": 0.0-1.0, "reason": "short explanation" }
  ```
  Only process `active` entries.
- **Phase 3 — Merge**: Mark duplicate as `dedup_status='merged'`, set `merged_into_id`. Re-point `app.identity_link` and `raw.snapshot` rows from merged → keeper.
- **Phase 4 — Report**: Log to `raw.collector_error` with `error_type='dedup_report'`.

#### 3. Workflow
**`.github/workflows/dedup.yml`** (new):
```yaml
name: Dedup
on:
  schedule:
    - cron: '0 3 * * *'  # Daily 03:00 UTC
  workflow_dispatch: {}
jobs:
  dedup:
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
      - name: Run dedup
        run: pnpm dedup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
```

#### 4. Package.json script
In `apps/worker/package.json`:
```json
"dedup": "node --import tsx src/scripts/dedup.ts"
```

---

## Task 2: Weekly Hot Trends pipeline — aggregate all sources (feat. LLM summary)

### Context
Every week, aggregate everything collected in the past 7 days (projects, signals, video insights) and generate a weekly summary with top trending products, emerging themes, and a narrative overview.

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
**`apps/worker/src/scripts/weekly-trend.ts`** (new) — ~250 lines:

Logic:
- **Step 1 — Gather past 7 days data**:
  ```sql
  -- New projects
  select * from app.project where created_at >= now() - interval '7 days';
  -- New signals
  select * from app.signal where created_at >= now() - interval '7 days';
  -- Top video insights
  select * from app.video_insight where created_at >= now() - interval '7 days' and relevance_score >= 6;
  -- Top projects by signal count
  select project_id, count(*) as cnt from app.signal
  where created_at >= now() - interval '7 days'
  group by project_id order by cnt desc limit 10;
  ```

- **Step 2 — Rank top products**: by signal frequency + relevance

- **Step 3 — LLM summarization**: Feed aggregated data into DeepSeek:
  ```
  Input: "This week we tracked X new projects. Top projects: [names]. Emerging themes from N video insights."
  
  Output JSON:
  {
    "summary_en": "3-4 sentence English overview of the week's trends",
    "summary_zh": "3-4 sentence Chinese translation",
    "emerging_themes": ["AI agents", "developer tools", ...],
    "video_highlights": "Notable video coverage this week..."
  }
  ```

- **Step 4 — Store**: INSERT into `app.weekly_trend` with `on conflict (week_start) do update`

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

---

### Scope (applies to both tasks)
- DO touch: apps/worker/ (new scripts), packages/db/migrations/ (0011 + 0012), .github/workflows/ (dedup.yml + weekly-trend.yml)
- Do NOT touch: apps/web/, assistant-queue/ files
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### Verification
```
pnpm --filter @product-tracer/worker typecheck
```

### Cross-cutting
- Migration 0011 creates columns the frontend doesn't display (internal dedup).
- Migration 0012 + weekly trend script creates data for `/trends` frontend page — that's a separate FRONTEND_REQUEST.md.

### After completing
1. Create PR → wait for all CI checks ✅ → merge to main
2. Verify: curl -sI https://product-tracer.vercel.app/ returns HTTP 200
3. Update CHANGELOG.md (new entry at top: dedup pipeline + weekly hot trends)
4. Update DECISIONS.md (dedup + weekly trend architecture)
5. Write summary to assistant-queue/RESPONSE.md

---

Execute both tasks in order (0011 → dedup script → 0012 → weekly-trend script → workflows). Write RESPONSE.md when done.
