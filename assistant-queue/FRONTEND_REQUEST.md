## Frontend Tasks

### Context
The backend agent is creating a **Weekly Hot Trend** pipeline — a cron job that aggregates all data from the past 7 days (projects, Product Hunt, YouTube Insights, GitHub, HN, Reddit) and generates a weekly summary with:
- Top trending products/startups
- Emerging themes and technologies
- Key insights from videos
- Notable launches

This frontend request is for the **UI** to display the weekly trend report.

### Task 1: Weekly Hot Trends page

**`apps/web/app/trends/page.tsx`** (new)
- Server component that fetches the latest weekly trend
- **Layout**: A clean, modern page showing:
  - **Header**: "Weekly Hot Trends" / "本周热门趋势" (use i18n keys `trends.title`, `trends.subtitle`)
  - **Summary section**: A text overview paragraph (the LLM-generated weekly summary)
  - **Top Products section**: List of top projects/launches this week, each showing:
    - Project name (linked to `/projects/[slug]`)
    - Platform badge (GitHub/HN/PH/YouTube)
    - One-line description
    - Star/vote count if available
  - **Emerging Themes**: Tags/keywords that appeared frequently this week (as pills/badges)
  - **Video Insights roundup**: Link to `/youtube-insights` with a note about what YouTube discovered this week
- Styling: Modern cards with subtle borders, dark mode support, consistent with the rest of the site

### Task 2: i18n keys

**`apps/web/lib/i18n.ts`**
```typescript
trends: {
  title: { en: 'Weekly Hot Trends', zh: '本周热门趋势' },
  subtitle: { en: 'What\'s hot in the indie dev space this week', zh: '本周独立开发者圈的热点' },
  topProducts: { en: 'Top Products', zh: '热门产品' },
  emergingThemes: { en: 'Emerging Themes', zh: '新兴主题' },
  videoRoundup: { en: 'Video Insights Roundup', zh: '视频洞察汇总' },
  noTrendsYet: { en: 'No trends data yet. Check back after the weekly analysis runs.', zh: '暂无趋势数据。请等待每周分析完成后查看。' },
}
```

### Task 3: Navigation link
**`apps/web/components/site-header.tsx`**
- Add a "Trends" / "趋势" nav link after "Insights"

### Task 4: DB query
**`apps/web/lib/db.ts`**
- Add `getLatestWeeklyTrend()` — fetches the most recent trend report row (or returns null if none yet)
  ```typescript
  export async function getLatestWeeklyTrend(): Promise<WeeklyTrend | null> {
    const rows = await sql<WeeklyTrend[]>`
      select * from app.weekly_trend
      order by created_at desc
      limit 1
    `;
    return rows[0] ?? null;
  }
  ```
- Add a `WeeklyTrend` interface matching the DB schema

### Rules
- The backend is creating `app.weekly_trend` table (migration 0012). This frontend assumes the table exists. If it doesn't, the page shows the empty state.
- PR → wait for Vercel preview ✅ → merge to main → verify production
- Only touch apps/web/ files
- pnpm --filter @product-tracer/web typecheck must pass
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### After completing
1. Update CHANGELOG.md (new entry at top)
2. Delete this file so the agent knows no more tasks pending
3. Write summary to assistant-queue/FRONTEND_RESPONSE.md
