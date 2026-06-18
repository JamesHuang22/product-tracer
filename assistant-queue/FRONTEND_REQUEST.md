## Frontend Tasks

### Context
Three improvements needed for the YouTube Insights page:

1. Remove trends/topics from each insight card (too noisy)
2. Add list/grid view toggle with pagination
3. Add category filter — the backend is adding a `category` column (migration 0010), each insight tagged as ai_ml, developer_tools, startup_business, tech_news, hardware, security, design, or other

### Task 1: Remove trends/topics from insight cards

**`apps/web/app/youtube-insights/page.tsx`**
- Remove the trends/topics line from each card
- Each card now only shows: 🔥 (if relevance >= 7) + sentiment dot + summary paragraph + "▶ Watch on YouTube" link
- Cleaner, less visual noise

### Task 2: List/Grid view toggle with pagination

**`apps/web/app/youtube-insights/page.tsx`**
- Add a view toggle at the top: ☰ List / ⊞ Grid (via URL search param `?view=list` or `?view=grid`, default: list)
- **List view**: current full-width card design (cleaned up — no trends/topics)
- **Grid view**: 2-column grid, more compact cards, text `line-clamp-4`
- **Pagination**: 20 insights per page, `?page=` URL param, Prev/Next controls below the list (reuse pattern from /projects)
- Fetch only the current page: `getVideoInsights(limit, offset)`

**`apps/web/lib/db.ts`**
- The `VideoInsight` interface already has all fields. Make sure `category` is included in the SELECT query (added by backend).

### Task 3: Category filter

**`apps/web/app/youtube-insights/page.tsx`**
- At the top of the page (above the insights, near the view toggle), add a **category dropdown** filter:
  - "All categories" (default) + one option per insight category
  - Options: All, AI/ML, Developer Tools, Startup/Business, Tech News, Hardware, Security, Design, Other
- When a category is selected, filter the displayed insights on the backend: `WHERE category = <selected>` (use `getVideoInsightsByCategory(category, limit, offset)`)
- Category selection goes into URL: `?category=ai_ml` (or no param for "All")
- The category filter and view toggle should work together: `?view=grid&category=developer_tools&page=2`

**`apps/web/lib/db.ts`**
- Add function: `getVideoInsightsByCategory(category: string, limit: number, offset: number)` — filters by category value
- Add function: `getVideoInsightCount(category?: string)` — total count (for pagination). Accept optional category filter.
- Add function: `getVideoInsightCategories()` — returns distinct category values with counts (`SELECT category, count(*) as cnt FROM app.video_insight GROUP BY category ORDER BY cnt DESC`)

### Task 4: i18n for categories

**`apps/web/lib/i18n.ts`**
- Add category label translations:
  - `insights.categoryAll`: "All categories" / "全部分类"
  - `insights.categoryAiMl`: "AI/ML" / "AI/ML"
  - `insights.categoryDevTools`: "Developer Tools" / "开发工具"
  - `insights.categoryStartup`: "Startup/Business" / "创业/商业"
  - `insights.categoryTechNews`: "Tech News" / "科技新闻"
  - `insights.categoryHardware`: "Hardware" / "硬件"
  - `insights.categorySecurity`: "Security" / "安全"
  - `insights.categoryDesign`: "Design" / "设计"
  - `insights.categoryOther`: "Other" / "其他"
  - `insights.viewList`: "List" / "列表"
  - `insights.viewGrid`: "Grid" / "网格"

### Rules
- The backend is creating migration 0010 (`category` column in `app.video_insight`). This frontend task assumes the column exists — add it to SELECT queries as a nullable field; if null show no category badge.
- PR → wait for Vercel preview ✅ → merge to main → verify production
- Only touch apps/web/ files
- pnpm --filter @product-tracer/web typecheck must pass
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### After completing
1. Update CHANGELOG.md (new entry at top)
2. Delete this file so the agent knows no more tasks pending
3. Write summary to assistant-queue/FRONTEND_RESPONSE.md
