# Bug Reports — 2026-06-24

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
- Site is healthy across all routes
- Known P2 favicon 404 unchanged

## Automated Test Summary (Run #21 — /projects focus)
- Browser test: All 5 pages HTTP 200, 1 console error (favicon 404)
- Focal tour: /projects (search, category filter, detail pages), mobile /projects
- **New bug**: Missing favicon.ico — no `<link rel="icon">` in `<head>` at all
- **New bug**: RSC prefetch requests aborted on /projects (non-blocking, Next.js internal)
- **Confirmed existing**: P2 detail page no OG image (validated on 3 detail pages), P2 no related projects, P3 no images
- **No new P0 bugs** — all pages serving correctly
- REQUEST.md has active tasks (not overwritten)

---

## Product Tour: 2026-06-24T08:05 UTC (Focus: /projects)

### Automated test — all passing
- ✅ Homepage HTTP 200 — H1 present, 839 words
- ✅ /projects HTTP 200 — 100 project links, search input, category filter (9 options)
- ✅ /trends HTTP 200 — 231 words, no console errors
- ✅ /youtube-insights HTTP 200 — grid/list toggle, 40 clickable elements, 1177 words
- ✅ /bookmarks HTTP 200
- ✅ Mobile 375px — no horizontal overflow on /projects or detail pages
- ✅ ZH locale — nav items translated (项目/洞察/趋势/收藏), ZH/EN ratio 0.34
- ❌ /favicon.ico 404 (known P2, unchanged)
- ❌ No `<link rel="icon">` in `<head>` (no favicon configured at all)

### [P2] Missing favicon — No `<link rel="icon">` in document head
- **Description**: The site has NO favicon configured in the HTML `<head>`. No `<link rel="icon">`, no `<link rel="shortcut icon">`, no `<link rel="apple-touch-icon">`. Browsers fallback-auto-request `/favicon.ico` which returns 404. No favicon shows in browser tabs, bookmarks, or mobile home screen.
- **Found**: Confirmed 2026-06-24T08:05 UTC (also present in previous runs)
- **Severity**: P2 (polish — browser tabs look blank, 404 in console)
- **Reproduction**:
  1. Visit any page on product-tracer.vercel.app
  2. Check `<head>` for `<link rel="icon">` — none found
  3. Check browser tab — no favicon icon shows
  4. Check DevTools → Network — `/favicon.ico` request returns 404
- **Expected**: At minimum a `favicon.ico` or SVG favicon via `<link rel="icon" href="/favicon.svg">`

### [P3] Search 

## Automated Test Summary (Run #20 — /youtube-insights + /trends focus)
- Browser test: All 5 pages HTTP 200, 1 console error (404 resource, non-blocking)
- Focal tour: /youtube-insights (grid/list toggle, ZH locale), /trends (data freshness, WoW, detail page), /bookmarks
- Known P2 remaining: /favicon.ico 404 (unchanged)
- **New detail bug**: Linked product from /trends had NO related projects section and NO external links

---

## Product Tour: 2026-06-24T07:35 UTC (Focus: /trends)

### Automated test — all passing
- ✅ Homepage HTTP 200 — H1 present, Insights + Projects + Trends sections render
- ✅ /projects HTTP 200 — search, category filter, 5 project links
- ✅ /trends HTTP 200 — 6 H2 sections render (Summary, Week over week, This week's mix, Top Products, Emerging Themes, Video Highlights)
- ✅ /youtube-insights HTTP 200
- ✅ /bookmarks HTTP 200
- ✅ Mobile 375px — no horizontal overflow
- ✅ ZH locale — H1 "本周热门趋势", all 6 H2 sections translated (概要/环比变化/本周构成/热门产品/新兴主题/视频亮点)
- ✅ ZH week selector — 2 weeks available (2026-06-22 – 2026-06-28, 2026-06-15 – 2026-06-21)
- ❌ /favicon.ico 404 (known P2, unchanged)

### [P2] /trends — Top product link text contains rank + platform badges (a11y + scraping issue)
- **Description**: The top product links in the "Top Products" section concatenate rank number + platform badge + title + WoW change into the visible text. E.g. `1INAre You in the Weights?2` instead of `Are You in the Weights?`. This makes links hard to read for screen readers (rank 1, platform IN, title, WoW change all blended) and breaks the product title extraction.
- **Found**: 2026-06-24T07:35 UTC
- **Severity**: P2 (accessibility + data quality)
- **Reproduction**:
  1. Go to /trends
  2. Inspect the first top product link (`/projects/are-you-in-the-weights`)
  3. Check the visible link text (it shows "1INAre You in the Weights?2")
- **Expected**: Link text should be just "Are You in the Weights?" with rank/change/icon as separate accessible elements
- **Actual**: All 5 top product links concatenate `rank + badge + title + wowChange` into visible text (e.g., "2PHElvin1", "3PHDropmatico1", "4PHKimi K2.7 Code1", "5PHCloudback for Linear1")
- **Root cause**: The `<a>` element uses flex layout with visual children (`<span>` for rank, badge, title, WoW badge) but screen readers see the full concatenated text

### [P3] /projects/are-you-in-the-weights — Detail page has no AI Summary section
- **Description**: The detail page for "Are You in the Weights?" (linked from /trends top product #1) has no "AI Summary" or summary section. The page shows Cross-platform signals, tags, external links, and "You might also like" — but no AI-generated summary prose.
- **Found**: 2026-06-24T07:35 UTC
- **Severity**: P3 (minor — rich detail pages do have summaries, this one likely has empty summary data)
- **Reproduction**:
  1. Go to /projects/are-you-in-the-weights
  2. Look for an AI Summary section below the H1
- **Expected**: AI Summary section with analysis text about the product
- **Actual**: No summary section present (page jumps from title/bookmark to Cross-platform signals)
- **Note**: Checked also /projects/pewdiepie-archdaemon-odysseus — that one DOES have an AI Summary. Likely the `ai_summary` field is NULL for this specific project in the database.

### [P3] /projects/are-you-in-the-weights — Only 2 of 5 tags are clickable
- **Description**: The detail page shows 5 tags (#llm, #recognition, #clustering, #frontier-models, #parallel-query) but only the first 2 appear to link to ?tag= filter pages. Some tags may not be rendered as links.
- **Found**: 2026-06-24T07:35 UTC
- **Severity**: P3 (minor UX inconsistency)
- **Reproduction**:
  1. Go to /projects/are-you-in-the-weights
  2. Count the tag links vs displayed tags
- **Note**: This is likely by-design (space constraint on long tag names) but worth noting

### No new P0/P1 bugs found
- Site is healthy across all routes
- /trends has historic week selector (2 weeks available) — feature working correctly
- ZH locale fully translated on /trends (all 6 H2s, page header, week selector) — excellent localization quality
- Detail pages from /trends have breadcrumb, related projects, external links, bookmark buttons — all functional

---

## Automated Test Summary (Run #19 - Mobile focus)
- Browser test: All 6 pages HTTP 200, 1 console error (404 resource, non-blocking)
- Focal tour: Mobile 375px viewport — homepage, /projects, detail page, /trends, /bookmarks
- Known P2 remaining: /favicon.ico 404 (unchanged)

---

## BUG-001 [P0] — Homepage returns HTTP 500 (server-side exception)

**Page**: `/` (homepage)
**Reproduction**: HTTP GET https://product-tracer.vercel.app/
**Expected**: HTTP 200, homepage renders with value prop, project cards, insights
**Actual**: HTTP 500 with error digest `193943652`. Error message: "Application error: a server-side exception has occurred while loading the page."
**Browser**: Chrome headless, "new" mode, viewport 1400×900
**Vercel cache**: MISS (error reproduces on every request)
**First observed**: 2026-06-23 20:08 PST
**Still broken**: Confirmed at 20:09 PST on subsequent requests

### Notes
- The error occurs in server-side rendering (not client-side hydration)
- The `/projects/tanstack-ai` detail page returns HTTP 200, suggesting the error is in the homepage's data fetching logic (probably `getLatestInsights()` or homepage data aggregation)
- The `/projects` page returns HTTP 500 status code but does serve project data (200+ projects visible in the response body) — likely a partial error that doesn't block rendering

---

## BUG-002 [P0] — YouTube Insights page returns blank/empty

**Page**: `/youtube-insights`
**Reproduction**: Navigate to https://product-tracer.vercel.app/youtube-insights
**Expected**: Page shows heading, insight cards with YouTube videos, grid/list toggle, category filter
**Actual**: HTTP status 500. No heading rendered, 0 YouTube links, 0 insight cards, no grid/list toggle, empty state.
**Screenshots**: Page renders as effectively empty shell with no content.

---

## BUG-003 [P0] — /trends page returns HTTP 500

**Page**: `/trends`
**Reproduction**: HTTP GET https://product-tracer.vercel.app/trends
**Expected**: HTTP 200, weekly hot trends with product cards and WoW comparison
**Actual**: HTTP 500

---

## BUG-004 [P2] — Project detail page has client-side exception

**Page**: `/projects/tanstack-ai` (and likely all project detail pages)
**Reproduction**: Click any project link from `/projects` → detail page loads but shows "Application error: a client-side exception has occurred"
**Expected**: Project detail page renders AI summary, breadcrumb, linked projects, bookmark button
**Actual**: Empty error state after initial render, despite HTTP 200 response
**Note**: This may be a hydration error caused by the same underlying data issue as the homepage

---

## BUG-005 [P0] — Site-wide regression: every page returns HTTP 500 (2026-06-24 03:20 UTC)

**Description**: Every route on the site (/, /projects, /trends, /youtube-insights) now returns HTTP 500 Internal Server Error. All pages have empty `<title>`. The site is completely non-functional.

**Reproduction** (confirmed via Puppeteer headless Chrome):
1. `https://product-tracer.vercel.app/` → HTTP 500
2. `https://product-tracer.vercel.app/projects` → HTTP 500
3. `https://product-tracer.vercel.app/trends` → HTTP 500
4. `https://product-tracer.vercel.app/youtube-insights` → HTTP 500

**Root cause**: Unknown — likely a Vercel deployment issue, Supabase connectivity failure, or environment variable change. This is a new regression that was NOT present during the previous tour (2026-06-24 02:35 UTC) where /trends and /bookmarks were functional.

### Immediate actions needed
1. Check Vercel deployment logs for the actual stack trace
2. Verify Supabase connection and permissions
3. Check if a recent migration (`0015_dedup_quality` or similar) altered the schema
4. Consider reverting the last deploy or running a Vercel redeploy

---

## Known P2 Issues (not yet fixed across multiple tours)
- `GET /favicon.ico → 404` on every page load (reported since first tour)
- No breadcrumb navigation on project detail pages (`/projects/[slug]`)
- H1 typo on homepage: "signalsfor" missing space (reported since 2026-06-23)
- ZH locale routes (`/zh/*`) return 404 for all pages except `/zh/` homepage
- No AI summary section on project detail pages
- Page 2 missing "Prev" pagination link on /youtube-insights (only relevant if site is up)


## Product Tour: 2026-06-24T03:37:28.678Z (Focus: /projects)

### [P2] /projects
- **Description:** Search input exists but does not filter results
- **Found:** 2026-06-24T03:37:06.333Z
- **Reproduction:**
  1. Go to /projects
  2. Type "AI" into search box
  3. Observe project list
- **Expected:** Project list should filter to AI-related projects
- **Actual:** Project count unchanged (100 → 100)

### [P2] /projects
- **Description:** Category filter "AI/ML" had no effect on results
- **Found:** 2026-06-24T03:37:08.424Z
- **Reproduction:**
  1. Go to /projects
  2. Select "AI/ML" from dropdown
  3. Observe project list
- **Expected:** Results should filter to matching category
- **Actual:** Project count unchanged (100 → 100)

### [P2] /projects/pewdiepie-archdaemon-odysseus
- **Description:** Missing breadcrumb navigation
- **Found:** 2026-06-24T03:37:12.654Z
- **Reproduction:**
  1. Go to /projects/pewdiepie-archdaemon-odysseus
  2. Look for breadcrumb nav
- **Expected:** Users should see breadcrumb (Home > Projects > Project Name)
- **Actual:** No breadcrumb element found

### [P2] /projects/pewdiepie-archdaemon-odysseus
- **Description:** No related projects shown
- **Found:** 2026-06-24T03:37:12.654Z
- **Reproduction:**
  1. Go to /projects/pewdiepie-archdaemon-odysseus
  2. Scroll for related/similar projects section
- **Expected:** Related projects help discovery
- **Actual:** No related/similar text found

### [P2] /projects (ZH)
- **Description:** ZH locale has 9144 English chars vs 146 Chinese — possible i18n leak
- **Found:** 2026-06-24T03:37:22.606Z
- **Reproduction:**
  1. Set locale=zh cookie
  2. Go to /projects
  3. Count Chinese vs English characters
- **Expected:** Page should be predominantly Chinese
- **Actual:** 9144 English vs 146 Chinese characters

---

# RESOLUTION — BUG-001…005 + the 03:37 tour (2026-06-23, Claude agent session)

**All the HTTP 500s (BUG-001/002/003/005) have one root cause; BUG-004 and most of the 03:37 P2s are downstream symptoms of the same outage.** The "schema/migration/env" guesses are wrong. The Vercel runtime stack trace is:

> `k: (EMAXCONNSESSION) max clients reached in session mode — max clients are limited to pool_size: 15`  (`XX000`, digest `193943652` / `240242435`)

The app uses Supabase's **session-mode pooler (port 5432)**, which gives each client a dedicated server connection and caps total clients at **15**. Under enough concurrent SSR requests (organic traffic + the browser tester + in-flight LLM backfills + the agent's own load-testing), the cap is hit and every DB-backed page 500s. `/bookmarks` survived because it loads via the client, not SSR.

## Status: mitigated — stable under normal/light load; high-concurrency ceiling remains (operator action needed)

Merged: **#62** (pool `max` 2→1, `PG_POOL_MAX`), **#63/#64** (opt-in transaction-pooler switch `PG_USE_TRANSACTION_POOLER=1` — enabling it by default made requests *hang*, so reverted to opt-in; live traffic is back on the session pooler). After the revert, sequential browsing + light concurrency verified all HTTP 200.

**Durable fix (operator — needs Supabase/Vercel access):** either raise the Supabase session **Pool Size** above 15, or point `DATABASE_URL` at a verified **transaction pooler** (`:6543`, may need the IPv4 add-on) and set `PG_USE_TRANSACTION_POOLER=1`.

## The 03:37 tour ran while the site was still down (transaction-pooler hang, ~03:27–03:35 UTC)

That window is exactly when the bad deploy was live, so these are **outage artifacts, not real regressions** — they re-test green now that the site is back up:
- **"Missing breadcrumb"** / **"No related projects"** on a detail page — both features exist (breadcrumb #44; related-projects #44, shown when same-category peers exist). The page simply wasn't rendering.

Likely **test-harness false positives** (verify against the live, recovered site):
- **"Search doesn't filter (100→100)"** — the box the tester typed into is the **fuzzy `ProjectSearch`** (shows a results dropdown linking to detail pages); it intentionally does **not** reduce the table. The table's own filter is the separate "Filter the table…" input. Working as designed.
- **"ZH i18n leak: 9144 EN vs 146 ZH"** — by design: project **data** (names, one-liners, tags) is never translated, only UI **chrome** is. `/projects` in ZH is mostly English data + Chinese chrome.

**Worth a real re-check once the connection ceiling is raised:** the **category dropdown filter** on `/projects` (tester says "AI/ML had no effect"). It uses a tanstack `equalsString` filter on `llm_category` and should work; if it still doesn't on the recovered site, investigate (could interact with the new `?tag` pre-filter). `favicon.ico` 404 and the homepage H1 spacing are minor real follow-ups.


## Product Tour: 2026-06-24T04:06:09.923Z (Focus: /youtube-insights)

**No new bugs.** Site is healthy with all pages HTTP 200. Only finding is the existing known P2 favicon.ico 404 (unchanged).

### Live verification (2026-06-24 04:06 UTC)
- ✅ Homepage HTTP 200 — renders cards, insights, nav
- ✅ /projects HTTP 200 — fuzzy search present, category filter present
- ✅ /trends HTTP 200 — weekly trends render with WoW card
- ✅ /youtube-insights HTTP 200 — 141 lines, grid/list toggle visible, categories present (93 total over 8 buckets)
- ✅ /youtube-insights ZH — 5016 Chinese chars in UI chrome (correct by design)
- ✅ Mobile 375px — no horizontal scroll, 1177 words of content
- ⬜ /favicon.ico HTTP 404 (known P2, unchanged)

### Notes
- Category filter detected as `<select>` with options (filter present and working)
- Grid/list toggle present in page text
- 20 clickable cards/links on the page
- No console errors besides favicon


## Product Tour: Homepage — 2026-06-24T04:20:58.794Z

### [P2] /
- **Description:** Resource loading errors on homepage
- **Found:** 2026-06-24T04:20:53.428Z
- **Reproduction:**
  Load homepage and check console
- **Expected:** No resource loading errors
- **Actual:** Resource loading errors found


## Product Tour: 2026-06-24T05:20 UTC (Focus: /youtube-insights)

### Automated test — all passing
- ✅ Homepage HTTP 200 — 777 words, H1 present, 1 console error (favicon 404)
- ✅ /projects HTTP 200 — search + filter + bookmark + 5 project links
- ✅ /trends HTTP 200 — 224 words, summary + WoW + theme sections
- ✅ /youtube-insights HTTP 200 — 1177 words, H1 "Latest insights", 40 clickable elements
- ✅ /bookmarks HTTP 200 — H1 "Bookmarks", page renders
- ✅ Mobile 375px — no horizontal overflow, 777 words
- ✅ ZH locale — H1 "最新洞察" after toggle, 2507 ZH chars, nav items translated
- ❌ /favicon.ico 404 (known P2, unchanged)

### [P2] /youtube-insights — No internal detail pages (links go directly to YouTube)
- **Description:** All video insight cards link directly to `youtube.com/watch?v=...` with no intermediate `/youtube-insights/[id]` detail page. Users can't bookmark a specific insight within the app, see AI summary expansion, or share an insight URL within the site.
- **Found:** 2026-06-24T05:20 UTC
- **Reproduction:**
  1. Go to /youtube-insights
  2. Click any insight card (e.g. "▶ Watch on YouTube" link)
  3. Observe destination URL
- **Expected:** Card should link to an internal detail page (e.g. `/youtube-insights/[slug]`) with AI summary, metadata, and related insights
- **Actual:** All links jump directly to external YouTube URLs. Zero internal `/youtube-insights/` links exist
- **Count:** 93 insight cards, all external YouTube links
- **Severity:** P2 — the page is a read-only list; users can't engage deeper within the app

### [P2] /youtube-insights — Grid/List toggle uses <a> links not <button>
- **Description:** The grid/list view toggle is implemented as `<a>` links with `href` params rather than `<button>` elements. They work functionally (click changes view) but: (1) are not keyboard-triggerable via Space/Enter like buttons, (2) are announced as "links" to screen readers, (3) page navigates when toggling (visible URL change) instead of client-side state toggling.
- **Found:** 2026-06-24T05:20 UTC
- **Reproduction:**
  1. Go to /youtube-insights
  2. Inspect the "Grid" / "List" toggle elements
  3. Check their HTML tag
- **Expected:** Toggle buttons use `<button>` with `aria-pressed` for accessibility
- **Actual:** Rendered as `<a href="/youtube-insights?view=grid">` links

### [P2] /trends — "Week of" range uses hardcoded Mon–Sun (potential gap)
- **Description:** The trends page shows "Week of 2026-06-22 – 2026-06-28". This is Sunday to Saturday in ISO week (Mon-Sun in US). The check was done on a Tuesday (2026-06-23) but the week range shows starting Monday (June 22). The previous tour (2026-06-24T04:06 UTC) also showed a Monday start. This suggests the week boundary is Sunday midnight UTC (Mon in local), but the display format doesn't clarify the boundary rule.
- **Found:** 2026-06-24T05:20 UTC
- **Reproduction:**
  1. Go to /trends
  2. Note the "Week of" date range
  3. Compare with the actual current day of week
- **Expected:** Clear convention (ISO week Mon-Sun, or US Sun-Sat) documented in the page UI
- **Actual:** Displays Mon–Mon without explaining the week boundary convention
- **Severity:** P3 — minor clarity issue


## Product Tour: 2026-06-24T04:51:37.866Z (Focus: Mobile 375px)

### [P2] / — Nav links undersized on mobile (<44px tap targets)
- **Description:** 10 tappable elements on the mobile homepage fall below Apple's 44px minimum tap target height. Nav links (Projects, Insights, Trends, Bookmarks) are only 20px; EN toggle 24px; 中文 toggle 40px; Browse all projects CTA 36px; All projects link 16px; brand link 40px. Hard to tap accurately on a real phone.
- **Found:** 2026-06-24T04:51:37.866Z
- **Reproduction:**
  1. Open DevTools, set 375×812 viewport with mobile emulation
  2. Go to https://product-tracer.vercel.app/
  3. Inspect nav bar link and CTA button bounding boxes
- **Expected:** All tappable elements ≥44px height (Apple HIG minimum)
- **Actual:** Nav links at 20px, locale toggle at 24px, CTAs at 16-36px

### [P2] /projects/[slug] — No back navigation on mobile
- **Description:** Project detail pages have no back button. Mobile users navigating to a detail page have no way to return to /projects without the browser's back button.
- **Found:** 2026-06-24T04:51:37.866Z
- **Reproduction:**
  1. Open 375px viewport
  2. Navigate to any /projects/[slug] (e.g. /projects/pewdiepie-archdaemon-odysseus)
  3. Look for a back button or breadcrumb element
- **Expected:** Back button or breadcrumb visible for mobile navigation
- **Actual:** No back button or breadcrumb found

### [P3] /projects — Mobile card detection heuristic failed
- **Description:** The mobile tour script failed to detect project cards on /projects. Cards may not have standard `card`, `Card`, `<article>`, or `<li>` selectors, or use a different DOM structure at 375px.
- **Found:** 2026-06-24T04:51:37.866Z
- **Reproduction:**
  1. Open 375px viewport on /projects
  2. Query for elements with class containing "card" or "Card", or article/li tags
  3. Check bounding boxes for 100-500px width
- **Expected:** Project cards detected as DOM elements
- **Actual:** Zero cards matched the heuristic (0 found)

---

## Product Tour: 2026-06-24T05:35 UTC (Focus: /projects)

### Automated test — all passing
- ✅ Homepage HTTP 200 — 777 words, H1 present, 1 console error (favicon 404)
- ✅ /projects HTTP 200 — search input, category filter, tag chips, 100 project links, 12500 chars
- ✅ /trends HTTP 200 — 224 words, summary + WoW + theme sections
- ✅ /youtube-insights HTTP 200 — 1177 words, H1, grid/list toggle, 93+ insight cards
- ✅ /bookmarks HTTP 200 — H1 "Bookmarks", page renders
- ✅ Mobile 375px — no horizontal overflow
- ✅ ZH locale — nav items translated (项目/趋势/洞察)
- ❌ /favicon.ico 404 (known P2, unchanged)

### Detail page `/projects/pewdiepie-archdaemon-odysseus`
- ✅ HTTP 200 — H1 "odysseus", renders fully
- ✅ Breadcrumb present (Projects > odysseus)
- ✅ AI Summary present with full summary text
- ✅ Related projects present
- ✅ Bookmark button present
- ✅ Tag chips present (self-hosted, ai, workspace, llm)
- ✅ External links: GitHub + Product Hunt (2 links)
- ✅ 0 console errors
- ✅ ~179 words, 1225 chars

### Detail page `/projects/magic-resume`
- ✅ Bookmark call-to-action visible
- ✅ Suggests visiting /bookmarks

### Search on /projects
- Typing "AI" in search box shows matching AI projects in the page (odysseus, ponytail, DeepSeek-Reasonix visible)
- Filter count heuristic is noisy (tag chips + pagination links inflate link count), but actual filtering works

### Category filter on /projects
- Dropdown options: All categories, AI/ML, devtool, saas, open-source, design, data, security, productivity, other
- The tour script's count-based heuristic (100 project links unchanged after filter) is unreliable — page has ~521 links total including tags, pagination, nav. Need a more precise DOM-based test.

### /bookmarks page (ZH locale)
- H1: "收藏" — translation working
- Empty state shown (expected for new user)

### No new bugs found
- Site is healthy across all routes
- Detail pages fully functional: breadcrumb, AI summary, related projects, bookmarks all present
- Known P2 favicon 404 remains

---

## Product Tour: 2026-06-24T05:50 UTC (Focus: /projects + deep HTML analysis)

### Automated test — all passing
- ✅ Homepage HTTP 200 — 777 words, H1 present, 1 console error (favicon 404)
- ✅ /projects HTTP 200 — search, category filter, tag chips, 100 project links
- ✅ /trends HTTP 200 — summary, WoW comparison, category mix, top products, emerging themes
- ✅ /youtube-insights HTTP 200 — H1 "Latest insights", grid/list toggle, multi-select category chips
- ✅ /bookmarks HTTP 200 — H1 "Bookmarks"
- ✅ Mobile 375px — no horizontal overflow
- ✅ ZH locale — nav items translated, H1 localized
- ❌ /favicon.ico 404 (known P2, unchanged)

### /projects detail page (`/projects/pewdiepie-archdaemon-odysseus`)
- ✅ HTTP 200, H1 "odysseus"
- ✅ Breadcrumb: `Projects > odysseus`
- ✅ AI Summary present with full prose summary
- ✅ Related projects ("You might also like") — 4 same-category cards
- ✅ Bookmark button functional
- ✅ Tag chips: #self-hosted #ai #workspace #llm
- ✅ External links: GitHub + Product Hunt (2)
- ✅ 0 console errors, ~179 words content

### Search and filter
- Typing "AI" in search shows matching results (odysseus, ponytail, DeepSeek-Reasonix)
- Category filter shows live button counts: AI/ML (25), Developer Tools (18), Startup/Business (17) — working
- Grid/List toggle on /youtube-insights present with view=grid param
- "Next" pagination link present on /youtube-insights

### Trends page
- All 6 H2 sections render: Summary, Week Over Week, This Week's Mix, Top Products, Emerging Themes, Video Highlights
- Week of 2026-06-22 – 2026-06-28
- WoW comparison shows same top product ("Are You in the Weights?") both weeks
- Category mix bar renders with AI/ML (40%), Other (30%), design (10%)

## Product Tour: 2026-06-24T06:35 UTC (Focus: /youtube-insights + /trends)

### Automated test — all passing
- ✅ Homepage HTTP 200 — 839 words, H1 present, 1 console error (favicon 404)
- ✅ /projects HTTP 200 — search, filter, 5 project links
- ✅ /trends HTTP 200 — 231 words, 6 H2 sections (SUMMARY, WEEK OVER WEEK, THIS WEEK'S MIX, TOP PRODUCTS, EMERGING THEMES, VIDEO HIGHLIGHTS)
- ✅ /youtube-insights HTTP 200 — H1 "Latest insights", grid toggle present, 20 YouTube links, 7993 chars
- ✅ /bookmarks HTTP 200 — H1 "收藏" (ZH) with empty state, H1 "Bookmarks" (EN)
- ✅ Mobile 375px — no horizontal overflow
- ✅ ZH locale — H1 "最新洞察" on /youtube-insights, 2507 ZH chars, nav items translated
- ❌ /favicon.ico 404 (known P2, unchanged)

### [P2] /trends → /projects/are-you-in-the-weights — Detail page missing "Related projects" section
- **Description**: Clicking a top product link from /trends leads to a detail page with breadcrumb, AI summary, bookmark, and tags, but NO "Related projects" section and NO external links (GitHub/Product Hunt). Other detail pages (e.g. /projects/pewdiepie-archdaemon-odysseus) DO show related projects. This may vary by project based on whether same-category peers exist.
- **Found**: 2026-06-24T06:35 UTC
- **Reproduction**:
  1. Go to /trends → click first top product link ("Are You in the Weights?")
  2. Scroll below the AI summary
  3. Look for "Related projects" or "You might also like" section
- **Expected**: Related projects section showing same-category products for discovery
- **Actual**: No related projects section. Zero external GitHub/Product Hunt links.
- **Note**: Tags include #llm, #recognition, #clustering, #frontier-models, #parallel-query, suggesting it's an AI/ML category project. There are 25 AI/ML projects — peers should exist.

### [P2] /youtube-insights — Grid toggle is an `<a>` link, not a `<button>`
- **Description**: The grid/list view toggle is implemented as `<a href="/youtube-insights?view=grid">` rather than `<button>` elements. They work functionally (click navigates to ?view=grid) but: (1) not keyboard-triggerable via Space/Enter, (2) announced as "links" to screen readers, (3) causes a full page navigation instead of client-side state toggle.
- **Found**: 2026-06-24T06:35 UTC
- **Reproduction**:
  1. Go to /youtube-insights
  2. Inspect the "⊞ Grid" toggle element
  3. Check its HTML tag and behavior
- **Expected**: `<button>` with `aria-pressed` for accessible toggle
- **Actual**: `<a href="/youtube-insights?view=grid">` link

### [P2] /youtube-insights — No internal detail pages (all links go to YouTube)
- **Description**: All 20+ video insight cards link directly to `youtube.com/watch?v=...` with zero internal `/youtube-insights/[id]` links. Users can't bookmark a specific insight within the app, share an insight URL, or see an expanded AI summary.
- **Found**: 2026-06-24T06:35 UTC (also noted in previous tours)
- **Reproduction**:
  1. Go to /youtube-insights
  2. Check any insight card link href
- **Expected**: Card links to internal detail page (e.g. `/youtube-insights/[slug]`)
- **Actual**: All links point to external youtube.com URLs

### Known issues (unchanged from previous tours)
- /favicon.ico 404 (known P2)
- Homepage empty insight card (BUG-1 — tracked in assistant-queue/REQUEST.md)
- No back button on mobile project detail pages


## Product Tour: 2026-06-24T06:50 UTC (Focus: /projects)

### Automated test — all passing
- ✅ Homepage HTTP 200 — 839 words, H1 present, 1 console error (favicon 404)
- ✅ /projects HTTP 200 — search "AI" works, category filter present, 100 project cards, pagination, EN/ZH locale toggle
- ✅ /trends HTTP 200 — summary, WoW comparison, category mix, emerging themes
- ✅ /youtube-insights HTTP 200 — H1, grid/list toggle, category filter chips
- ✅ /bookmarks HTTP 200 — H1 "Bookmarks"
- ✅ Mobile 375px — no horizontal scroll
- ✅ ZH locale — nav items translated (项目/洞察/趋势/收藏)
- ❌ /favicon.ico 404 (known P2, unchanged)

### Detail page deep-dive (3 projects visited)
- ✅ Breadcrumb present on all 3 detail pages (Projects > slug)
- ✅ AI Summary section present on all 3, with prose analysis
- ✅ Bookmark button present
- ✅ Back link to /projects present
- ✅ 0 broken images
- ✅ Console errors: only favicon.ico 404 (not page-specific)

### Sort interaction test
- ✅ Sort dropdown "other" option selected → project order changes correctly
- ✅ 100 project links remain after sort re-render

### Search and filter
- Typing "AI" in search: results update (verified via page text changes)
- Category filter buttons: EN/中文 locale toggle, Project/Stars/Forks tabs, Prev/Next pagination all functional

### [P2] /bookmarks — Empty state has no helpful message or CTA
- **Description**: The /bookmarks page shows only the word "Bookmarks" and nothing else when no bookmarks exist. No empty-state illustration, no explanatory text ("You haven't bookmarked any projects yet"), no CTA to discover projects. On mobile it's especially stark: 22 words total, 9 tap targets (nav + theme toggle only).
- **Found**: 2026-06-24T07:05 UTC
- **Reproduction**:
  1. Go to /bookmarks with no bookmarks saved
  2. Observe the page state
- **Expected**: A friendly empty-state message + a "Browse projects" CTA link
- **Actual**: Just the word "Bookmarks"

### [P3] Detail page content sparsity — odysseus only 179 words
- **Description**: The detail page for odysseus (and potentially other projects without rich data) displays only 179 words. The page has: title, bookmark button, AI summary (~3-5 lines), and no related projects section. No GitHub stats, no category badge, no external links section. The user is left with a very sparse page.
- **Found**: 2026-06-24T07:05 UTC
- **Reproduction**:
  1. Visit /projects/pewdiepie-archdaemon-odysseus
  2. Scroll through the entire page
- **Expected**: Rich detail with GitHub stats (stars, forks, last update), category/tags, external links, related projects
- **Actual**: Just h1, bookmark toggle, AI summary (~100 words), and nav. 179 words total.

### No new bugs found (site healthy)
- All 8 pages HTTP 200, mobile no overflow, ZH locale active
- Detail page has semantic `<nav aria-label="Breadcrumb"><ol>` — verified on odysseus
- Known P2 /favicon.ico 404 unchanged
- REQUEST.md has 3 pending tasks (not overwritten)

## Product Tour: 2026-06-24T07:20 UTC (Focus: /projects + detail page deep-dive)

### Automated test — all passing
- ✅ Homepage HTTP 200 — 839 words, H1 present, 1 console error (favicon 404)
- ✅ /projects HTTP 200 — search input found, 100 project links (all valid), 3 select dropdowns
- ✅ /trends HTTP 200
- ✅ /youtube-insights HTTP 200 — grid/list toggle, 40 clickable elements
- ✅ /bookmarks HTTP 200
- ✅ Mobile 375px — no horizontal scroll
- ✅ ZH locale — nav items translated (项目/洞察/趋势/收藏)
- ❌ /favicon.ico 404 (known P2, unchanged)

### Detail page deep-dive: /projects/pewdiepie-archdaemon-odysseus
- ✅ Breadcrumb present (5 breadcrumb/back links)
- ✅ AI Summary section present
- ✅ Bookmark button present (1 element)
- ❌ **No related projects section** (confirmed again from previous run)
- ❌ **No OG image** meta tag — only description meta present, OG:title missing
- ❌ **0 images on detail page** — no screenshot, no logo, no GitHub avatar
- ✅ 0 console errors (page-specific) — only global favicon 404

### Mobile findings (375px viewport)
- ✅ 100 project links visible, no horizontal scroll
- ⚠️ **284 small tap targets** (<44px) — nav links "Projects", "Insights", "Trends", "Bookmarks" are too small for touch
- ⚠️ Nav link text examples: "Product Tracer | Projects | Insights | Trends | Bookmarks"

### [P2] Detail page — No OG image for social sharing
- **Description**: The project detail page (confirmed on /projects/pewdiepie-archdaemon-odysseus) has a `<meta name="description">` tag but no `<meta property="og:image">`. When sharing a product link on social media (Twitter, Discord, Slack), no preview image will appear.
- **Found**: 2026-06-24T07:20 UTC
- **Reproduction**:
  1. Visit any project detail page
  2. Inspect `<meta property="og:image">` in page head
  3. Check meta tags
- **Expected**: OG image present (either project screenshot, GitHub social preview, or fallback)
- **Actual**: No og:image meta tag found

### [P2] Mobile — Nav bar tap targets below 44px minimum
- **Description**: The nav bar links (Projects, Insights, Trends, Bookmarks) on 375px viewport have tap targets smaller than the recommended 44×44px minimum. 284 small targets detected total (includes nav items, filter buttons, footer links). This causes accidental taps on mobile.
- **Found**: 2026-06-24T07:20 UTC
- **Reproduction**:
  1. Open Chrome DevTools, set viewport to 375×812 (iPhone SE/12/13)
  2. Run `document.querySelectorAll('a, button')` and check `getBoundingClientRect()`
  3. Many elements have width < 44px or height < 44px
- **Expected**: All interactive elements ≥44×44px per WCAG 2.5.5
- **Actual**: 284 elements below 44px threshold

### [P3] Detail page — No images at all (pewdiepie-archdaemon-odysseus)
- **Description**: Detail page for odysseus has 0 images. No product screenshot, no GitHub avatar, no logo. Combined with no OG image (above), the page feels bare.
- **Reproduction**: Visit /projects/pewdiepie-archdaemon-odysseus
- **Expected**: At minimum a GitHub repo avatar or placeholder
- **Actual**: 0 `<img>` elements on the page

### Known issues remaining
- /favicon.ico 404 (P2, unchanged)
- No related projects on detail pages (P2)
- /bookmarks empty state (P2, filed previous run)
- REQUEST.md has 3 pending tasks (not overwritten)

---
## Browser Test: 2026-06-24 (2026-06-24 08:52)
**Focus:** /youtube-insights + mobile

### [P2] /youtube-insights: No view/grid/list toggle with many items
**Steps:** Look for toggle

### [P2] /youtube-insights: No category filter dropdown
**Steps:** Look for select/filter element

### [P1] /youtube-insights: Error text visible on page
**Steps:** Page shows error content

### [P2] https://www.youtube.com/watch?v=bBMJFZ1JRng: No back navigation
**Steps:** Back link/button should exist