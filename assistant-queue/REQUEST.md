# Product Tracer — Phase 2 Sprint

## Agent Session Rules

You are a continuously-running agent. Follow these rules:

### Polling
1. Every 20 minutes: `git fetch origin main && git diff HEAD origin/main -- assistant-queue/REQUEST.md assistant-queue/FRONTEND_REQUEST.md`
2. If diff is non-empty: git pull --rebase, implement new tasks
3. If empty: increment idle counter
4. After 15 consecutive idle polls: write shutdown notice to next-request.md and stop

### Manual trigger
If you see "pull now" in the conversation: immediately poll.

### Supabase MCP
Migrations via: `psql "$DATABASE_URL" -f packages/db/migrations/XXXX_name.sql`

### Vercel verify after every merge
```
curl -sI https://product-tracer.vercel.app/ → 200
curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/projects → 200
curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/trends → 200
curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/youtube-insights → 200
```

### Git author
`JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>`

### Workflow (non-negotiable)
1. Branch from main → implement → `pnpm typecheck` → commit → push → `gh pr create --fill`
2. Wait for Vercel preview ✅ → `gh pr merge --squash`
3. Verify HTTP 200 on all critical paths
4. Apply DB migrations via psql (Supabase MCP)
5. Update CHANGELOG.md, DECISIONS.md
6. Write summary to assistant-queue/RESPONSE.md

---

## IMPORTANT: Only implement these 3 tasks. Do NOT do anything else.

---

### TASK 1 [P0 BUG] — Fix empty YouTube insight card on homepage

**Bug**: The homepage insights section shows a broken empty card. The card has no text, just a "Watch on YouTube" link pointing to `https://www.youtube.com/watch?v=4y9DR2WwW3o`. The insight text (key_insight or key_insight_zh) is blank.

**Fix**:
1. In `apps/web/lib/db.ts`, find the `getLatestInsights()` query
2. Add a guard: `WHERE key_insight IS NOT NULL AND key_insight != ''`
3. In the homepage insight card component (check `apps/web/app/page.tsx` for the insights section), add client-side null/empty check so the card is NOT rendered if the locale-appropriate text field is empty
4. Locale logic: EN shows `key_insight`, ZH shows `key_insight_zh`. If the preferred field is empty/null, try the other language. If BOTH are empty, skip rendering the card entirely.

**Files to touch**: `apps/web/lib/db.ts`, `apps/web/app/page.tsx` (insight section)

**Verify**: Visit homepage — all insight cards have text content. No empty cards.

---

### TASK 2 [FEATURE] — Historic weekly trends selector

**Current**: `/trends` shows only the most recent week's data.

**Goal**: Let users browse historic weekly trends. Homepage always shows latest week.

**Backend** (`apps/web/lib/db.ts`):
1. Add query `getTrendWeeks()` — returns `SELECT DISTINCT week_start, week_end FROM app.weekly_trend ORDER BY week_start DESC`
2. Modify existing trend queries to accept optional `weekStart` parameter — if provided, filter by that week; if omitted, default to latest week

**Frontend** (`apps/web/app/trends/page.tsx`):
1. Add a week selector dropdown at top of /trends — populated from `getTrendWeeks()`
2. Default: show most recent week
3. On selection change: re-query data for that week (use `useSearchParams` or `router.push` with `?week=YYYY-MM-DD`)
4. URL reflects selected week: `/trends?week=2026-06-15`
5. Homepage always shows only latest week (no changes needed there)

**No migration needed** — `week_start` column exists.

**Files to touch**: `apps/web/lib/db.ts`, `apps/web/app/trends/page.tsx`, `apps/web/lib/i18n.ts`

**Verify**: /trends shows dropdown with available weeks → pick a past week → data changes to that week's trends.

---

### TASK 3 [FEATURE] — Revisit collectors for data quality

**A. GitHub collector improvement** (`apps/worker/src/collectors/github.ts`):
1. Add more data to the snapshot: `issues_count`, `open_prs_count`, `forks_count`, `topics text[]`, `last_push_at`, `recent_commits_30d`
2. Add freshness filter: skip repos with `pushed_at > 6 months ago` unless stars > 1000
3. Make the collector run more frequently (check `.github/workflows/collect-github.yml` schedule)

**B. Dedup pipeline improvement** (`apps/worker/src/scripts/dedup.ts`):
1. Stricter matching: require same `llm_category` OR name similarity > 0.8
2. Reduce false positives

**C. Migration** (`packages/db/migrations/0015_collector_quality.sql`):
```sql
alter table app.project add column if not exists last_checked_at timestamptz;
alter table app.project add column if not exists issues_count int;
alter table app.project add column if not exists open_prs_count int;
alter table app.project add column if not exists forks_count int;
alter table app.project add column if not exists topics text[];
alter table app.project add column if not exists last_push_at timestamptz;
alter table app.project add column if not exists recent_commits_30d int;
```

**Note**: Migration 0015 (granular_tags.sql) already exists. Name this one `0016_collector_quality.sql`.

**Files to touch**:
- `packages/db/migrations/0016_collector_quality.sql` (NEW)
- `apps/worker/src/collectors/github.ts` — add data points + freshness filter
- `apps/worker/src/scripts/dedup.ts` — stricter matching
- `.github/workflows/collect-github.yml` — revisit schedule
- `packages/types/src/index.ts` — update types if needed

**Verify**: Run `pnpm --filter @product-tracer/worker typecheck`. Migration applied via psql. Workflow runs.

---

### After completing all 3 tasks
1. Update CHANGELOG.md, DECISIONS.md
2. Update both RESPONSE.md files
3. Write a summary to next-request.md
4. The agent will continue polling. If no new tasks appear for 15 consecutive polls, it auto-shuts down.
