# Bug Reports — 2026-06-24

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

### No new bugs found
- Site healthy across all routes
- All previously reported P0 bugs (HTTP 500s) are resolved
- The empty insight card on homepage (BUG-1 in REQUEST.md) remains — one video card has no insight text, just "Watch on YouTube" link — tracked in assistant-queue/REQUEST.md
- Known P2 favicon 404 remains
