## Frontend Tasks

### Context
The YouTube Insights page was recently redesigned as a text-only news digest. However, it currently shows English AND Chinese paragraphs together for every insight. The user wants **locale-aware display**: show English when locale is English, Chinese when locale is Chinese — just like the rest of the site's i18n system.

### Task 1: Locale-aware display for video insights

**`apps/web/app/youtube-insights/page.tsx`**
- Use the existing locale cookie (same as the rest of the site) to determine which paragraph to show:
  - Locale `en` → show `key_insight`
  - Locale `zh` → show `key_insight_zh`
- **Never show both** — switch based on locale like every other part of the site
- The rest of the card design stays the same: text-only, no thumbnails, trends/topics as pills, YouTube link as footnote

**`apps/web/app/youtube-insights/video-insights-list.tsx`** — if this still exists, update it the same way. If it was already deleted, just update the page.tsx.

**`apps/web/components/home-content.tsx`** — same locale-aware fix for the "Latest video insights" strip on the home page.

**`apps/web/lib/db.ts`** — the `VideoInsight` type must already have `key_insight_zh` from the previous PR. No changes needed unless it was missed.

### Rules
- PR → wait for Vercel preview ✅ → merge to main → verify production
- Only touch apps/web/ files
- pnpm --filter @product-tracer/web typecheck must pass
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### After completing
1. Update CHANGELOG.md (new entry at top)
2. Delete this file so the agent knows no more tasks pending
3. Write summary to assistant-queue/FRONTEND_RESPONSE.md
