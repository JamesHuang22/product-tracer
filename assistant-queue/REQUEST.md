# Product Tracer — Day 2 Sprint (Phase 2)

## Agent Session Rules (read this first)

You are a continuously-running agent. Follow these rules:

### Polling
1. Every 20 minutes: `git fetch origin main && git diff HEAD origin/main -- assistant-queue/REQUEST.md assistant-queue/FRONTEND_REQUEST.md`
2. If diff is non-empty: git pull --rebase, implement the new tasks
3. If empty: increment idle counter
4. After 15 consecutive idle polls: write shutdown notice to next-request.md and stop

### Manual trigger
If you see "pull now" in the conversation: immediately poll the queue files.

### Supabase MCP
Migrations via: `psql "$DATABASE_URL" -f packages/db/migrations/XXXX_name.sql`

### Vercel verify after every merge
```
curl -sI https://product-tracer.vercel.app/  → 200
curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/projects → 200
curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/trends → 200
curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/youtube-insights → 200
curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/api/search?q=ai → 200
```

### Git author
`JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>`

### Workflow (non-negotiable)
1. Branch from main → implement → `pnpm typecheck` → commit → push → `gh pr create --fill`
2. Wait for Vercel preview ✅ → `gh pr merge --squash`
3. Verify HTTP 200 on all critical paths
4. Apply DB migrations via psql
5. Update CHANGELOG.md, DECISIONS.md
6. Write summary to assistant-queue/RESPONSE.md

---

## Tasks (execute in order, high to low priority)

---

### BUG-1 [P0] — YouTube Insights empty card on homepage

**Reported by James**: The homepage insights section shows a broken empty card. The card has no text, no title, just a "Watch on YouTube" link pointing to `https://www.youtube.com/watch?v=4y9DR2WwW3o`. The insight text is completely blank.

**Root cause suspicion**: The insight in question has `key_insight` or `key_insight_zh` as NULL or empty string. The frontend renders the card anyway but without content.

**Fix**:
1. Check all insight data fetching queries in `apps/web/lib/db.ts` (especially `getLatestInsights()`)
2. Add a guard: `WHERE key_insight IS NOT NULL AND key_insight != ''` to exclude empty insights
3. On the frontend card component, add a fallback: if `key_insight` (or locale-appropriate field) is empty/null, do NOT render the card at all
4. The locale-aware display logic (EN shows `key_insight`, ZH shows `key_insight_zh`) should also check: if the locale-preferred field is empty, try the other language; if both empty, skip

**Files to touch**: `apps/web/lib/db.ts`, the insight card component (check `apps/web/app/page.tsx` for the insights section), locale logic in card

**Verify**: Visit homepage → no empty cards → all insight cards have text content.

---

### FEAT-1 [HIGH] — Weekly Trends: historic weeks selector

**Current state**: `/trends` shows only the most recent week's data.

**Goal**: Allow users to browse historic weekly trends while keeping the homepage always showing the latest week.

**Backend** (`apps/web/lib/db.ts`):
1. Add query `getTrendWeeks()` — returns `SELECT DISTINCT week_start, week_end FROM app.weekly_trend ORDER BY week_start DESC` — list of available trend weeks
2. Modify existing trend queries to accept an optional `weekStart: string` parameter — if provided, filter by that week; if omitted, default to most recent week

**Frontend** (`apps/web/app/trends/page.tsx`):
1. Add a week selector dropdown at the top of /trends — populated from `getTrendWeeks()`
2. Default: show most recent week (matching current behavior)
3. On selection change: re-query data for that specific week (client-side navigation via `useSearchParams` or `router.push`)
4. The URL should reflect the selected week: `/trends?week=2026-06-15`
5. Homepage always shows only the latest week

**Files to touch**:
- `apps/web/lib/db.ts` — new queries + optional week param
- `apps/web/app/trends/page.tsx` — week selector dropdown, filtered queries
- `apps/web/lib/i18n.ts` — i18n for "Select week" / "选择周"
- Possibly `apps/web/app/trends/week-selector.tsx` (NEW) — if the component gets complex

**No migration needed** — `week_start` column already exists in `app.weekly_trend`.

**Verify**: Visit /trends → see a dropdown with available weeks → pick a past week → data changes to that week's trends.

---

### FEAT-2 [HIGH] — Revisit collectors: improve data quality, dedup, and freshness

**Problem**: Some projects feel low-quality or dead. The GitHub collector may miss real engagement signals. Dedup might miss duplicates.

**Backend tasks**:

**A. GitHub collector improvement** (`apps/worker/src/collectors/github.ts`):
- Add additional data points to the snapshot: `issues_count`, `open_prs`, `forks`, `last_push_date`, `topics`
- Add a freshness filter: skip repos with `pushed_at > 6 months ago` (unless they have >1000 stars)
- Consider adding a "recent commits" count (last 30 days) to gauge activity

**B. Dedup pipeline improvement**:
- Review `apps/worker/src/scripts/dedup.ts` — check if the LLM-based dedup is matching pairs that shouldn't be merged (false positives)
- Add stricter matching criteria: same `llm_category` OR name similarity > 0.8
- Migration `0015_dedup_quality.sql`:
  ```sql
  alter table app.project add column if not exists last_checked_at timestamptz;
  alter table app.project add column if not exists issues_count int;
  alter table app.project add column if not exists open_prs_count int;
  alter table app.project add column if not exists forks_count int;
  alter table app.project add column if not exists topics text[];
  alter table app.project add column if not exists last_push_at timestamptz;
  alter table app.project add column if not exists recent_commits_30d int;
  ```

**C. GitHub workflow update** (`.github/workflows/collect-github.yml`):
- Make the collector run more frequently if possible (currently N/A — check cron schedule)

**Files to touch**:
- `packages/db/migrations/0015_dedup_quality.sql` (NEW)
- `apps/worker/src/collectors/github.ts` — add new data points + freshness filter
- `apps/worker/src/scripts/dedup.ts` — stricter matching criteria
- `.github/workflows/collect-github.yml` — revisit schedule
- `packages/types/src/index.ts` — update `RawSnapshot` type if needed

**Verify**: Run `pnpm --filter @product-tracer/worker typecheck` and GitHub collector workflow passes. After migration, `SELECT * FROM app.project LIMIT 5` shows new columns populated.

---

### U1 [FEATURE] — Bookmark / Save Projects (from earlier, still pending)

If you already started this, finish it. Otherwise, skip to the tasks above and return to this if time permits.

**Files to touch** (from existing WIP):
- `apps/web/lib/bookmarks.ts` (NEW)
- `apps/web/app/bookmarks/page.tsx` (NEW)
- `apps/web/components/bookmark-button.tsx` (NEW)
- `apps/web/components/project-card.tsx` (NEW)
- Modify `page.tsx`, `projects-table.tsx`, `site-header.tsx`, `db.ts`, `i18n.ts` as needed

---

### U2-U6 backlog (do after the above)
- U2: Backfill AI summaries (one-off large batch)
- U3: Backfill llm_category coverage
- U4: AI granular tags
- U5: YouTube OG images
- U6: Multi-select insight filter
