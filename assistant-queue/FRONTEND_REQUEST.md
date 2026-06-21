## Frontend Tasks

### Bug: Mobile horizontal scroll on 375px width

**P2 — / (mobile)**: Home page has horizontal scrollbar when viewport is 375px wide (mobile).

- *Expected*: No horizontal scroll, content fits viewport width
- *Actual*: Page overflows — user can scroll horizontally
- *Reproduction*: Open Chrome DevTools → toggle device toolbar → iPhone X (375×812) → load /
- *Cause*: Likely a flex/grid container without `overflow-x-hidden` or a fixed-width element wider than viewport

### Fix
- Add `overflow-x-hidden` to the main container or body on mobile
- Or ensure all grid/flex containers use `max-w-full` or equivalent
- Check `/projects` and `/youtube-insights` for the same issue
- Test on multiple breakpoints (375px, 390px, 414px, 768px)

### Rules
- PR → Vercel preview ✅ → merge to main → verify production
- Only touch apps/web/ files
- pnpm --filter @product-tracer/web typecheck must pass
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### After completing
1. Update CHANGELOG.md
2. Delete this file
3. Write summary to assistant-queue/FRONTEND_RESPONSE.md
