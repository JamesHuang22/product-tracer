# Assistant Queue — Alex → Claude Code (Backend)

## Task 1: Growth Signal / Trending engine

### Background
Product Tracer has raw data flowing (GitHub stars, HN upvotes, PH upvotes, YouTube views) but no aggregation into "signals". Users need to see what's worth paying attention to — not just rows of data.

Build a growth signal engine that runs daily and writes to a new `app.signal` table, plus a trending projects script.

### What to build

**1. Migration 0006 — `app.signal` table**

Create `packages/db/migrations/0006_signals.sql`:

```sql
create table app.signal (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references app.project(id) on delete cascade,
  signal_type   text not null check (signal_type in (
    'github_star_burst',
    'hn_wave',
    'ph_launch_hot',
    'youtube_spike',
    'cross_platform_heat',
    'new_discovery',
    'rising_trend'
  )),
  severity      int not null check (severity between 1 and 5),
  title         text not null,       -- short human-readable headline, e.g. "⭐ 340 stars in 2 days"
  description   text,                -- one-liner detail
  metadata      jsonb default '{}',  -- {delta, timeframe_hours, platform_count, etc}
  created_at    timestamptz not null default now(),
  expires_at    timestamptz          -- auto-cleanup; null = no expiry
);

-- For listing active signals
create index idx_signal_project on app.signal(project_id);
create index idx_signal_type on app.signal(signal_type);
create index idx_signal_severity on app.signal(severity desc);
```

Also update the migration index in `packages/db/migrations/`.

**2. Signal script** — `apps/worker/src/scripts/run-signals.ts`

Connect to DB, compute and insert signals. Rules (all rule-based, no LLM):

| Signal | Rule | Severity |
|---|---|---|
| `github_star_burst` | GitHub stars grew >50% in 24h AND delta >50 stars | 3–5 (5 if delta >500) |
| `hn_wave` | HN score >50 AND within last 48h | 3–5 |
| `ph_launch_hot` | PH upvotes >100 AND launched within 7d | 3–5 |
| `cross_platform_heat` | Active on ≥3 platforms AND at least 1 has high engagement | 4–5 |
| `new_discovery` | New project created in last 48h AND has ≥2 platforms | 2 |
| `rising_trend` | Daily GitHub star growth sustained for 3+ consecutive days | 3–4 |

Implementation details:

- Clear stale signals before inserting (DELETE from `app.signal` where created_at < now() - interval '3 days')
- Upsert by project_id + signal_type to avoid duplicates
- Log summary: "Generated 12 signals (3 github_star_burst, 4 hn_wave, ...)"
- Use existing raw.snapshot and app.project_metric tables for data
- Query patterns: compare latest 2 snapshots for delta, window functions for streaks

**3. Workflow** — `.github/workflows/signal-trending.yml`

- Cron: daily at 07:00 UTC (after all collectors finished)
- Runs `tsx src/scripts/run-signals.ts`
- Env: `DATABASE_URL` (secrets)
- Same pattern as data-quality.yml

### Files to touch
- `packages/db/migrations/0006_signals.sql` (new)
- `apps/worker/src/scripts/run-signals.ts` (new)
- `.github/workflows/signal-trending.yml` (new)

### DO NOT touch
- `apps/web/` (frontend)
- Any existing collector
- Any existing migration

### Verification
- Script runs without error on empty data (no signals generated = fine)
- Generates signals when data exists
- `pnpm --filter @product-tracer/worker typecheck` passes

---

## Task 2: Reddit collector — no-OAuth refactor

### Background
Reddit collector was blocked by Reddit's "Responsible Builder Policy" preventing OAuth app creation. But Reddit still serves **public JSON** at `old.reddit.com/r/{subreddit}.json` and `www.reddit.com/r/{subreddit}/hot.json` with **no auth required** (rate limited to ~60 req/min).

Rewrite `apps/worker/src/collectors/reddit.ts` to use the OAuth-free JSON API.

### What to change

**1. Replace collector** (`apps/worker/src/collectors/reddit.ts`)

- Replace the current OAuth-dependent implementation with plain fetch to `https://www.reddit.com/r/{subreddit}/hot.json`
- Parse the standard Reddit JSON response (`.data.children[].data`)
- Extract same fields: id, title, selftext, url, score, num_comments, created_utc, subreddit, permalink
- Add a simple User-Agent header (Reddit requires one even for no-OAuth access)
- Rate limiting: add a 2-second delay between subreddit fetches
- Total rewrite of the file — keep the same exported interface

**2. Update workflow** (`.github/workflows/collect-reddit.yml`)

- Remove the `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` env requirements
- The script should now work with just `DATABASE_URL` and `REDDIT_USER_AGENT` (optional, defaults fine)
- Same cron schedule (every 6h or similar)

**3. Update script** (`apps/worker/src/scripts/collect-reddit.ts`) — minimal changes

Just import path change — the collector interface stays the same.

### Files to touch
- `apps/worker/src/collectors/reddit.ts` (rewrite)
- `.github/workflows/collect-reddit.yml` (remove OAuth deps)
- `apps/worker/src/scripts/collect-reddit.ts` (maybe, if import paths changed)

### DO NOT touch
- `apps/web/` (frontend)
- Migration SQL files
- Other collectors

### Verification
- `pnpm --filter @product-tracer/worker exec tsx src/scripts/collect-reddit.ts` fetches posts from r/SideProject, r/indiehackers, r/startups without any auth
- `pnpm --filter @product-tracer/worker typecheck` passes

---

Execute both tasks. Write RESPONSE.md when done.
