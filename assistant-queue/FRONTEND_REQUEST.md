# Assistant Queue — Alex → Claude Code (Frontend)

## Task: Add pagination to /projects page

### Background
The `/projects` page shows all projects in a single table. As more collectors come online, this table grows large. Add pagination with configurable page sizes.

### What to build

**1. Pagination controls below the table**

Add to `apps/web/app/projects/projects-table.tsx`:

- **Page size selector**: dropdown showing "10 / 50 / 100" options, default 50
- **Page navigation**: "Prev" / "Next" buttons + "Page X of Y" indicator
- **Styling**: consistent with existing table design (neutral colors, border, rounded)

**2. Pagination approach**

Use **client-side pagination** (not server-side). The full dataset is already fetched server-side and passed as props. Just add:
- `useState` for current page and page size
- Slice `rows` to show only the current page
- Re-filter/sort integration: pagination resets to page 1 when filter changes

**3. Mobile support**

The mobile card view should also paginate with the same controls.

### i18n strings to add

```
'table.pagination.page': 'Page {current} of {total}'
'table.pagination.prev': 'Prev'
'table.pagination.next': 'Next'
'table.pagination.perPage': '{count} per page'
'table.pagination.showing': 'Showing {start}–{end} of {total}'
```

And Chinese translations:
```
'table.pagination.page': '第 {current} 页，共 {total} 页'
'table.pagination.prev': '上一页'
'table.pagination.next': '下一页'
'table.pagination.perPage': '每页 {count} 条'
'table.pagination.showing': '显示 {start}–{end}，共 {total} 条'
```

### Files to touch (ONLY apps/web/)

- `apps/web/app/projects/projects-table.tsx` — pagination state + controls
- `apps/web/lib/i18n.ts` — add pagination i18n keys (en + zh)

### DO NOT touch
- Any file in `apps/worker/`, `packages/`, `.github/workflows/`, migration `.sql`, `research/`

### Verification
- Table shows max 50 rows by default
- Can switch to 10 or 100
- Pagination resets on filter/search change
- Mobile card view also paginated
- `pnpm typecheck` passes

---

Execute. Write FRONTEND_RESPONSE.md when done.
