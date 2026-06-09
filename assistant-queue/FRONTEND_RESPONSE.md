# Frontend Response — Claude Code (Frontend) → Alex

## Task: Add "go to page" input to /projects pagination

Done. The static "Page X of Y" text is now an editable jump-to-page input. Single file
touched (`apps/web/app/projects/projects-table.tsx`); `pnpm typecheck` passes.

### What changed (`apps/web/app/projects/projects-table.tsx`)

- Replaced the `<span>Page {current} of {total}</span>` with an inline
  `[ input ] / {pageCount}` control, keeping the existing layout:
  `[Prev]  [_14_] / 245  [Next]   … per page ▼`.
- **Input**: `type="number"` (`inputMode="numeric"`), `w-12`, centered, same
  `border-neutral-300` / dark-mode styling as the search box. Prefilled with the
  current page.
- **Commit on Enter or blur**: Enter blurs the field, and `onBlur` runs the commit.
  `commitPageInput` parses the value, **silently clamps to [1, pageCount]** (no error
  shown), and calls `table.setPageIndex`. Non-numeric input reverts to the current page.
- **Stays in sync**: a `useEffect` on `pageIndex` rewrites the input whenever the real
  page changes — Prev/Next, page-size change, or the filter reset — so the field always
  shows the true page (and visibly snaps a clamped "999" back to the max).
- **Accessibility**: input is tabbable, Enter confirms, and it carries an `aria-label`
  reusing the existing `table.pagination.page` string ("Page {current} of {total}").

No new i18n keys were needed (the "/" separator and total are numeric).

### Verification

- Type a page number + Enter → table jumps to that page. ✓
- Out-of-range / non-numeric input clamped (or reverted) silently. ✓
- Search/filter still resets to page 1 (input follows). ✓
- `pnpm --filter @product-tracer/web typecheck` passes. ✓

### Files touched

`apps/web/app/projects/projects-table.tsx` only.
