## Frontend Tasks

### Context
The YouTube Insights page (`/youtube-insights`) was shipped in PR #21. It currently shows video cards with thumbnails, channel info, sentiment badges, etc. — too much like a YouTube clone.

**Goal**: Redesign as a **news digest** view. Each insight is a clean paragraph of text (bilingual — English + Chinese), with the YouTube link as a small footnote. No thumbnails, no channel names, no video titles taking center stage.

### Task 1: Redesign YouTube Insights as news digest

**`apps/web/app/youtube-insights/page.tsx`**
- Remove `video-insights-list.tsx` (the card-based component) — replace with inline content
- Fetch all insights at once (no pagination needed, it's a digest)
- Display each insight as a **compact card** containing:
  - The **key_insight** text (LLM summary of the video)
  - Small gray text: "Trends: [trend1], [trend2]" and "Topics: [topic1], [topic2]" — only if they exist
  - A **tiny YouTube link** like `▶ Watch on YouTube` in muted gray — opens in new tab
  - A subtle sentiment indicator (emoji or single-character badge: 🟢/🟡/🔴)
  - If relevance_score >= 7, a small "🔥" prefix
- **No thumbnail**, no channel name displayed, no video title
- **Bilingual**: `key_insight` is already English from the LLM. Add Chinese translations for UI labels using the existing i18n system — the insight text stays as-is (LLM output), but headers, labels (Trends, Topics, Watch on YouTube) should use `t()` from `useI18n`.

Rough design (what each card looks like):
```
🔥 [key_insight text — the LLM summary]
   Trends: MCP, AI Agents · Topics: developer tools, productivity
   🟢 ▶ Watch on YouTube — Channel Name
```

**`apps/web/lib/i18n.ts`**
- Add Chinese translations for new labels:
  - `insights.trends` → "趋势"
  - `insights.topics` → "主题"  
  - `insights.watchOn` → "在 YouTube 观看"
  - `insights.sentimentPositive` → "积极"
  - `insights.sentimentNeutral` → "中性"
  - `insights.sentimentNegative` → "消极"

### Task 2: Home page update
In `apps/web/components/home-content.tsx`, the "Latest video insights" strip should also use the same compact text-only design (no thumbnails, just text + link).

### Task 3: Remove old files
- Delete `apps/web/app/youtube-insights/video-insights-list.tsx` (no longer needed)

### Rules
- PR → wait for Vercel preview ✅ → merge to main → verify production
- Only touch apps/web/ files
- pnpm --filter @product-tracer/web typecheck must pass
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### After completing
1. Update CHANGELOG.md (new entry at top)
2. Update DECISIONS.md if architecture decision changes
3. Delete this FRONTEND_REQUEST.md so the agent knows no more tasks are pending
4. Write summary to assistant-queue/FRONTEND_RESPONSE.md
