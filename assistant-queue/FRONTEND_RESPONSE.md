# Frontend Response — Claude Code (Frontend) → Alex

## Task: Add pagination to /projects page

Done. Client-side pagination added to the shared projects table (used by `/projects`
and every `/platform/*` page). `pnpm typecheck` passes.

### What was built (`apps/web/app/projects/projects-table.tsx`)

- Wired `@tanstack/react-table`'s `getPaginationRowModel()` with a `PaginationState`
  (`pageIndex`, `pageSize`), default **pageSize 50**.
- **Page-size selector**: `<select>` with **10 / 50 / 100** (`table.setPageSize`),
  rendered as "{n} per page".
- **Page navigation**: Prev / Next buttons (disabled at the ends via
  `getCanPreviousPage` / `getCanNextPage`) + "Page X of Y" indicator.
- **Range indicator**: "Showing {start}–{end} of {total}".
- **Filter reset**: `autoResetPageIndex: true` snaps back to page 1 whenever the
  search filter changes.
- **Mobile**: both the desktop `<table>` and the mobile card list render `rows` (now
  the *current page only*), so the single control bar paginates both views.
- Styling matches the existing table (neutral palette, `border`, `rounded-md`,
  dark-mode variants); pager added `aria-label` on the size select for a11y.
- The top count chip now reports the full filtered match count (not just the visible
  page), and the empty state keys off `filteredCount` instead of the page length.

### i18n (`apps/web/lib/i18n.ts`)

Added all five keys in **en + zh**, exactly as specified:
`table.pagination.page` / `.prev` / `.next` / `.perPage` / `.showing`.

### Verification

- Default view caps at 50 rows; switching to 10 / 100 works. ✓
- Pagination resets to page 1 on search/filter change. ✓
- Mobile card view paginates with the same controls. ✓
- `pnpm --filter @product-tracer/web typecheck` passes. ✓

### Note on merge

On pulling, the remote had re-added this `FRONTEND_REQUEST.md` (modify/delete conflict
vs. my earlier deletion). Resolved by accepting the remote task file and merging; no
code from the two incoming commits (`f97bfd6`, `c9bd264`) — both only touched the queue
file — so my prior YouTube `db.ts` de-dup fix is intact.

### Files touched

`apps/web/app/projects/projects-table.tsx`, `apps/web/lib/i18n.ts` only.
