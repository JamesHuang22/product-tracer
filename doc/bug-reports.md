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

## Root Cause Hypothesis

The 500 errors across `/`, `/trends`, and `/youtube-insights` suggest a shared data layer failure. Given that:
- All failing pages depend on database queries (Supabase)
- The project detail page (200 but client-side error) also needs DB data
- The `/projects` page returns 500 HTTP but serves content (possibly SSR catches a partial error)

**Most likely**: A recent schema change, migration issue, or Vercel environment variable change (e.g., `DATABASE_URL`, Supabase keys) broke the server-side data fetching. The `digest: "193943652"` may help in Vercel logs.

### Immediate actions needed
1. Check Vercel deployment logs for the actual stack trace
2. Verify Supabase connection and permissions
3. Check if a recent migration (`0015_dedup_quality` or similar) altered the schema
4. Consider reverting the last deploy or running a Vercel redeploy
