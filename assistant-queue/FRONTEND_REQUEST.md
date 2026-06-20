## Frontend Tasks

### Context
Three improvements needed:

1. **Locale bug fix** — insights page still shows both EN and ZH paragraphs for every card (PR #25 was supposed to fix this but it's broken)
2. **Weekly Hot Trends page** — the backend is creating `app.weekly_trend` table (migration 0012) with a weekly report. Need a `/trends` page to display it
3. **Navigation** — add Trends to the site header

### Task 1: Fix locale-aware display on YouTube Insights

**`apps/web/app/youtube-insights/page.tsx`**
- The current code renders `key_insight` AND `key_insight_zh` both in the DOM (one visible, one hidden via CSS, or both visible). Fix it so only ONE paragraph renders per card, chosen by locale:
  - `locale === 'en'` → render `key_insight` only
  - `locale === 'zh'` → render `key_insight_zh` only
- Fallback: if the preferred field is null, show the other (never blank)
- Use `const text = locale === 'zh' ? (insight.key_insight_zh ?? insight.key_insight) : (insight.key_insight ?? insight.key_insight_zh)`

**`apps/web/components/home-content.tsx`** — same fix for the home strip

### Task 2: Weekly Hot Trends page

**`apps/web/app/trends/page.tsx`** (new)
- Server component, `force-dynamic`
- Fetch latest trend: `getLatestWeeklyTrend()`
- If no data yet, show empty state (use i18n keys)
- Layout:
  ```
  # Weekly Hot Trends / 本周热门趋势
  ## (subtitle / 副标题)

  ### Summary / 概要
  [summary_en or summary_zh based on locale]

  ### Top Products / 热门产品
  [cards showing: project name → linked to /projects/[slug], platform badge, description, score]

  ### Emerging Themes / 新兴主题
  [pills/badges for each theme]

  ### Video Highlights / 视频亮点
  [video_highlights text]
  ```
- Styling: cards with soft borders, dark mode support, consistent with rest of site

**`apps/web/lib/db.ts`** — add:
```typescript
export interface WeeklyTrend {
  id: string;
  week_start: string;
  week_end: string;
  summary_en: string;
  summary_zh: string;
  top_products: Array<{ name: string; slug: string; platform: string; description: string; score: number }>;
  emerging_themes: string[];
  video_highlights: string;
  total_projects_scanned: number;
  total_signals_generated: number;
  total_insights_collected: number;
  created_at: string;
}

export async function getLatestWeeklyTrend(): Promise<WeeklyTrend | null> {
  const rows = await sql<WeeklyTrend[]>`
    select * from app.weekly_trend
    order by created_at desc
    limit 1
  `;
  return rows[0] ?? null;
}
```

**`apps/web/lib/i18n.ts`** — add:
```typescript
trends: {
  title: { en: 'Weekly Hot Trends', zh: '本周热门趋势' },
  subtitle: { en: "What's hot in the indie dev space this week", zh: '本周独立开发者圈的热点' },
  summary: { en: 'Summary', zh: '概要' },
  topProducts: { en: 'Top Products', zh: '热门产品' },
  emergingThemes: { en: 'Emerging Themes', zh: '新兴主题' },
  videoHighlights: { en: 'Video Highlights', zh: '视频亮点' },
  noTrendsYet: { en: 'No trends yet. Check back after the weekly analysis runs.', zh: '暂无趋势数据。请等待每周分析完成后查看。' },
}
```

### Task 3: Navigation
**`apps/web/components/site-header.tsx`**
- Add Trends nav link after Insights: `Insights | Trends | Projects`

### Rules
- PR → wait for Vercel preview ✅ → merge to main → verify production
- Only touch apps/web/ files
- pnpm --filter @product-tracer/web typecheck must pass
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### After completing
1. Update CHANGELOG.md (new entry at top)
2. Delete this file so the agent knows no more tasks pending
3. Write summary to assistant-queue/FRONTEND_RESPONSE.md
