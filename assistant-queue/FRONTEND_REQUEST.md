# Assistant Queue — Alex → Claude Code (Frontend)

## Task: Add "go to page" input to /projects pagination

### Background
The /projects page already has Prev/Next pagination with page numbers. Users need to be able to jump to any page directly by typing a page number.

### What to build

**1. Replace the static "Page X of Y" text with an interactive input**

In `apps/web/app/projects/projects-table.tsx`:

- Replace `<span>Page {current} of {total}</span>` with:
  - A small text input (w-16 or similar) prefilled with current page number
  - A "/" separator
  - Total pages display (non-editable)
  - When user types a number and presses Enter (or blurs the input), navigate to that page
  - Validation: clamp to [1, totalPages], ignore non-numeric input
  
**2. Input UX**
- Small input field (~50px wide), number type, centered text
- Border: same neutral-300 as the search input
- On invalid page (too high or too low): just clamp silently, don't show error
- Maintains keyboard accessibility (tabbable, Enter to confirm)

**3. Layout**

Keep the existing layout: pagination controls centered below the table with:
```
[Prev]  [_14_] / 245  [Next]   10 per page ▼
```

### Files to touch (ONLY apps/web/)

- `apps/web/app/projects/projects-table.tsx` — replace page text with input

### DO NOT touch
- Any file in `apps/worker/`, `packages/`, `.github/workflows/`, migration `.sql`, `research/`

### Verification
- User can type a page number and press Enter → table jumps to that page
- Invalid input clamped gracefully
- Filter/search still resets to page 1
- `pnpm typecheck` passes

---

Execute. Write FRONTEND_RESPONSE.md when done.
