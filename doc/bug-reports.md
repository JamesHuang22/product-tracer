
## Product Tour: 2026-06-23T17-23-47 (Focus: Homepage)

### [P2] /
- **Description:** Console error: Failed to load resource: the server responded with a status of 404 ()
- **Found:** 2026-06-23T17-23-47

### [P2] https://product-tracer.vercel.app/projects/cachet-a-drop-in-semantic-cache-for-llm-apis-100-local-in-rust
- **Description:** No AI summary section on project detail page (from homepage click)
- **Found:** 2026-06-23T17-23-47

### [P2] https://product-tracer.vercel.app/projects/cachet-a-drop-in-semantic-cache-for-llm-apis-100-local-in-rust
- **Description:** No breadcrumb navigation on project detail page
- **Found:** 2026-06-23T17-23-47

### [P2] /
- **Description:** HTTP 404 for https://product-tracer.vercel.app/zh
- **Found:** 2026-06-23T17-23-47

### [P2] /
- **Description:** Console error: Failed to load resource: the server responded with a status of 404 ()
- **Found:** 2026-06-23T17-23-47

### [P1] /zh
- **Description:** ZH homepage has minimal Chinese content (2 chars) — English fallback
- **Found:** 2026-06-23T17-23-47

---
# Bug Reports

Automated browser test findings.


## Run: 2026-06-23 16:06:36

### [P1] /trends
- **Description:** No narrative summary visible on EN trends page
- **Found:** 2026-06-23 16:06:36

### [P1] /trends
- **Description:** No top products section visible on EN trends page
- **Found:** 2026-06-23 16:06:36

### [P2] /trends
- **Description:** ZH locale shows no Chinese content (same as EN fallback)
- **Found:** 2026-06-23 16:06:36


## Product Tour: 2026-06-23 16:07:03 (Focus: /trends)

### [P2] /trends
- **Description:** Category breakdown section is missing
- **Found:** 2026-06-23 16:07:03

### [P2] /trends
- **Description:** Stats row (Projects scanned / Signals / Insights) is missing
- **Found:** 2026-06-23 16:07:03

### [P1] /trends
- **Description:** No clickable project links exist on /trends — products are not navigable
- **Found:** 2026-06-23 16:07:03

### [P1] /trends
- **Description:** Console error: Failed to load resource: the server responded with a status of 500 ()
- **Found:** 2026-06-23 16:07:03

## Run: 2026-06-23 16:07:52 (Post-tour confirmation)

### [P0] Entire Site
- **Description:** product-tracer.vercel.app is returning HTTP 500 for all pages (/, /projects, /trends, /youtube-insights). Server-side exception. Site is completely down.
- **Found:** 2026-06-23 16:07:52

---

## Product Tour: 2026-06-23 16:20 (Focus: /youtube-insights)

### [P1] ZH YouTube Insights → 404
- **Description:** `/zh/youtube-insights` returns a 404 page ("This page could not be found."). The header shows a "中文" link but navigating to it breaks. All other pages (/, /projects, /trends) have working ZH locales.
- **Reproduction:**
  1. Navigate to `https://product-tracer.vercel.app/youtube-insights`
  2. Click "中文" in the site header
  3. Browser navigates to `/zh/youtube-insights` → shows 404
- **Found:** 2026-06-23 16:20

### [P2] Video cards lack publish dates
- **Description:** YouTube insight video cards display title, channel, and category but no publish date or relative timestamp. Without date context, users can't tell if content is fresh or stale.
- **Found:** 2026-06-23 16:20

### [P2] Category filter doesn't persist / navigate
- **Description:** Changing the category `<select>` dropdown to "AI/ML" updates the visible DOM state but the URL doesn't update (no `?category=` param), and the page content doesn't visibly change to reflect the filter. It's unclear if the filter is working client-side or merely changing internal state.
- **Reproduction:**
  1. Go to `/youtube-insights`
  2. Select "AI/ML" from the "All categories" dropdown
  3. Observe: URL stays `/youtube-insights`, page content appears unchanged
- **Found:** 2026-06-23 16:20

### [P2] 31 small tap targets on mobile (375px viewport)
- **Description:** On a 375px iPhone viewport, there are 31 `<a>` or `<button>` elements with clickable area smaller than 44×44px (WCAG minimum). This makes touch interaction finicky.
- **Found:** 2026-06-23 16:20

### [P2] Grid/List toggle uses `<a>` instead of `<button>`
- **Description:** The grid/list view toggles are rendered as `<a>` elements with `href` attributes rather than `<button>` elements. This is semantically incorrect — toggles should be buttons, not navigation links.
- **Found:** 2026-06-23 16:20

### [P2] No internal video detail pages
- **Description:** All video cards link directly to `youtube.com/watch?v=...` — there are no internal `/youtube-insights/[slug]` detail pages. This means no AI summaries, no related video recommendations, and no way to bookmark individual videos within the app.
- **Found:** 2026-06-23 16:20

### [P2] RSC streaming requests aborted (ERR_ABORTED)
- **Description:** Multiple `_rsc=` prefetch requests return `net::ERR_ABORTED` during navigation. These are Next.js RSC streaming requests being aborted — could indicate client-side navigation conflicts or server timeouts.
- **Found:** 2026-06-23 16:20

### [P2] 404 resource load on every youtube-insights page
- **Description:** A console error "Failed to load resource: the server responded with a status of 404" fires on every `/youtube-insights` page load. The specific resource path is not logged.
- **Found:** 2026-06-23 16:20

---

## Product Tour: 2026-06-23 16:35 (Focus: /projects & detail pages)

### [P1] ZH locale 404 for all /projects and /projects/[slug] pages
- **Description:** Navigating to `/zh/projects` or `/zh/projects/[slug]` returns a 404 page ("This page could not be found."). The ZH locale was working in previous runs — this is a regression. Only `/zh/` (homepage) returns a 2xx but shows ~89 chars of mostly English text with only 2 Chinese characters.
- **Reproduction:**
  1. Navigate to `https://product-tracer.vercel.app/zh/projects`
  2. See 404 error page
  3. Navigate to `https://product-tracer.vercel.app/zh/projects/pewdiepie-archdaemon-odysseus` (or any slug)
  4. See 404 error page
- **Found:** 2026-06-23 16:35

### [P2] No breadcrumb navigation on project detail pages
- **Description:** Project detail pages (e.g., `/projects/pewdiepie-archdaemon-odysseus`) lack any breadcrumb or hierarchical navigation. Users who land on a deep-linked project page have no visual path indicating "Home > Projects > [Project Name]". Back-button is the only navigation aid.
- **Reproduction:**
  1. Navigate to any `/projects/[slug]` page
  2. Look for breadcrumb trail near the top of the content area
  3. No breadcrumbs present
- **Found:** 2026-06-23 16:35

### [P2] 404 favicon.ico on every page
- **Description:** Every page load triggers a 404 for `/favicon.ico`. Missing favicon means browser tabs show a generic document icon.
- **Reproduction:**
  1. Open browser DevTools → Network tab
  2. Navigate to any page on the site
  3. Observe `GET /favicon.ico → 404`
- **Found:** 2026-06-23 16:35

### [P2] No AI summary section found on project detail pages
- **Description:** Project detail pages do not display an AI-generated summary/overview section. The page shows project metadata but no value-added LLM narrative describing what the project does, who it's for, or why it matters.
- **Reproduction:**
  1. Navigate to any `/projects/[slug]` page
  2. Scroll through the content looking for "Summary", "Overview", "About", or "What is"
  3. None found
- **Found:** 2026-06-23 16:35


---
## Product Tour: 2026-06-23 16:53:18 (Focus: Homepage)

### [P2] /projects/[slug]
- **Description:** No AI summary on project detail page (clicked from homepage card)

---
## Product Tour: 2026-06-23T17-52-48 (Focus: Homepage)

### Summary
- Load time: 2194ms (acceptable)
- 14 project cards found on homepage
- H1: "Cross-platform signalsfor indie products." (note: missing space between "signals" and "for")
- Language switcher present as buttons (EN/中文)
- Scroll test passed — no broken lazy images

### All issues found are duplicates of existing reports:
- favicon 404 → known P2
- Console 404 error → known P2
- No AI summary on /projects/amnesia → known P2
- No AI summary on /projects/cachet-... → known P2
- 5 tap targets <44px on mobile → known (previously 31 reported on /youtube-insights)

---
## Product Tour: 2026-06-23T18-20-00 (Focus: YouTube Insights)

### Bugs Found

#### [P2] /youtube-insights — Page 2 missing "Prev" pagination link
- **Description:** Pages 3+ show both "Prev" and "Next" pagination links, but Page 2 only shows "Next". Users on page 2 cannot navigate back to page 1.
- **Reproduction:**
  1. Go to /youtube-insights?page=2
  2. Observe only "Next" link is shown, no "Prev" link
  3. Compare with /youtube-insights?page=3 which correctly shows both
- **Expected:** Page 2 should have a "Prev" link pointing to ?page=1
- **Actual:** Only "Next" link to ?page=3 is shown

#### [P3] /youtube-insights — Category filter select works but URL doesn't update
- **Description:** Changing the category `<select>` dropdown works (content filters), but the URL doesn't reflect the selected category. No `?category=` param is added to the URL, so filtered state is not shareable or bookmarkable.
- **Reproduction:**
  1. Go to /youtube-insights
  2. Select "Developer Tools" from the dropdown
  3. URL stays /youtube-insights (no ?category=developer_tools added)
- **Expected:** URL should update to /youtube-insights?category=developer_tools
- **Found:** (confirmed working content-wise but URL doesn't persist state)

### Summary
- Grid/List view toggle correctly switches between `flex flex-col` (list) and `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (grid)
- List cards: 720px wide × varying heights
- Grid cards: 368px wide × uniform 162px height
- EN/中文 locale switcher works via button click (client-side, not path-based)
- Category filter select works with options: all, ai_ml, developer_tools, startup_business, tech_news, hardware, security, design, other
- 20 articles per page, 93 total, 5 pages
- Mobile (375px): 3 small tap targets (32×24, 31×40, 24×28)

## Product Tour: 2026-06-23T11-50-00 (Focus: /youtube-insights)

### [P2] /youtube-insights — Mobile horizontal overflow at 375px
- **Description:** At 375px viewport, body content overflows viewport horizontally. Users must scroll left/right to see full content. Likely caused by wide cards or unresponsive grid layout on small screens.
- **Reproduction:**
  1. Set viewport to 375×812 (iPhone SE/XR)
  2. Navigate to /youtube-insights
  3. Observe horizontal scrollbar or content extending beyond viewport
- **Found:** 2026-06-23T11-50

### [P2] /youtube-insights?lang=zh — 80% English text, weak localization
- **Description:** ZH locale on /youtube-insights renders ~80% English text. Only interface chrome (nav, footer) contains Chinese. Video cards, category filter labels, and pagination remain in English, providing poor UX for Chinese-speaking users.
- **Reproduction:**
  1. Navigate to /youtube-insights?lang=zh
  2. Observe video cards, category dropdown, pagination all show English text
  3. Only main nav/header elements are translated
- **Found:** 2026-06-23T11-50

### All previously found issues re-confirmed:
- favicon 404 → known P2
- Console 404 error → known P2
- No internal video detail pages → known P2 (design choice)
- 31+ small tap targets on mobile → known

---
## Product Tour: 2026-06-23 12:20 (Focus: Bookmarks + ZH locale regression)

### [P2] /zh, /zh/projects, /zh/youtube-insights, /zh/trends — All ZH locale routes return 404
- **Description:** Every `/zh/*` route now returns HTTP 404 (Next.js "This page could not be found"). Previously (2026-06-23 10:08), `/zh/` was returning 200 with partial Chinese content. This is a full regression — the entire Chinese locale is broken.
- **Reproduction:**
  1. Navigate to `https://product-tracer.vercel.app/zh/projects`
  2. Observe 404 error page
  3. Navigate to `https://product-tracer.vercel.app/zh/trends`
  4. Observe 404 error page
- **Expected:** All `/zh/*` routes should return 200 with Chinese locale content
- **Regression:** Previously `/zh/` returned 200. Something broke between June 23 10:08 and 12:20.

### [P3] / — Homepage H1 typo: "signalsfor" missing space
- **Description:** The H1 reads "Cross-platform signalsfor indie products." — missing space between "signals" and "for".
- **Reproduction:** Visit homepage, inspect `<h1>` element
- **Expected:** "Cross-platform signals for indie products."
- **Actual:** "Cross-platform signalsfor indie products."

### Fixed: [P2] /youtube-insights mobile horizontal overflow — **RESOLVED**
- **Description:** Previously reported mobile horizontal scroll on /youtube-insights at 375px viewport no longer reproduces. All pages test clean at 375×812.
- **Status:** Confirmed fixed as of 2026-06-23 12:20

### Fixed: [P2] /projects page mobile overflow — **RESOLVED**
- **Description:** Previously reported mobile overflow on /projects at 375px no longer reproduces.
- **Status:** Confirmed fixed as of 2026-06-23 12:20

### Fixed (Partial): [P1] /trends — Summary + Top Products now visible
- **Description:** /trends now renders Summary, Top Products, Week over week, and Emerging Themes sections. Previously reported as P1 "No narrative summary" and "No top products section".
- **Status:** Functionally resolved as of 2026-06-23 12:35. Content loads correctly on desktop.

---
## Product Tour: 2026-06-23 12:35 (Focus: Homepage + Mobile Regression Check)

### [P2] All pages — Mobile horizontal overflow at 375px (body 490px vs viewport 375px)
- **Description:** `document.body.scrollWidth` is 490px on all pages tested (/, /projects, /trends, /youtube-insights) vs 375px viewport. The nav element measures 399px wide, with the remaining width contributed by margins/padding. Visual overflow is clipped via `overflow-x: clip` on `<body>`, so there's no visible scrollbar, but content is being clipped and the layout isn't truly responsive at the smallest breakpoint.
- **Reproduction:**
  1. Set viewport to 375×812
  2. Load any page (/, /projects, /trends, /youtube-insights)
  3. Run `document.body.scrollWidth > window.innerWidth` → true
  4. Run `document.querySelector('nav').getBoundingClientRect().width` → ~399px
- **Expected:** `body.scrollWidth` should equal `window.innerWidth` (375px) with no overflow.
- **Root cause:** The `<nav>` element is wider than the viewport, and body overflow is clipped rather than the nav being properly responsive.
- **Suggested fix:** Ensure the `<nav>` element (or its container) uses responsive width like `w-full max-w-full` with proper horizontal padding.

### [P3] / — Homepage H1 typo: "signalsfor" still present
- **Description:** H1 still reads "Cross-platform signalsfor indie products." — missing space. Previously reported and confirmed at 2026-06-23T17-52-48.
- **Status:** Still unfixed.

### [P1] /zh — ZH locale still 404
- **Description:** `/zh` still returns 404. Full Chinese locale regression. Previously reported at 2026-06-23 12:20.
- **Status:** Still unfixed regression.

### Re-confirmed (no change):
- **No breadcrumb** on /projects/[slug] (known P2)
- **No AI summary** on /projects/[slug] (known P2)
- **No console errors** on homepage (good — clean)
- **/trends content restored** (Summary, Top Products, Week over week all render correctly now)

---

## Product Tour: 2026-06-23 13:05 (Focus: /projects page)

### [P2] /projects/[slug] (375px) — Mobile horizontal overflow on project detail
- **Description:** At 375px viewport, project detail pages (e.g., `/projects/pewdiepie-archdaemon-odysseus`) also overflow horizontally. Same root cause as the nav overflow on homepage — likely a wider-than-viewport nav element.
- **Reproduction:**
  1. Set viewport to 375×812
  2. Navigate to any `/projects/[slug]`
  3. `document.body.scrollWidth > window.innerWidth` → true
- **Found:** 2026-06-23 13:05

### [P2] /projects (375px) — 66 small tap targets on mobile
- **Description:** At 375px viewport, 66 interactive elements have clickable area < 44×44px (WCAG minimum). This exceeds previously reported counts on other pages (31 on /youtube-insights). The project filtering controls and card layouts are likely the main contributors.
- **Reproduction:**
  1. Set viewport to 375×812
  2. Navigate to /projects
  3. Query all interactive elements and check bounding rects
- **Found:** 2026-06-23 13:05


---
## Product Tour: 2026-06-23 13:35 (Focus: /youtube-insights + Homepage empty card verification)

### [P1] / — Homepage insight card 2/3 has empty content (no <p> rendered)
- **Description:** Of the 3 homepage insight cards (from `getTopVideoInsights(3)`), card 2 (video `4y9DR2WwW3o`) renders **no `<p>` element at all** — just a green sentiment dot + "Watch on YouTube" link in a blank card. The `key_insight` in the DB is NULL, so `localizedPair()` returns null and the `{text && <p>...</p>}` guard skips rendering. This is the same bug as BUG-1 [P0] in `assistant-queue/REQUEST.md` — the DB-level guard (`WHERE key_insight IS NOT NULL`) hasn't been applied yet.
- **Reproduction:**
  1. Visit `https://product-tracer.vercel.app/`
  2. Scroll down to the "Latest video insights" section (below project platform cards)
  3. Observe 3 cards: card 1 has text, card 2 is empty/blank, card 3 has text
  4. Click card 2 — it links to `https://www.youtube.com/watch?v=4y9DR2WwW3o` (valid video)
- **Expected:** All 3 insight cards should have text content, or the empty-`key_insight` row should be excluded from the query
- **Impact:** P1 — homepage value proposition is degraded; 1/3 of the insights section is a dead card
- **Found:** 2026-06-23 13:35

### [P2] / — H1 typo still present: "signalsfor" missing space
- **Description:** The H1 still reads "Cross-platform signalsfor indie products." Missing space between "signals" and "for". This has been reported in 4+ prior tours and remains unfixed.
- **Found:** 2026-06-23 13:35 (reconfirmed)

### [P2] / — favicon.ico returns 404
- **Description:** `GET /favicon.ico → 404` on every page load. Browser tab shows generic document icon. Reported in every prior tour since the first run.
- **Found:** 2026-06-23 13:35 (reconfirmed)

### ✅ Fixed & Verified This Run

#### ✅ Duplicate Homepage Insight Content — **RESOLVED**
- **Description:** Previously reported (BUG-1 in prior bug-reports.md) where all 3 homepage insight cards showed identical text about "US Commerce Secretary". Now verified: all 3 cards link to different videos with different content. Card 2 is empty (separate bug above), but cards 0 and 2 have distinct, correct content.

#### ✅ Category Filter URL Persistence — **RESOLVED**
- **Description:** Previously reported: `/youtube-insights` category filter didn't set `?category=` in URL. Now verified: selecting "Developer Tools" correctly navigates to `...?category=developer_tools` with shareable URL.

#### ✅ ZH /youtube-insights Localization — **RESOLVED**
- **Description:** Previously reported: ZH locale on /youtube-insights showed 80% English. Now verified: all 5 sampled cards have 94-157 CJK characters each with genuine Chinese translations. Nav is translated (项目/洞察/趋势/收藏). Total: 2507 CJK chars across the page.

#### ✅ Pagination — **RESOLVED**
- **Description:** Previously reported: Page 2 missing Prev link. Now verified: Page 2 correctly renders both Prev and Next links.

#### ✅ Grid/List Toggle — Working Correctly
- **Description:** Both toggle buttons render (☰List and ⊞Grid). Active state has `aria-current="true"` and proper styling. Toggle is `<a>` elements (semantic P3 nitpick) which is acceptable.

#### ✅ Mobile Overflow — Still Fixed
- **Description:** No horizontal scroll at 375px viewport. Previous fix is holding.

#### ✅ Console Errors — Clean
- **Description:** No console errors on homepage or /youtube-insights. The previously reported "Failed to load resource: 404" appears to be fixed.

### Summary
- **1 active P1** (empty insight card — tracked in REQUEST.md BUG-1)
- **2 active P2** (H1 typo, favicon 404 — both cosmetic, unfixed for several runs)
- **5 resolved items** from previous tours


## Product Tour: 2026-06-24T01:24:16.180Z (Focus: /youtube-insights)

### [P2] /youtube-insights
- **Description:** 1 HTTP error(s) loading page resources
- **Found:** 2026-06-24T01:24:08.935Z
- **Reproduction:**
    404 https://product-tracer.vercel.app/favicon.ico
- **Expected:** All resources load successfully (2xx)
- **Actual:** 1 resource(s) returned 404

---

## Product Tour: 2026-06-24 01:35 UTC (Focus: Homepage + ZH Locale Check)

### [P2] All /zh/* routes — Still returning HTTP 404 (unchanged)
- **Description:** Every `/zh/*` route (/, /projects, /youtube-insights, /trends) returns HTTP 404 with "This page could not be found." The page renders in English with only 2 CJK characters found. Full i18n regression first reported 2026-06-23 12:20, still unfixed.
- **Reproduction:**
  1. Navigate to `https://product-tracer.vercel.app/zh`
  2. HTTP 404 with English "This page could not be found."
  3. Try /zh/projects, /zh/youtube-insights, /zh/trends — same 404 behavior
- **Found:** 2026-06-24 01:35 UTC

### [P3] / — H1 typo "signalsfor" missing space (unchanged, 4+ runs)
- **Description:** H1 reads "Cross-platform signalsfor indie products." — still missing the space between "signals" and "for". First reported ~2026-06-23T17:52. Unfixed for 4+ consecutive tours.
- **Reproduction:** Visit homepage, inspect `<h1>` text.
- **Found:** 2026-06-24 01:35 UTC

### [P3] / — favicon.ico returns HTTP 404 (unchanged)
- **Description:** `GET /favicon.ico → 404` on every page load. Browser tab shows generic document icon. Reported in every tour since the first run.
- **Found:** 2026-06-24 01:35 UTC

### ✅ Confirmed Fixed This Run
- **Mobile nav overflow** — Nav spans exactly 375px at iPhone viewport. Previous fix holding.
- **No console errors** (other than favicon 404) — Homepage, /projects, /youtube-insights all clean.
- **Project links** — All 10+ sampled links on /projects correctly point to `/projects/[slug]` detail pages.
- **Page loads** — All EN routes (/, /projects, /youtube-insights) return 200 with correct titles.

### Summary
- **0 new bugs** found (all issues are long-standing, previously reported)
- **3 active bugs** (1 P2 ZH locale, 2 P3 cosmetic — H1 typo, favicon 404)
- **4 verified fixes** holding from previous runs
