# Assistant Queue — Alex → Claude Code (Frontend)

## Task 1: Redesign home page — add stats bar + last 10 activity feed

### Background
The home page currently shows 4 platform sections (GitHub/HN/PH/YouTube) but feels sparse and doesn't give an immediate sense of "what's happening." Add a stats overview and a unified "Latest Projects" activity feed above the platform sections.

### What to build

**1. Stats bar (below hero, above platform sections)**

Add a simple row of stat cards showing:
- **Total Projects** — total count of all projects in DB
- **Active Platforms** — count of platforms with live data (4)
- **New This Week** — projects created in last 7 days (add a `getNewThisWeek()` query)
- **Hot Signals** — count of active signals (if `app.signal` table has data; otherwise show 0)

Each card: small icon + number + label. Same design language as the existing cards (neutral bg, subtle border, rounded).

**2. "Latest Projects" section**

Between the stats bar and platform sections, add a "Latest Activity" section showing the **last 10 projects** created (any platform), as a simple horizontal scroll or compact grid of cards.

Each card shows:
- Project name
- Platform badges (which platforms it's on)
- One_liner (truncated)
- Created date (relative, e.g. "2d ago")

**3. DB query additions** (`apps/web/lib/db.ts`)

Add two new functions:
- `getNewThisWeek(): Promise<number>` — count of projects with created_at > now() - 7 days
- `getLatestProjects(limit: number): Promise<ProjectListItem[]>` — recent projects ordered by created_at desc

Both should be simple SQL queries following the existing pattern.

### Files to touch (ONLY apps/web/)
- `apps/web/app/page.tsx` — add new data fetches, pass to HomeContent
- `apps/web/components/home-content.tsx` — add stats bar + Latest Activity section
- `apps/web/lib/db.ts` — add `getNewThisWeek()` and `getLatestProjects()`

### DO NOT touch
- Any file in `apps/worker/`, `packages/`, `.github/workflows/`, migration `.sql`, `research/`

### Verification
- Stats bar shows real numbers
- Latest Activity shows last 10 projects
- Layout is clean and responsive on mobile
- `pnpm typecheck` passes

---

Execute. Write FRONTEND_RESPONSE.md when done.
