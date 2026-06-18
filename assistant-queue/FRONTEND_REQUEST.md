## Frontend Tasks

### Context
The YouTube Insights page was recently built as a text-only news digest (PR #23). Three things need fixing:

1. Shows English AND Chinese paragraphs for every insight — should be locale-aware (en→key_insight, zh→key_insight_zh)
2. Page heading "YouTube Insights" should be "Latest insights"
3. Home page "Latest video insights" → "Latest insights"

### Task 1: Locale-aware display for video insights

**`apps/web/app/youtube-insights/page.tsx`**
- Use the existing locale cookie to determine which paragraph to show:
  - Locale `en` → show `key_insight`
  - Locale `zh` → show `key_insight_zh`
- **Never show both** — switch based on locale like every other part of the site
- The rest of the card design stays (text-only, no thumbnails, trends/topics pills, YouTube link footnote)

**`apps/web/components/home-content.tsx`** — same locale-aware fix for the home strip.

### Task 2: Page heading and subtitle

**`apps/web/app/youtube-insights/page.tsx`**
- Page heading: "YouTube Insights" → "Latest insights" (use i18n key `insights.title`)
- Subtitle: "51 videos analysed for indie-dev & AI signal." → "Insights come from up to date trends." (i18n key `insights.subtitle`)

**`apps/web/lib/i18n.ts`**
- Add `insights.title`: "Latest insights" (en), "最新洞察" (zh)
- Add `insights.subtitle`: "Insights come from up to date trends." (en), "洞察来自最新趋势。" (zh)
- Change `home.insights.title`: "Latest video insights" → "Latest insights" (en), "最新视频洞察" → "最新洞察" (zh)

### Rules
- PR → wait for Vercel preview ✅ → merge to main → verify production
- Only touch apps/web/ files
- pnpm --filter @product-tracer/web typecheck must pass
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### After completing
1. Update CHANGELOG.md (new entry at top)
2. Delete this file so the agent knows no more tasks pending
3. Write summary to assistant-queue/FRONTEND_RESPONSE.md
