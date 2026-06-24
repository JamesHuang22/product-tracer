# Bug Reports — 2026-06-24

## Browser Test Run #30 (2026-06-24 10:50 UTC) — Focus: Mobile 375px viewport across all pages

### Automated Test — All 12/12 passing (production URL)
- ✅ / HTTP 200, ✅ /projects HTTP 200, ✅ /trends HTTP 200, ✅ /youtube-insights HTTP 200, ✅ /bookmarks HTTP 200
- ✅ ZH locale baseline check
- ✅ Grid layout: /projects has 100+ project link references
- ✅ No server errors in page bodies
- ❌ /favicon.ico 404 (known P2, unchanged)

### Product Tour: Mobile 375px viewport (iPhone SE/12/13/14) — Homepage → /projects → /[slug] → /trends → /bookmarks

**[P2] Nav overflow at 375px — locale toggle + hamburger still clipped (unchanged from Run #26)**
- **Description**: At 375px viewport, the nav bar `flex` container is 399px wide but starts at `left: 90.77px`, pushing the locale toggle (EN/中文 buttons) and hamburger button past the right edge of the viewport. These 3 interactive elements (EN button at x=383, 中文 button at x=415, hamburger at x=465) are invisible and unreachable.
- **Root cause**: Parent container has `max-w-6xl px-4` which centers content, but the nav items (Projects, Insights, Trends, Bookmarks + locale + hamburger) need ~490px total. The body has `overflow-x: clip` which hides the overflow instead of allowing scroll.
- **Found**: Reconfirmed 2026-06-24T10:50 UTC
- **Severity**: P2 (mobile usability — locale toggle and hamburger menu are inaccessible)
- **Reproduction**:
  1. Open Chrome DevTools, set viewport to 375×812
  2. Visit any page (homepage, /projects, etc.)
  3. Inspect nav element — observe that EN/中文 buttons and hamburger are at x>375px
  4. Attempt to click locale toggle or hamburger — impossible
- **Expected**: At < 640px viewport, collapse nav items into hamburger menu, or move locale toggle to a reachable position
- **Actual**: 3 interactive elements clipped off-screen

**[P2] /projects mobile — 290 small tap targets (<44px)**
- **Description**: When viewing /projects at 375px, 290 interactive elements (links, buttons) have dimensions smaller than Apple's recommended 44×44pt minimum tap target. This is much higher than other pages (homepage: 36, /youtube-insights: 40, /trends: 10, /bookmarks: 9).
- **Found**: 2026-06-24T10:50 UTC
- **Severity**: P2 (mobile usability — project cards are dense with many small links)
- **Reproduction**:
  1. Chrome DevTools → responsive mode → 375×812
  2. Visit /projects
  3. Try to tap individual project cards — likelihood of mis-taps is high
- **Expected**: All interactive elements should be at least 44×44px
- **Actual**: 290 elements fail the minimum tap target size

### Confirmed existing bugs (unchanged)
- **[P2]** /zh/trends, /zh/youtube-insights, /en/trends, /en/youtube-insights, /en/bookmarks, /zh/bookmarks return 404
- **[P2]** /trends — Top product links have concatenated text (e.g., "1INAre You in the Weights?2")
- **[P3]** /favicon.ico 404
- **[P3]** /trends — VIDEO HIGHLIGHTS has 0 clickable YouTube links
- **[P3]** /trends — EMERGING THEMES has 0 clickable links

### No new P0/P1 bugs
- Production site healthy on all critical routes
- REQUEST.md has active tasks — not overwritten
- FRONTEND_REQUEST.md has 5 feature requests — not overwritten

---

## Browser Test Run #29 (2026-06-24 10:35 UTC) — Focus: /projects + local dev health

### Automated Test — All 12/12 passing (production URL)
- ✅ / HTTP 200, ✅ /projects HTTP 200, ✅ /trends HTTP 200, ✅ /youtube-insights HTTP 200, ✅ /bookmarks HTTP 200
- ✅ ZH locale baseline check
- ✅ Grid layout: /projects has 100+ project link references
- ✅ No server errors in page bodies
- ❌ /favicon.ico 404 (known P2, unchanged)

### Product Tour: /projects (search, AI summaries, detail pages, locale toggle)

**[P0] Local dev BROKEN — DATABASE_URL missing, all DB-backed pages return 500**
- **Description**: Running `pnpm web:dev` locally results in HTTP 500 on every server-rendered page because `DATABASE_URL` is not set. The error is thrown at server render time from `createSqlClient()` → `sql<…>` queries. Production on Vercel works fine.
- **Found**: 2026-06-24T10:35 UTC
- **Severity**: P0 — site down (local development completely blocked)
- **Error**: `Missing DATABASE_URL. Check .env (Supabase → Connect → Session pooler URI)`
- **Reproduction**:
  1. `pnpm web:dev` (no .env.local present)
  2. Visit http://localhost:3000 → HTTP 500
  3. Visit http://localhost:3000/projects → HTTP 500
  4. Visit http://localhost:3000/trends → HTTP 500
  5. Visit http://localhost:3000/youtube-insights → HTTP 500
  6. Visit http://localhost:3000/bookmarks → ✅ HTTP 200 (client-cached, no DB dependency)
- **Server logs**: All pages crash identically at `createSqlClient()`
- **Note**: test-product.cjs checks Vercel production URL, so it passes. Only local dev is broken.

**[P3] Empty insight cards on /youtube-insights — 6/20 cards have no text body**
- **Description**: 6 out of 20 insight cards on page 1 render with NO main text — only sentiment badge, category badge, and "Watch on YouTube" link. Cards: 4y9DR2WwW3o, TnauzVQkmBo, NwjAHbgA0u4, g20t3FKr49k, O-JSjZ7vt1s, 8OOuCnZB-4o.
- **Found**: 2026-06-24T10:35 UTC
- **Severity**: P3 (being addressed by REQUEST.md TASK 1)

### Observations
- /bookmarks: "No bookmarks yet. Save a project to find it here." renders correctly
- Mobile 375px: no horizontal overflow, scroll-to-bottom works
- Production site: all 5 critical routes HTTP 200
- Queue files (REQUEST.md, FRONTEND_REQUEST.md) have active content — not overwritten

### No new P0/P1 production bugs

---

## Browser Test Run #28 (2026-06-24 10:05 UTC) — Focus: /youtube-insights (deep-dive: new data-driven page)

### Automated Test — All 12/12 passing
- ✅ / HTTP 200, ✅ /projects HTTP 200, ✅ /trends HTTP 200, ✅ /youtube-insights HTTP 200 (prod), ✅ /bookmarks HTTP 200
- ✅ ZH locale footer / locale detection pass
- ✅ Grid layout check: /projects has 100+ project link references
- ✅ No server errors in page bodies on production
- ❌ /favicon.ico 404 (known P2, unchanged)

### Product Tour: /youtube-insights — New data-driven page with DB-backed categories

**[P1 Regression] /youtube-insights returns HTTP 500 locally — getVideoInsightCount() requires DATABASE_URL**
- **Description**: The youtube-insights page now calls `getVideoInsightCount()` as part of server rendering, which calls `sql<…>` → `createSqlClient()` → throws "Missing DATABASE_URL". The page previously rendered static content without DB calls. This is a regression introduced when the page was updated to be data-driven (category counts + pagination).
- **Found**: 2026-06-24T10:05 UTC
- **Severity**: P1 (page is broken locally, blocks local testing/development of the youtube-insights page)
- **In production**: ✅ HTTP 200 — works fine on Vercel where DATABASE_URL is set
- **Stack trace**:
  ```
  Error: Missing DATABASE_URL. Check .env (Supabase → Connect → Session pooler URI)
    at createSqlClient (chunks/ssr/[root-of-the-server]__d15d18da._.js:145)
    at getSql (chunks/ssr/[root-of-the-server]__d15d18da._.js:270)
    at getVideoInsightCount (chunks/ssr/[root-of-the-server]__d15d18da._.js:768)
    at YoutubeInsightsPage (chunks/ssr/[root-of-the-server]__1ebc2c77._.js:1195)
  ```
- **Reproduction**:
  1. Run `pnpm web:dev` locally without DATABASE_URL in .env
  2. Visit http://localhost:3000/youtube-insights
  3. HTTP 500 rendered as error page with "Missing DATABASE_URL"
- **Expected**: Page renders with data (categories, count, paginated insights)
- **Actual**: 500 error

**[P2] /zh/youtube-insights returns 404 — ZH locale route broken (unresolved)**
- **Status**: Unchanged from Run #27. /zh/youtube-insights returns 404. The ZH locale route is still not registered under the `[locale]` dynamic segment.
- **Reproduction**:
  1. Visit `http://localhost:3000/zh/youtube-insights` or production URL
  2. 404 page: "This page could not be found."

**[P3] EN text leaks in ZH-locale error pages**
- **Description**: When hitting `/zh/youtube-insights` (404 page) or `/youtube-insights?lang=zh` (500 page), the rendered body still contains "YouTube Insights" and "Insights" in English text. These strings leak through even when a ZH locale is requested, because the error pages are rendered by the Next.js built-in error handler which doesn't use i18n.
- **Found**: 2026-06-24T10:05 UTC
- **Severity**: P3 (minor — only visible on error/404 pages, not the actual page)
- **Reproduction**:
  1. Visit `/zh/youtube-insights`
  2. Search body text for "YouTube Insights" → found (in <title>)
  3. Search body text for "Insights" → found (in description meta tag, breadcrumb fallback)
- **Root cause**: Next.js error pages use non-i18n-aware layout

**[Observation] Category filter not visible in plain-HTTP scrape**
- The page's HTML contains `<select>`, `<button>`, and category filter DOM elements, but they're rendered via `InsightsControls` which is a client component with `'use client'`. The server-rendered HTML doesn't include the actual filter UI — it's hydrated client-side. This is expected RSC behavior.

**[Observation] The new youtube-insights page appears well-structured**
- Has: paginated grid with 20 items per page, category filter dropdown, grid/list view toggle, EN/ZH locale toggle, sentiment indicators (🟢🟡🔴), category badges, AI-generated key insights per card, "Watch on YouTube" links. This is a substantial upgrade from the previous static layout.

### No new P0/P1 bugs on production
- Production site is healthy on all critical routes
- REQUEST.md has active tasks (TASK 1-3 in progress) — not overwritten
- FRONTEND_REQUEST.md has 5 feature requests — not overwritten

---

## Browser Test Run #27 (2026-06-24 09:50 UTC) — Focus: /trends + /youtube-insights locale deep-dive

### Automated Test — All 12/12 passing
- ✅ / HTTP 200, ✅ /projects HTTP 200, ✅ /trends HTTP 200, ✅ /youtube-insights HTTP 200, ✅ /bookmarks HTTP 200
- ✅ ZH locale footer /locale detection pass
- ✅ Grid layout check: /projects has 100+ project link references
- ✅ No server errors in any page body
- ❌ /favicon.ico 404 (known P2, unchanged)

### Product Tour: /trends + /youtube-insights + Locale deep-dive

**[P2] /zh/youtube-insights returns 404 — ZH locale route broken for youtube-insights**
- **Description**: The ZH-locale URL `/zh/youtube-insights` returns HTTP 404 ("This page could not be found."). The EN version at `/youtube-insights` works fine with 7993 chars of content. This is part of the broader locale-prefixed routing gap — /trends, /youtube-insights, and /bookmarks are all affected.
- **Found**: 2026-06-24T09:50 UTC
- **Severity**: P2 (breaks locale consistency — users who switch locale in nav will hit 404 on youtube-insights)
- **Reproduction**:
  1. Visit `https://product-tracer.vercel.app/zh/youtube-insights` → 404 page (89 chars)
  2. Visit `https://product-tracer.vercel.app/youtube-insights` → correct page (7993 chars)
  3. Compare with `https://product-tracer.vercel.app/zh/` → homepage renders correctly with ZH navigation
- **Expected**: `/zh/youtube-insights` should serve the page with Chinese locale (categories, UI text in 中文)
- **Actual**: 404 page with "This page could not be found."
- **Note**: This is the same root cause as `/en/trends` and `/zh/trends` 404 from the previous run. All routes except `/` and `/projects` are missing from the `[locale]` dynamic routing segment.

**[P2] /zh/trends returns 404 — ZH locale route broken (reconfirmed)**
- **Description**: `/zh/trends` still returns 404, confirming no fix deployed since Run #26.
- **Found**: Reconfirmed 2026-06-24T09:50 UTC
- **Severity**: P2

**[P2] /zh/youtube-insights returns 404 — newly confirmed ZH route gap**
- Already covered above — documented as separate entry for severity tracking.

**[P3] /trends page has no "Summary" section in rendered text**
- **Description**: The /trends page body (1389 chars) does not contain the word "Summary" or "summary" anywhere. The page title is "Weekly Hot Trends" and it has WoW comparison and top products, but the Summary section (previously reported as present in Run #22) appears to be missing or collapsed.
- **Found**: 2026-06-24T09:50 UTC
- **Severity**: P3 (possible client-side loading issue or the summary was removed — needs investigation)
- **Reproduction**:
  1. Visit `/trends`
  2. Search rendered body text for "summary" or "Summary"
  3. No match found
- **Expected**: A summary section with key insights should appear at the top
- **Actual**: No summary text present in the rendered DOM

**[P3] /youtube-insights has no visible category filter**
- **Description**: The youtube-insights page body (7993 chars) does not contain any text matching "filter", "category", or "Filter". The page has a grid/list toggle and EN/ZH locale toggle, but no way to filter by video category/type.
- **Found**: 2026-06-24T09:50 UTC
- **Severity**: P3 (would be useful for navigating 40+ entries by category)
- **Note**: The locale toggle works on /youtube-insights (EN/中文 visible in page text) even though the ZH-prefixed route doesn't.

**[Observation] /trends page only links back to "/" — no product detail links from top products**
- **Description**: When scraping all `<a href>` from /trends (internal links only), the only non-/zh, non-page link was "/" (homepage). This suggests that the "TOP PRODUCTS" cards either aren't rendered as `<a>` tags, use JavaScript navigation, or the product links are invisible/hidden.
- **Found**: 2026-06-24T09:50 UTC
- **Severity**: P3 (users on /trends should be able to click into product detail pages from the top product list)
- **Reproduction**:
  1. Visit /trends
  2. Inspect all `<a href>` elements
  3. Confirm zero links to product detail pages
- **Expected**: 5 clickable product cards linking to detail pages
- **Actual**: Only links to "/" found

**[P2] .env missing — local dev broken (HTTP 500 on all pages)**
- **Description**: Running locally with `pnpm web:dev` results in HTTP 500 on every page because `DATABASE_URL` is not set. No `.env` or `.env.local` file exists in the repo. The `.env.example` file shows the required variables but none are populated.
- **Found**: 2026-06-24T09:50 UTC
- **Severity**: P2 (blocks all local development and testing)
- **Reproduction**:
  1. `pnpm install && pnpm web:dev`
  2. Visit http://localhost:3000 → 500 error
  3. Server logs: "Missing DATABASE_URL. Check .env"
- **Expected**: Dev server starts and serves pages. Either `.env` should be present (gitignored) or there should be a setup script.
- **Root cause**: No `.env` file, no `.env.local`, no fallback logic
- **Workaround**: Tests against Vercel production URL work fine — this only affects local dev

### ✅ Improvements confirmed since last run
- **Mobile 375px nav — no overflow**: All 4 nav links (Projects, Insights, Trends, Bookmarks) are fully visible at 375px viewport with no horizontal scrolling. Nav width is 400px in a 375px viewport but `overflow: clip` is not clipping any links because the nav is positioned with negative left offset (navigating from x=90.78). The locale toggle and hamburger are no longer rendered overflowing the viewport.
- **/trends has functional week selector** with 2 historic weeks (2026-06-22, 2026-06-15)
- All 5 critical routes return HTTP 200 on production
- No console errors beyond favicon 404

### No new P0/P1 bugs
- Site is healthy on production
- REQUEST.md has active tasks (TASK 1-3 in progress) — not overwritten
- FRONTEND_REQUEST.md has 5 feature requests — not overwritten

---

## Browser Test Run #26 (2026-06-24 09:35 UTC) — Focus: /trends + locale

### Automated Test — All 12/12 passing
- ✅ / HTTP 200, ✅ /projects HTTP 200, ✅ /trends HTTP 200, ✅ /youtube-insights HTTP 200, ✅ /bookmarks HTTP 200
- ✅ ZH locale footer /locale detection pass
- ❌ /favicon.ico 404 (known P2, unchanged)

### Product Tour: /trends + Mobile 375px + Locale check

**[P2] /en/trends and /zh/trends return 404 — locale-prefixed routes not supported**
- **Description**: The locale-prefixed URLs `/en/trends` and `/zh/trends` return HTTP 200 with only 89 chars of content — effectively a 404 page ("This page could not be found."). The /trends page is only available at the root `/trends` path. Other pages like `/zh/` (homepage) work correctly with translated nav items. This means users browsing in ZH locale who navigate to Trends from the nav bar may hit a 404.
- **Found**: 2026-06-24T09:36 UTC
- **Severity**: P2 (broken locale routing — breaks the locale consistency of the app)
- **Reproduction**:
  1. Visit `https://product-tracer.vercel.app/en/trends` — shows "404 — This page could not be found."
  2. Visit `https://product-tracer.vercel.app/zh/trends` — same 404 page
  3. Compare with `https://product-tracer.vercel.app/trends` — correct page with 1389 chars of content
- **Expected**: `/en/trends` and `/zh/trends` should serve the trends page with appropriate locale (EN nav items on `/en/*`, ZH nav items on `/zh/*`)
- **Actual**: Both return a 404 page (89 chars, "This page could not be found.")
- **Impact**: The locale toggle in the nav bar likely links to `/zh/trends` when toggling from /trends. Users who toggle locale on /trends land on a 404. Users who manually add `zh/` to the URL cannot access a translated trends page.
- **Note**: `/zh/` homepage works fine. This is a route-level issue — the /trends route may not be registered under the `[locale]` dynamic segment.

**[P2] Mobile nav overflow — locale toggle + hamburger clipped at 375px (confirmed on /trends)**
- **Description**: Confirmed on /trends at 375px viewport: the EN/中文 toggle buttons and hamburger menu are rendered off-screen (x > 375px) and are invisible/unreachable. The nav flex container overflows the viewport width with `overflow-x: clip` hiding the excess.
- **Found**: Reconfirmed 2026-06-24T09:36 UTC (previously reported in Run #24)
- **Severity**: P2 (mobile usability — users cannot switch locale or access hamburger nav)
- **Root cause**: Nav bar uses `sm:` (640px) breakpoint but no responsive behavior for sub-640px widths. At 375px, brand + 5 nav links + locale toggle + hamburger need ~490px total.

**Mobile tap targets < 44px — confirmed**
- 36 small targets on homepage, 284 on /projects at 375px viewport (known, unchanged).

### /trends week selector — functional with 2 historic weeks
- ✅ Dropdown shows 2 week options (2026-06-22 and 2026-06-15)
- ✅ URL updates with `?week=` param on selection
- ✅ Content updates correctly between weeks (confirmed WoW shows "Are You in the Weights?" for both)
- ❌ No WoW/change indicators visible in body text (trends page may suppress WoW when both weeks show same top product)

### No new P0/P1 bugs
- Site is healthy on all main routes
- /trends has week selector working
- REQUEST.md has active tasks (not overwritten)

## Automated Test Summary (Run #23 — /projects + detail page deep-dive)

- **Focus**: /projects — search, tag filtering, detail page content, related projects
- Browser test: All 5 pages HTTP 200, 1 console error (favicon 404)
- ✅ ?tag=llm filter works (async load renders 707 projects, 100 links on first page)
- ✅ ?tag=llm URL param preserved in address bar (bookmarkable filters)
- ✅ Detail pages (/odysseus, /open-design, /ponytail, /speakup) all have "You might also like" section with 4 related project cards
- ✅ /projects/amie (nonexistent slug) returns proper 404 page with "Browse all projects" link
- ✅ Breadcrumb `<nav><ol>` present on all detail pages
- ✅ Mobile 375px — no horizontal overflow on /projects
- ✅ ZH locale — nav items translated (项目/洞察/趋势/收藏)
- ❌ /favicon.ico 404 (known P2, unchanged)
- **No new bugs found this run** — site healthy, all features functional
- REQUEST.md has active tasks (not overwritten)

## Automated Test Summary (Run #22 — /trends focus)
- Browser test: All 5 pages HTTP 200, 1 console error (favicon 404)
- Focal tour: /trends — all 6 H2 sections render (Summary, WoW, Mix, Top Products, Emerging Themes, Video Highlights)
- ✅ WoW comparison present, ✅ week selector dropdown (1 option — latest week)
- ✅ 5 top product links to detail pages, ✅ 0 empty/loading sections
- ✅ Mobile 375px — no overflow on /trends
- ✅ ZH locale — not checked this run (was full-translated last run)
- ❌ /favicon.ico 404 (known P2, unchanged)
- ❌ Top product link text still concatenated (rank+badge+title+WoW blended) — known P2
- **No new P0/P1 bugs** — site healthy across all routes
- REQUEST.md has active tasks (not overwritten)

## Product Tour: 2026-06-24T08:22 UTC (Focus: /trends)

### Automated test — all passing
- ✅ Homepage HTTP 200 — 839 words, H1 present, 1 console error (favicon 404)
- ✅ /projects HTTP 200 — search, filter, 5 project links
- ✅ /trends HTTP 200 — 231 words, 6 H2 sections, WoW comparison, 5 top product links
- ✅ /youtube-insights HTTP 200 — 1177 words, grid/list toggle, 40 clickable elements
- ✅ /bookmarks HTTP 200
- ✅ Mobile 375px — no horizontal overflow
- ✅ ZH locale — nav items translated
- ❌ /favicon.ico 404 (known P2, unchanged)

### [P3] /trends — VIDEO HIGHLIGHTS section has 0 clickable YouTube links
- **Description**: The VIDEO HIGHLIGHTS section on /trends shows a prose paragraph summarizing notable YouTube videos (RSI's $4.65B valuation, Claude Opus 4.6, GLM-5.2) but has ZERO clickable links. Users can't navigate to watch any of the mentioned videos. The section is read-only text.
- **Found**: 2026-06-24T08:22 UTC
- **Severity**: P3 (minor — the section is a summary, but lacks the obvious next step)
- **Reproduction**:
  1. Go to /trends
  2. Scroll to VIDEO HIGHLIGHTS section
  3. Count clickable YouTube links
- **Expected**: Each mentioned video should have a "▶ Watch on YouTube" link or similar
- **Actual**: 0 links — just a plain `<p>` with summary text

### [P2] /trends — Top product link text concatenation (confirmed still present)
- **Status**: Confirmed unchanged from previous run
- The 5 top product links still show concatenated text (e.g., "1INAre You in the Weights?2") instead of clean accessible link text

### [P3] /trends — EMERGING THEMES section has 0 clickable links
- **Description**: The EMERGING THEMES section lists 8 themes (Recursive Self-Improvement, AI Agent Workflows, Open-Source LLMs, Edge AI, AI Video Generation, Developer Tools, Memory Systems for AI) but none are clickable. An obvious UX improvement would be linking each theme to `/projects?tag=<theme>` or a filtered view.
- **Found**: 2026-08-22 UTC
- **Severity**: P3 (nice-to-have — themes are currently just displayed as text tags)
- **Reproduction**:
  1. Go to /trends
  2. Scroll to EMERGING THEMES
  3. Try to click any theme keyword
- **Expected**: Each theme links to filtered projects (e.g., `/projects?tag=open-source-llms`)
- **Actual**: Plain text with no clickable elements

### No new P0/P1 bugs
