## Frontend Tasks

### Context
The YouTube Insights page has a bug: English AND Chinese summary paragraphs (`key_insight` + `key_insight_zh`) are BOTH displayed on every card, regardless of the selected locale. PR #25 was supposed to fix this (locale-aware display) but it's clearly not working.

The correct behavior:
- EN locale → show only `key_insight` (English)
- ZH locale → show only `key_insight_zh` (Chinese)
- NEVER show both at the same time

### Task 1: Fix locale-aware display on YouTube Insights page

**`apps/web/app/youtube-insights/page.tsx`**
- Locale comes from the `initialLocale` prop / cookie (same as the rest of the site)
- When rendering each insight card, pick the right paragraph:
  - `locale === 'en'` → show `key_insight`
  - `locale === 'zh'` → show `key_insight_zh`
- Fallback: if the chosen locale's field is null/empty, show the other one (so a card is never blank)

**`apps/web/components/home-content.tsx`** — same fix for the "Latest insights" strip on the home page.

**`apps/web/lib/db.ts`** — ensure `key_insight_zh` is included in SELECT queries (it should already be there from PR #23).

### Task 2: Test the fix
- Toggle the EN/中文 button on the site header
- EN should show only English paragraphs
- 中文 should show only Chinese paragraphs
- No card should show both languages

### Rules
- PR → wait for Vercel preview ✅ → merge to main → verify production
- Only touch apps/web/ files
- pnpm --filter @product-tracer/web typecheck must pass
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### After completing
1. Update CHANGELOG.md (new entry at top)
2. Delete this file so the agent knows no more tasks pending
3. Write summary to assistant-queue/FRONTEND_RESPONSE.md
