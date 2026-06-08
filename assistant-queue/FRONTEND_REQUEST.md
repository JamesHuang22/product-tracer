# Assistant Queue — Alex → Claude Code (Frontend)

## Task: Fix YouTube — home page shows "0 projects tracked" even though data exists

### Problem
The home page YouTube section shows "0 projects tracked" / "0 projects" even though the YouTube collector has run successfully. Need to debug and fix.

### What to check

**1. `getPlatformProjectCount('youtube')` in `lib/db.ts`**
This SQL counts distinct project_ids from `identity_link WHERE platform='youtube'`. Run it and see what it returns:
```sql
select count(distinct project_id)::int as n
from app.identity_link
where platform = 'youtube'
```
If it returns 0, the collector didn't write identity_links.

**2. `getPlatformTop('youtube')` in `lib/db.ts`**
If identity_links exist but the home page still shows nothing, the SQL might be wrong. The current query:
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
Maybe the `upvotes` column in `raw.snapshot` isn't being populated for YouTube rows. Check what the collector writes.

**3. `HomePageData` flow in `page.tsx`**
Trace from `getHomePageData()` → `HomeContent` props → rendering. Check if the YouTube branch is actually wired into the returned data object.

**4. `HomeContent` component in `home-content.tsx`**
Check that the YouTube `LivePlatformSection` gets `data.youtube` passed correctly.

### Fix approach
Whichever the root cause is:
- Fix the SQL (if query is wrong)
- Fix the collector data writing (if upvotes/views is null) — but DO NOT touch worker code, only frontend
- Fix the home page wiring (if the YouTube data isn't being passed)

If the root cause is in the worker/collector (e.g., `raw.snapshot.upvotes` is null for YouTube entries), document this clearly in the RESPONSE so the backend agent can fix it.

### Files to touch (ONLY apps/web/)
- `apps/web/lib/db.ts`
- `apps/web/lib/db.ts` → `getPlatformTop` function
- `apps/web/app/page.tsx`
- `apps/web/components/home-content.tsx` — only if rendering is wrong

### DO NOT touch worker/backend code

### Verification
- After fix, home page YouTube section shows correct count (not 0)
- YouTube project cards render in the home page
- Clicking "View all YouTube projects" goes to the correct page

---

Execute. Write FRONTEND_RESPONSE.md when done.
