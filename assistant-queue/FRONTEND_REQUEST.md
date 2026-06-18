## Frontend Tasks

### Context
The backend agent is upgrading `app.video_insight` with a new column `key_insight_zh` — Chinese-language summary paragraphs. It's also changing the `key_insight` column from 1 sentence to 2-4 sentence paragraphs. The frontend needs to display the bilingual content.

### Task 1: Display bilingual insights

**`apps/web/lib/db.ts`**
- Add `key_insight_zh` to the `VideoInsight` interface and the SQL SELECT in `getVideoInsights()` / `getTopVideoInsights()`

### Task 2: Redesign YouTube Insights as bilingual news digest

**`apps/web/app/youtube-insights/page.tsx`**
- Remove `video-insights-list.tsx` (the old card-based component) — replace with inline content
- Fetch all insights at once (no pagination needed, it's a digest)
- Display each insight as a **compact card** showing:
  - **`key_insight`** (English paragraph) on one line
  - **`key_insight_zh`** (Chinese paragraph) on the next line, separated by a thin divider or in a slightly lighter gray
  - Small gray text: "Trends: [trend1], [trend2]" and "Topics: [topic1], [topic2]" — only if they exist
  - A tiny YouTube link like `▶ Watch on YouTube` in muted gray, opens in new tab
  - Sentiment indicator: green 🟢 / yellow 🟡 / red 🔴 pill
  - If relevance_score >= 7, a small "🔥" prefix
- **No thumbnail**, no channel name, no video title as heading
- **Bilingual display is automatic**: the zh translation shows below the en version on every screen (no toggle needed — show both)

Rough design (each card):
```
🔥 [English summary paragraph — 2-4 sentences from LLM]
   [中文总结段落 — LLM 生成的中文版本]

   趋势: MCP, AI Agents · 主题: developer tools
   🟢 ▶ Watch on YouTube
```

**`apps/web/app/youtube-insights/video-insights-list.tsx`** — delete this file (no longer used).

### Task 3: Home page update
**`apps/web/components/home-content.tsx`** — same compact text-only design for the "Latest video insights" strip. Show both en + zh, no thumbnails.

### Task 4: i18n labels
**`apps/web/lib/i18n.ts`** — add/update Chinese translations:
- `insights.trends` → "趋势"
- `insights.topics` → "主题"
- `insights.watchOn` → "在 YouTube 观看"
- `insights.sentimentPositive` → "积极"
- `insights.sentimentNeutral` → "中性"
- `insights.sentimentNegative` → "消极"

### Rules
- The backend will create migration 0009 (`key_insight_zh` column). This frontend task assumes the column exists **in your local dev DB** — if you can't test locally, just add `key_insight_zh` to the SELECT query as a nullable field (it'll work once migration is applied).
- PR → wait for Vercel preview ✅ → merge to main → verify production
- Only touch apps/web/ files
- pnpm --filter @product-tracer/web typecheck must pass
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### After completing
1. Update CHANGELOG.md (new entry at top)
2. Delete this FRONTEND_REQUEST.md so the agent knows no more tasks are pending
3. Write summary to assistant-queue/FRONTEND_RESPONSE.md
