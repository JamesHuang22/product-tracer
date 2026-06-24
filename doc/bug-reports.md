# Bug Reports — 2026-06-23

## Automated Test Summary
- Browser test: 0 bugs detected by test script (test passes successfully)
- HTTP status check: 3 pages return 500 Internal Server Error
- Product tour: Site rendered partially but many pages crashed

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
