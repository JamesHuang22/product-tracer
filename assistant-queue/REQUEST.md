# Product Tracer — Collector Quality + Data Quality Sprint

## Agent Session Rules

You are a continuously-running agent. Follow these rules:

### Polling
1. Every 20 minutes: `git fetch origin main && git diff HEAD origin/main -- assistant-queue/REQUEST.md assistant-queue/FRONTEND_REQUEST.md`
2. If diff is non-empty: git pull --rebase, implement new tasks
3. If empty: increment idle counter
4. After 15 consecutive idle polls: write shutdown notice and stop

### Manual trigger
Say "pull now" → immediately poll queue files.

### Supabase MCP (installed)
Migrations via: `psql "$DATABASE_URL" -f packages/db/migrations/XXXX_name.sql`

### Vercel verify after every merge
```
curl -sI https://product-tracer.vercel.app/  → 200
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

## IMPORTANT: Execute tasks in order. Do not skip to later tasks.

---

### TASK 1 [HIGH] — Revisit GitHub collector for higher quality data

**Background**: Currently scraped projects lack depth. We need richer data points and better freshness filtering. Product Hunt, HN, and YouTube collectors are adequate. GitHub is where data quality needs most improvement.

**A. GitHub collector improvement** (`apps/worker/src/collectors/github.ts`):
1. Add more data points to the snapshot:
   - `issues_count` (open issues)
   - `open_prs_count` (open pull requests)
   - `forks_count` (fork count)
   - `topics` (repo topics as text array)
   - `last_push_at` (last push timestamp)
   - `recent_commits_30d` (commit count in last 30 days — fetch via GitHub commits API)
2. Add freshness filter: skip repos with NO push in the last 6 months AND stars < 1000. These are dead projects.
3. Increase GitHub API call frequency — check `.github/workflows/collect-github.yml` schedule, make it run more often if possible
4. Make sure `description` (the repo's README/about description) is populated — fallthrough to `one_liner` if null

**B. Migration** (`packages/db/migrations/0016_collector_quality.sql`):
```sql
alter table app.project add column if not exists last_checked_at timestamptz;
alter table app.project add column if not exists issues_count int;
alter table app.project add column if not exists open_prs_count int;
alter table app.project add column if not exists forks_count int;
alter table app.project add column if not exists topics text[];
alter table app.project add column if not exists last_push_at timestamptz;
alter table app.project add column if not exists recent_commits_30d int;
```

**C. Update types** (`packages/types/src/index.ts`):
- Add new fields to `RawSnapshot` type

**Files to touch**:
- `packages/db/migrations/0016_collector_quality.sql` (NEW)
- `apps/worker/src/collectors/github.ts`
- `.github/workflows/collect-github.yml` (review + increase frequency)
- `packages/types/src/index.ts`

**Verify**: `pnpm --filter @product-tracer/worker typecheck` passes. Migration applied via Supabase MCP. After next GitHub collector run, queries show new columns populated.

---

### TASK 2 [P0 BUG] — Fix empty YouTube insight card on homepage

**Bug**: Homepage insights section shows a broken empty card. The card has no text, just a "Watch on YouTube" link pointing to `https://www.youtube.com/watch?v=4y9DR2WwW3o`. The insight text (key_insight or key_insight_zh) is blank.

**Fix**:
1. In `apps/web/lib/db.ts`, find the `getLatestInsights()` query
2. Add a SQL guard: `WHERE key_insight IS NOT NULL AND key_insight != ''`
3. In the homepage insight card component (check `apps/web/app/page.tsx` for the insights section), add client-side null/empty check
4. Locale logic: EN → `key_insight`, ZH → `key_insight_zh`. If preferred field is empty/null, try the other language. If BOTH are empty, skip rendering.

**Files to touch**: `apps/web/lib/db.ts`, `apps/web/app/page.tsx`

**Verify**: Visit homepage — all insight cards have text content. No empty cards.

---

### TASK 3 [FEATURE] — Historic weekly trends selector

**Current**: `/trends` shows only the most recent week's data.

**Goal**: Let users browse historic weekly trends. Homepage always shows latest week.

**Backend** (`apps/web/lib/db.ts`):
1. Add query `getTrendWeeks()` — `SELECT DISTINCT week_start, week_end FROM app.weekly_trend ORDER BY week_start DESC`
2. Modify existing trend queries to accept optional `weekStart` param

**Frontend** (`apps/web/app/trends/page.tsx`):
1. Week selector dropdown at top of /trends
2. Default: show most recent week. On change: re-query with `?week=YYYY-MM-DD`
3. Homepage unchanged (always latest week)

**No migration needed** — `week_start` column already exists.

**Files to touch**: `apps/web/lib/db.ts`, `apps/web/app/trends/page.tsx`, `apps/web/lib/i18n.ts`

**Verify**: /trends shows dropdown → pick a past week → data changes.

---

### TASK 4 [P2] — Fix locale-prefixed routes for /trends, /youtube-insights, /bookmarks

**Bug**: `/en/trends`, `/zh/trends`, `/en/youtube-insights`, `/zh/youtube-insights`, `/en/bookmarks`, `/zh/bookmarks` all return 404. Only `/zh/` homepage and `/zh/projects` work.

**Fix**: Register these pages under the `[locale]` dynamic segment or fix middleware routing.

**File**: FRONTEND_REQUEST.md has full details.

---

### TASK 5 [P3] — Minor UI improvements
- Add WoW delta to /trends top product list
- Clickable theme links on /trends
- Clickable YouTube links on /trends video highlights
- `favicon.ico` 404

**File**: FRONTEND_REQUEST.md has full details.

---

### After completing all tasks
1. Update CHANGELOG.md, DECISIONS.md
2. Update RESPONSE.md + FRONTEND_RESPONSE.md
3. Write summary to next-request.md
