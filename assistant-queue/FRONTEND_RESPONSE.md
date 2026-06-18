# Frontend Agent — Response

**Completed:** 2026-06-18T15:57Z
**PR:** #27 — https://github.com/JamesHuang22/product-tracer/pull/27 (merged, `5a48540`)
**Branch:** `feat/frontend-insights-views-filter`

List/Grid views, pagination, and a category filter for the YouTube Insights digest.

## Task 1 — declutter cards
Removed the trends/topics line. Each card now shows: 🔥 (relevance ≥ 7) + sentiment dot + summary paragraph + a muted **category badge** (only when `category` is present) + `▶ Watch on YouTube`.

## Task 2 — List/Grid toggle + pagination
- `?view=list|grid` (default `list`). List = full-width cards; Grid = 2-column compact cards with `line-clamp-4`.
- 20-per-page pagination via `?page=` with Prev/Next, fetching only the current page server-side via `getVideoInsights(limit, offset)`. Page is clamped to `[1, pageCount]`.

## Task 3 — category filter
- Category dropdown (`?category=`): "All categories" + the 8 canonical values, each annotated with a live count (e.g. "All categories (68)"). Filtering uses `getVideoInsightsByCategory(category, limit, offset)`.
- `view` + `category` + `page` compose in the URL (e.g. `?view=grid&category=developer_tools&page=2`). Changing the filter or view resets to page 1; the pager preserves both.
- New client component `app/youtube-insights/insights-controls.tsx` drives the dropdown + toggle; the cards and pager stay server-rendered.

### db.ts
- `category` added to `VideoInsight` and every select. Read via `to_jsonb(vi) ->> 'category'` (the category filter and count too), so the page **does not 500 if migration 0010 isn't applied yet** — it degrades to NULL / matches nothing until the column lands. `getTopVideoInsights` is covered as well, protecting the home page.
- New functions: `getVideoInsightsByCategory()`, `getVideoInsightCount(category?)`, `getVideoInsightCategories()`.

## Task 4 — i18n
`insights.categoryAll` + `insights.category{AiMl,DevTools,Startup,TechNews,Hardware,Security,Design,Other}` and `insights.viewList` / `insights.viewGrid` (en/zh).

## Verification
- `pnpm --filter @product-tracer/web typecheck` → passes. Local `next build` → succeeds (`/youtube-insights` 4.4 kB).
- Vercel preview (PR #27): ✅ pass → merged to `main` (`5a48540`).
- Production: `/` → **200**, `/youtube-insights` → **200**, `?view=grid&category=ai_ml` → **200**.
- Live HTML check: category `<select>` renders all 9 options with counts (`All categories (68)`, AI/ML, Developer Tools, Startup/Business, Tech News, Hardware, Security, Design, Other); category badges present on cards; old `Trends:` meta gone.

## Notes
- Migration 0010 (`category`) is already noted as shipped in CHANGELOG (backend), and the production data confirms it — 68 insights, AI/ML and other categories populated. The `to_jsonb` guard remains as defensive insurance.
- Category dropdown options are a fixed canonical list (so every category is always selectable); `getVideoInsightCategories()` supplies the live counts shown beside each.

## Post-completion
- `CHANGELOG.md`: PR #27 entry at top of the 2026-06-18 section (merged as part of the PR).
- `FRONTEND_REQUEST.md`: deleted.

## Scope
Only `apps/web/` (+ CHANGELOG.md docs). No `apps/worker/`, `packages/`, or `.github/workflows/`.

## Files changed
`apps/web/app/youtube-insights/page.tsx`, `apps/web/app/youtube-insights/insights-controls.tsx` (new), `apps/web/lib/db.ts`, `apps/web/lib/i18n.ts`, `CHANGELOG.md`
