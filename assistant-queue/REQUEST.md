## Task: Dedup pipeline — LLM-powered daily dedup of projects and insights

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
  - Projects: same `primary_url` normalised, or same repo slug, or very similar name (lowercase, strip common words)
  - Insights: similarity in `key_insight` text (check if two insights discuss the same video/product)
- **Phase 2 — LLM dedup check**: For each pair, call DeepSeek:
  ```
  System: You are a dedup classifier. Given two database entries, output:
  { "is_duplicate": boolean, "confidence": 0.0-1.0, "reason": "short explanation" }
  ```
  Only process `active` entries (not already merged).
- **Phase 3 — Merge**: Mark duplicate as `dedup_status='merged'`, set `merged_into_id`. Re-point `app.identity_link` and `raw.snapshot` rows from merged → keeper.
- **Phase 4 — Report**: Log to `raw.collector_error` with `error_type='dedup_report'`.

Cost: ~$0.001 per pair. With ~50 candidate pairs per day → ~$0.05/day (~$1.50/month).

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

### Scope
- DO touch: apps/worker/ (new script), packages/db/migrations/ (0011), .github/workflows/ (new)
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
4. Update DECISIONS.md (dedup strategy: LLM-based, migration 0011)
5. Write summary to assistant-queue/RESPONSE.md

---

Execute. Write RESPONSE.md when done.
