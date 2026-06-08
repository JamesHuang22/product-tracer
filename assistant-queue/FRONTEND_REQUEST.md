# Assistant Queue — Alex → Claude Code (Frontend)

## Task: Fix YouTube — data shows on home page but not rendering

### Problem
The home page YouTube section shows "0 projects tracked" even though the YouTube collector has run successfully and data exists in the DB.

### Root cause investigation needed
Check these:

**1. Home page data pipeline**
Open `apps/web/app/page.tsx` and trace how YouTube data flows:
- `getPlatformTop('youtube')` is called → does it return rows?
- If rows are empty → the SQL query in `getPlatformTop('youtube')` in `lib/db.ts` might have a bug
- If rows are returned → the `HomeContent` component might not be rendering them correctly

**2. SQL query check**
The `getPlatformTop` function in `lib/db.ts` has a specific branch for 'youtube':
```sql
select
  p.id, p.slug, p.name, p.one_liner, p.primary_url,
  latest.views as metric,
  'views'::text as metric_label
from app.project p
join app.identity_link il on il.project_id = p.id and il.platform = 'youtube'
left join lateral (
  select max(s.upvotes) as views from raw.snapshot s
  where s.project_id = p.id and s.platform = 'youtube'
) latest on true
order by latest.views desc nulls last, p.created_at desc
```
This might be returning rows with null views when the raw.snapshot has data but the upvotes column is null.

**3. Verify data exists**
Run a quick check — the collector writes `raw.snapshot` with upvotes=views. If the `upvotes` column in `raw.snapshot` is storing the view count correctly, the query should work. If not, fix the SQL.

**4. Also check `getPlatformProjectCount('youtube')`**
This counts distinct project_ids from `identity_link` where platform='youtube'. If the link was written correctly by the collector, this should return > 0. If it's 0, something's broken in how identity_links are written.

### Fix
- Fix whatever bug is causing YouTube projects to show as 0
- After the fix, verify locally that the home page shows YouTube projects
- Verify the "View all YouTube projects" link also works (goes to `/platform/youtube` or `/youtube` if that route exists)

### Also check the Detail Page
When clicking a YouTube-only project (no GitHub link), the `/projects/[slug]` page should show the YouTube platform card with views/likes. If it doesn't work, fix it.

### Files to touch (ONLY apps/web/)
- `apps/web/lib/db.ts` — fix YouTube query bugs
- `apps/web/app/page.tsx` — if the home rendering logic is wrong
- `apps/web/app/platform/[platform]/page.tsx` — if YouTube platform page is broken

### DO NOT touch worker/backend code

### Verification
- Home page shows YouTube projects count > 0
- YouTube projects appear in the home section
- Clicking a YouTube project navigates correctly
- `pnpm typecheck` passes

---

Execute all tasks. No questions. Write FRONTEND_RESPONSE.md when done.
