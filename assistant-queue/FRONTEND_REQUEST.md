## Frontend Tasks

### Context
The YouTube Insights page is live with locale-aware display (PR #25). Three things to improve:

1. **Remove trends/topics** from each insight card — users find it noisy. Keep only: the summary paragraph, sentiment dot, relevance fire emoji, and the "▶ Watch on YouTube" link.
2. **Add list/grid view toggle** — let users switch between list (current) and grid (card) layout
3. **Add pagination** — limit per page with Prev/Next controls (reuse the pagination component from the /projects page)

### Task 1: Remove trends/topics from insight cards

**`apps/web/app/youtube-insights/page.tsx`**
- Remove the trends/topics line from each insight card
- Each card now only shows: 🔥 (if relevance >= 7) + sentiment indicator (🟢/🟡/🔴) + summary paragraph + "▶ Watch on YouTube" link
- Simplify the card layout — cleaner, less visual noise

**`apps/web/lib/i18n.ts`**
- Remove `insights.trends`, `insights.topics` keys if they exist (no longer needed)

### Task 2: List/Grid view toggle

**`apps/web/app/youtube-insights/page.tsx`**
- Add a view toggle button at the top of the page (next to the heading or above the card list):
  - ☰ List view (default, current look)
  - ⊞ Grid view (cards in a 2-column grid)
- Persist the chosen view in a URL search param: `?view=list` or `?view=grid` (default: list)
- **List view**: current design — each insight is a full-width card
- **Grid view**: insights in a 2-column grid. Each card is more compact:
  - Same content (summary + sentiment + link) but with reduced padding/margin
  - Text is line-clamped to 4 lines (`line-clamp-4`) with a subtle fade
  - Cards have a lighter border, same hover effect

### Task 3: Pagination

**`apps/web/app/youtube-insights/page.tsx`**
- Add pagination: show 20 insights per page
- Add `?page=` URL search param for current page
- Below the insight list, add Prev/Next buttons (reuse the same pattern from `/projects`)
- Show "Page X of Y" text
- Fetch only the current page's data (use `getVideoInsights(limit, offset)` which already accepts limit/offset)

**`apps/web/lib/db.ts`**
- Update `getVideoInsights()` if needed — it should already support `(limit, offset)` pattern
- Add a new function if needed, or reuse existing pagination helpers

### Rules
- PR → wait for Vercel preview ✅ → merge to main → verify production
- Only touch apps/web/ files
- pnpm --filter @product-tracer/web typecheck must pass
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### After completing
1. Update CHANGELOG.md (new entry at top)
2. Delete this file so the agent knows no more tasks pending
3. Write summary to assistant-queue/FRONTEND_RESPONSE.md
