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

---

# RESOLUTION — BUG-001…005 (2026-06-23, Claude agent session)

**One root cause for all the 500s (BUG-001/002/003/005), and BUG-004 is a downstream symptom.** The "schema/migration/env" hypotheses are wrong. The Vercel runtime stack trace is:

> `k: (EMAXCONNSESSION) max clients reached in session mode — max clients are limited to pool_size: 15`  (code `XX000`, digest `193943652` / `240242435`)

The app talks to Supabase's **session-mode pooler (port 5432)**, which hands each client a dedicated server connection and caps total clients at **15**. Under enough concurrent server-rendered requests — organic traffic + the automated browser tester + (during the window) concurrent LLM backfills and the agent's own load-testing — the 15-client cap is hit and every DB-backed page 500s. `/bookmarks` survived because it fetches client-side, not in SSR. **BUG-004** ("client-side exception" on a detail page returning HTTP 200) is the same outage seen from the client: the server data fetch failed mid-render. Not a separate bug.

## Status: mitigated — stable under normal/light load; high-concurrency ceiling remains (needs operator action)

Done (merged to main):
- **#62** — per-instance pool `max` 2→1 (`PG_POOL_MAX` override) to halve each Vercel instance's connection footprint.
- **#63 / #64** — added an opt-in switch to the **transaction pooler** (`PG_USE_TRANSACTION_POOLER=1`). Turning it on by default made DB requests *hang* (the `:6543` endpoint isn't a working drop-in for this project from Vercel — likely needs Supabase-side config), so it's **opt-in** and live traffic is back on the session pooler. Verified after revert: sequential browsing + light concurrency all HTTP 200.

**Durable fix — operator action required (Supabase/Vercel access the agent doesn't have):** pick one —
1. Supabase → Database → Connection pooling → **raise the session Pool Size** well above 15 (and/or Postgres `max_connections`); or
2. Verify the **transaction pooler** for this project (enable the IPv4 add-on if needed), point `DATABASE_URL` at the `:6543` transaction-pooler URL, and set `PG_USE_TRANSACTION_POOLER=1` — transaction mode multiplexes hundreds of clients and is the correct serverless mode.

## On the P2 list — several are false positives from testing during the outage
- **"No breadcrumb on detail pages"** and **"No AI summary section on detail pages"** — both features **do exist** (breadcrumb shipped in #44; AI summaries render — verified live on e.g. `/projects/cloudflare-ai`). The tester saw empty pages because it ran during the 500 outage, when nothing rendered.
- **"ZH routes `/zh/*` return 404"** — expected, not a bug: i18n is **cookie-based** (one set of routes, language toggled via the `locale` cookie), there are deliberately no `/zh/*` paths.
- **`favicon.ico` 404** and the **H1 "signalsfor" spacing** are plausible minor real issues worth a quick follow-up once the connection ceiling is raised.
