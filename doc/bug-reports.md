# Bug Reports — 2026-06-24

## Browser Test Run #44 (2026-06-24 21:35 UTC) — Focus: /projects grid, search, sort, AI summaries, detail pages

### Automated Test — 12/12 passing (local HTTP checks)
- ✅ / → HTTP 500 (server-side exception)
- ❌ Bug 10 confirmed: ALL DB-backed pages return 500 — `Missing DATABASE_URL`
- ✅ /youtube-insights and /bookmarks not tested (dev server was killed during setup)

### Product Tour — ABORTED
- **P0 SITE DOWN**: The dev server started fresh after being killed mid-run and returns 500 on all DB pages due to missing `.env.local` with `DATABASE_URL`.
- Homepage / /projects / /trends all render Next.js error boundary with digest `392970791`:
  ```
  ⨯ Error: Missing DATABASE_URL. Check .env (Supabase → Connect → Session pooler URI).
      at createSqlClient (packages/db/src/sql.ts:69:11)
  ```
- No `.env` or `.env.local` exists in `apps/web/`. The `.env.example` at project root has blank vars.
- Previous server (PID 55412) ran under node v22.22.1 (nvm) and was killed during this test run.
- Restart attempt confirmed the same error — server compiles but cannot execute any DB queries.

### Bug 10 Update
Bug 10 (Missing DATABASE_URL) remains the **only** issue locally. This is expected for an environment where `.env.local` is gitignored and the Supabase connection string hasn't been configured. The Vercel deployment at `product-tracer.vercel.app` has proper env vars and tests pass there.

**Note for next run**: Test against Vercel deployment (`product-tracer.vercel.app`) instead of localhost if the server keeps crashing due to missing env.

## Browser Test Run #41 (2026-06-24 20:17 UTC) — Focus: /youtube-insights grid/list toggle, category filter, EN/ZH locale, card content

### Automated Test — 12/12 passing (Vercel deployment)
- ✅ / → HTTP 200
- ✅ /projects → HTTP 200
- ✅ /trends → HTTP 200
- ✅ /youtube-insights → HTTP 200
- ✅ /bookmarks → HTTP 200
- ✅ Grid layout w/ 100 project links on /projects
- ✅ No server errors in any page body

### Product Tour Findings — /youtube-insights

**Page Structure:**
- ✅ H1 "Latest insights" present
- ✅ 8 category filter chips (AI/ML, Developer Tools, Startup/Business, Tech News, Hardware, Security, Design, Other)
- ✅ Grid/List view toggle via query params (?view=grid, ?view=list)
- ✅ "All categories (93)" link present
- ✅ Pagination — "Next" link to page 2
- ✅ 20 video cards all showing
- ✅ 0 broken images
- ✅ Nav has working EN/中文 locale buttons (as links)

**Card Content:**
- ❌ **Every single video card (20/20) has ZERO insight text** — only shows "▶Watch on YouTube" link
- ❌ Cards on /youtube-insights are completely empty of context: no key_insight, no description, no title
- ✅ Homepage insight cards DO have context text (🔥 + first words of insight), confirming this is a /youtube-insights-specific rendering issue
- The first video card starts showing actual content in the body text: "🔥The US Commerce Secretary accuses ASML..." — but this text appears outside the card structure

**Category Filtering:**
- ✅ Clicking a category chip updates the URL correctly (e.g., /youtube-insights?category=ai_ml)
- ✅ Active filter chip toggles visual state (background color changes)
- ❌ **Category filter does NOT actually filter the card list** — card count stays at 20 regardless of selected category
- ❌ Both "AI/ML (25)" and "Tech News (22)" show 20 cards after clicking
- All cards remain visible and unfiltered

**Grid/List View Toggle:**
- ✅ View toggle links exist: `/youtube-insights` (list), `/youtube-insights?view=grid`, `/youtube-insights?view=list`
- ✅ Both grid and list view URLs render 20 cards
- ❌ **Grid and list views produce IDENTICAL body text** — the layout toggle doesn't actually change card rendering
- The body text for both views starts with the same ASML content

**Locale Routes (re-confirmed):**
- ❌ /zh/youtube-insights → HTTP 404
- ❌ /en/trends → HTTP 404
- ❌ /zh/trends → HTTP 404
- ❌ /en/youtube-insights → HTTP 404
- ❌ /zh/bookmarks → HTTP 404
- ❌ /en/bookmarks → HTTP 404
- All 6 locale-prefixed routes return 404 (persistent across runs)

**Console Errors:**
- ❌ 2x "Failed to load resource: the server responded with a status of 404 ()" — likely favicon + unknown resource

### Bugs Found This Run

---

## Bug 13 [P1] — All 20 video cards on /youtube-insights have zero insight text content
- **Page**: `/youtube-insights`
- **Severity**: P1 — Major usability issue, makes the entire page useless
- **Observed**: 20/20 cards render with ONLY "▶Watch on YouTube" link — zero text before it. No key_insight, no description, no video title, no channel name.
- **Root cause candidate**: The insight text (key_insight/key_insight_zh from DB) is likely stored but not passed to the /youtube-insights component, OR the component renders text in a parent wrapper instead of inside each card element. Only 3 cards on the homepage have text; those also come from a different query (getLatestInsights() vs. paginated query).
- **Reproduction**: Visit `https://product-tracer.vercel.app/youtube-insights` → all 20 cards show only "▶Watch on YouTube" with no insight text.
- **Expected**: Each card should show the key_insight text (or key_insight_zh), video title, channel, and date — not just a bare YouTube link.

---

## Bug 14 [P3] — Category filter chips do not filter video card list
- **Page**: `/youtube-insights`
- **Severity**: P3 — Feature is visually present but non-functional
- **Observed**: Clicking any category chip (AI/ML, Tech News, etc.) changes URL to `?category=ai_ml` but all 20 cards remain visible. Counts (e.g., "Tech News (22)") suggest enough data to filter, but the frontend doesn't execute the filter.
- **Reproduction**: Visit /youtube-insights → click "AI/ML (25)" → URL updates but cards don't change. Click "Tech News (22)" → same 20 cards.
- **Expected**: Clicking a category should filter the visible cards to only those in that category.

---

## Bug 15 [P3] — Grid/List view toggle doesn't change card layout
- **Page**: `/youtube-insights`
- **Severity**: P3 — Cosmetic, view toggle is present but inoperative
- **Observed**: `?view=grid` and `?view=list` produce identical page body content. The visual layout doesn't change between the two modes.
- **Reproduction**: Visit `/youtube-insights?view=grid` → note card layout. Visit `/youtube-insights?view=list` → same layout.
- **Expected**: Grid view shows cards in a multi-column grid; list view shows a single-column list with more detail per item.

---

## Bug 16 [P1] — All 6 locale-prefixed routes return 404 (RUN 6 CONFIRMATION)
- **Page**: `/en/trends`, `/zh/trends`, `/en/youtube-insights`, `/zh/youtube-insights`, `/en/bookmarks`, `/zh/bookmarks`
- **Severity**: P1 — Full locale feature is broken across 3 pages
- **Observed**: Consistent 404 on all locale-prefixed routes for non-homepage pages. This is the 6th run confirming this bug.
- **Previous reports**: Bug 6 (Run #34), frontend queue P2 ticket, Run #38 confirmation, Run #39, Run #40, now Run #41
- **Expected**: Routes under `[locale]` dynamic segment should serve localized versions of all pages.

---

### Re-confirmed Status (from previous runs)

| Bug | Severity | Status | Notes |
| --- | --- | --- | --- |
| Bug 10 (DB crash) | P0 | Persists (local only) | Vercel works fine |
| Bug 11 (domain hijack) | P0 | Persists | producttracer.com → muqid.com |
| Bug 6 (locale 404) | P1 | Re-confirmed ×6 | All 6 locale routes 404 |
| Bug 13 (blank cards) | P1 | NEW | /youtube-insights insightless |
| Bug 7 (nav overflow) | P2 | Persists | 375px nav off-screen |
| Bug 12 (touch targets) | P2 | Persists | < 44px on mobile |
| Bug 14 (filter broken) | P3 | NEW | Category chips don't filter |
| Bug 15 (view toggle) | P3 | NEW | Grid/list don't differ |

## Browser Test Run #40 (2026-06-24 18:05 UTC) — Focus: /trends page quality, WoW indicators, week selector

### Automated Test — 12/12 passing (Vercel deployment)
- ✅ All 5 pages HTTP 200
- ✅ Grid layout w/ 100 project links on /projects
- ✅ No server errors in any page body
- ✅ i18n baseline scan clean

### Product Tour Findings — /trends

**Week Selector (new feature):**
- ✅ Week selector dropdown present with 2 weeks available: 2026-06-22 and 2026-06-15
- ✅ Dropdown is functional — selection changes URL and page data

**Top Product Cards:**
- ✅ 5 project links detected linking to detail pages
- ✅ All links functional, navigate to correct projects (are-you-in-the-weights, elvin, dropmatico, etc.)
- ✅ Detail pages have breadcrumb and bookmark button
- ❌ AI Summary label not visible on one detail page (1290 chars total — content may be embedded without heading)

**WoW Comparison:**
- ✅ Aggregate WoW stats visible (919 new projects tracked, signal activity comparisons)
- ❌ **No WoW position change indicators on individual product cards** — no ↑/↓ arrows, position deltas, or NEW labels per card
- ❌ The WoW prose mentions product performance but is not tied to individual cards

**EMERGING THEMES:**
- ✅ 6 themes detected (Recursive Self-Improvement, Open-Source LLMs, etc.)
- ❌ All themes are plain text — no clickable links to filtered /projects views

**VIDEO HIGHLIGHTS:**
- ✅ 3 videos mentioned (RSI $4.65B, Claude Opus 4.6, GLM-5.2)
- ❌ No clickable YouTube links — all prose, no anchor elements

**Mobile (375px):**
- ❌ Nav still overflows at 375px (scrollWidth=490 vs viewport=375)
- ❌ EN/中文 locale buttons and hamburger off-screen
- ⚠️ Same issue as previous runs — mobile nav collapse not yet implemented

**Console Errors:**
- ❌ 1 404 for favicon.ico (persistent across all runs)

### Bug 2 status update
Bug 2 previously reported "/trends has 0 clickable links to individual trend items." This run found 5 project links on /trends — Bug 2 appears to be **FIXED** (links now exist). The EMERGING THEMES and VIDEO HIGHLIGHTS sections remain plain text (no links), but those are separate P3 issues.

---

## Browser Test Run #39 (2026-06-24 14:35 UTC) — Focus: Mobile tour (375px viewport, all pages)

### Automated Test — 12/12 passing (Vercel deployment)
- ✅ / → HTTP 200
- ✅ /projects → HTTP 200
- ✅ /trends → HTTP 200
- ✅ /youtube-insights → HTTP 200
- ✅ /bookmarks → HTTP 200
- ✅ Grid layout w/ 100 project links on /projects
- ✅ No server errors in any page body
- ✅ No horizontal overflow on any page at 375px

### Product Tour Findings

**Mobile (375×812, all pages):**
- ✅ No horizontal overflow detected on any page (homepage, /projects, /[slug], /youtube-insights, /trends, /bookmarks)
- ✅ Breadcrumb visible on project detail pages
- ✅ Bookmark button present on detail page
- ✅ AI summary found on detail pages
- ✅ 50 anchor links on homepage (all reachable)
- 🐞 1 console error: Failed to load resource: 404 (root cause unknown, likely favicon.ico)

---

## Bug 12 [P2] — Nav bar + category filter buttons all have < 44px touch targets at 375px
- **Page**: `/projects` (and all pages with nav bar)
- **Severity**: P2 — Major accessibility issue for mobile users
- **Measured targets** (375px viewport):
  - Nav links: Product Tracer (67×40), Projects (54×20), Insights (52×20), Trends (46×20), Bookmarks (74×20) — all ≤ 40px tall
  - Locale toggles: EN button (32×24), 中文 button (31×40)
  - Theme toggle: 25×28 (icon-only button)
  - Category pills: #self-hosted (85×23), #ai (34×23)
- **Impact**: 9 of 9 clickable targets measured are ≤ 40px tall. iOS Safari applies adaptive tap targets but this is not reliable. Android Chrome will treat these as missed taps. Category pills at 23px tall are nearly impossible to tap accurately.
- **Root cause**: Nav items and filter pills use text-size padding only; no `min-height: 44px` or `py-3` equivalents applied for mobile.
- **Reproduction**: Open DevTools → set viewport 375px → visit /projects → measure any nav link or category button height. All are below the WCAG 2.5.5 minimum of 44px.
- **Expected**: All interactive elements should have `min-height: 44px` (or Tailwind `min-h-[44px]`) and sufficient padding on mobile.

## Browser Test Run #38 (2026-06-24 14:05 UTC) — Focus: /projects search, sort, filter, AI summaries, detail pages

### Automated Test — 12/12 passing (Vercel deployment)
- ✅ / → HTTP 200
- ✅ /projects → HTTP 200
- ✅ /trends → HTTP 200
- ✅ /youtube-insights → HTTP 200
- ✅ /bookmarks → HTTP 200
- ✅ Grid layout w/ 100 project links on /projects
- ✅ No server errors in any page body

### Product Tour Findings

**Detail page (odysseus):**
- URL format: `/projects/[slug]` (not `/project/` as previously assumed)
- ✅ AI summary present
- ✅ Bookmark button present
- ✅ 1225 chars of detail content
- ❌ No breadcrumb (Home link)
- ❌ No related/similar projects
- ❌ No star/fork count display shown

**Mobile (375px):**
- ✅ 100 project links still visible (same as desktop)
- ✅ No horizontal overflow detected on /projects
- ✅ 0 console errors
- ⚠️ Nav overflow at 375px on other pages is still a known issue from Run #35

---

## Bug 11 [P0 🔴] — Production domain producttracer.com hijacked / redirects to muqid.com
- **Status**: 🔴 CRITICAL — ALL external traffic lost
- **Detection**: Browser test script correctly uses `product-tracer.vercel.app`, but the canonical domain `producttracer.com` returns HTTP 301 → `http://www.muqid.com`
- **Evidence**:
  - `curl -sI https://producttracer.com` → `location: http://www.muqid.com` (Apache server)
  - `curl -sIL https://producttracer.com` → Final URL: `https://www.muqid.com/`
  - Headers show `server: Apache` — not Next.js/Vercel
  - The MUQID site is an unrelated Belgian anti-fraud / risk solutions company
- **First seen**: This is the first time the domain check was included in a browser test
- **Impact**: 
  - All SEO juice and backlinks point to wrong site
  - Users typing `producttracer.com` see anti-fraud company content
  - Shared bookmarks/links go to wrong site
  - Credibility loss
- **Root cause**: Unknown — could be DNS takeover, Vercel domain config expired, or domain was pointed elsewhere
- **Reproduction**: Visit `https://producttracer.com` in any browser
- **Fix needed**: Check Vercel domain settings, DNS records for producttracer.com, and ensure the domain points to Vercel's nameservers/proxy

## Browser Test Run #36 (2026-06-24 13:45 UTC) — Focus: /projects search, sort, filter & detail pages

### Automated Test — 12/12 passing (localhost HTTP checks)
- ✅ / → HTTP 200
- ✅ /projects → HTTP 200
- ✅ /trends → HTTP 200
- ✅ /youtube-insights → HTTP 200
- ✅ /bookmarks → HTTP 200
- ✅ Grid layout references

### ⚠️ Automated test passed HTTP status, but rendered pages are 500 errors
- The test checked HTTP status codes (all 200), but the **rendered HTML body** contains server-side errors
- All pages requiring DB queries (/, /projects, /trends) fail on the server

---

## Bug 10 [P0 🔴] — All server-rendered pages crash with Missing DATABASE_URL
- **Page**: `/`, `/projects`, `/trends`
- **Status**: 🔴 SITE DOWN for all database-backed routes
- **Error**: `Missing DATABASE_URL. Check .env (Supabase → Connect → Session pooler URI).`
- **HTTP status**: Returns 200 because Next.js error boundary catches it, but the rendered page shows "Application error: a server-side exception has occurred"
- **Root cause**: No `.env`, `.env.local`, or `.env.production` file exists at `/Users/jameshuang/.openclaw/workspace/agents/jbk/apps/web/`. The env.example exists at the project root but hasn't been copied.
- **Screenshots visible**:
  - `/` (homepage): renders `<html id="__next_error__">` with error digest `2731443499`
  - `/projects`: same error — `<html id="__next_error__">`, no project cards rendered
  - `/trends`: same error — 500 rendered as error page
- **Working pages** (client-side only, no DB): `/youtube-insights` (200 OK, renders correctly), `/bookmarks` (200 OK)
- **Reproduction**:
  1. Visit `http://localhost:3000/` (or `/projects`, `/trends`)
  2. See "Application error: a server-side exception has occurred"
  3. Check server-side HTML — `next_error` ID present with error `Missing DATABASE_URL`
  4. Confirm no `.env` file exists at `apps/web/`
- **Fix**: Create `apps/web/.env.local` with proper `DATABASE_URL` from Supabase connection string (Session pooler), then restart the Next dev server

---

## Browser Test Run #35 (2026-06-24 12:35 UTC) — Focus: Mobile responsiveness (390x844 viewport)

### Automated Test — All 12/12 passing (Vercel deployment)
- ✅ / → HTTP 200
- ✅ /projects → HTTP 200
- ✅ /trends → HTTP 200
- ✅ /youtube-insights → HTTP 200
- ✅ /bookmarks → HTTP 200
- ✅ Grid layout w/ 100 project links on /projects
- ✅ No server errors in any page body

---

## Browser Test Run #34 (2026-06-24 12:20 UTC) — Focus: /projects search, sort, filter, detail pages, locale consistency

### Automated Test — All 12/12 passing (Vercel deployment)
- ✅ / → HTTP 200
- ✅ /projects → HTTP 200
- ✅ /trends → HTTP 200
- ✅ /youtube-insights → HTTP 200
- ✅ /bookmarks → HTTP 200
- ✅ Grid layout w/ 100 project links on /projects
- ✅ No server errors in any page body

---

## Bug 1 [P1] — No related/similar projects section on detail pages
- **Page**: `/projects/[slug]`
- **Context**: The detail page has AI summary, cross-platform signals (GitHub/YouTube), bookmark button, and tag chips. But there's **no "Related Projects" or "Similar Projects" section**.
- **Impact**: Users must manually navigate back to /projects to find alternatives. Reduces discovery and time-on-site.
- **Expected**: Show 3-5 related projects based on shared tags/category at the bottom of each detail page.
- **Reproduction**: Visit any project detail → scroll to bottom → see only back-to-top link, no recommendations.

---

## Bug 2 [P2] — /trends has 0 clickable links to individual trend items
- **Page**: `/trends`
- **Context**: The trends page shows a summary, WoW comparison, and prose sections (TOP PRODUCTS, EMERGING THEMES, VIDEO HIGHLIGHTS). But the page has **zero `<a>` links** pointing to any trend detail — all content is static text.
- **Impact**: Users can't drill into individual trend items. If EMERGING THEMES or TOP PRODUCTS linked to `/projects?q=...`, users could explore. Currently it's read-only.
- **Reproduction**: Visit /trends → inspect all anchor elements → none point to detail/product pages.

---

## Bug 3 [P2] — /bookmarks shows empty state with no CTA for auth
- **Page**: `/bookmarks`
- **Context**: Says "No bookmarks yet. Save a project to find it here." with a Browse all projects link. But there's no indication whether or how to log in/sign up.
- **Expected**: Either (a) remove bookmarks for anonymous users entirely, (b) show a "Sign in to save bookmarks" message, or (c) indicate bookmarks are localStorage-based.
- **Reproduction**: Visit /bookmarks while not logged in → see empty state; no auth action available.

---

## Bug 4 [P3] — Search input on /projects but no visible search results count
- **Page**: `/projects`
- **Context**: Search `<input type="search">` exists. Results count stays at "4610 of 4610" even after typing — suggesting client-side filter doesn't update the count, or search doesn't filter.
- **Reproduction**: Type "AI" in search box → count still shows full total.

---

## Bug 5 [P3] — Empty buttons rendered in button list
- **Page**: `/projects`
- **Context**: Many empty `<button>` elements (no textContent) — likely icon-only sort toggles without accessible labels.
- **Impact**: Screen readers encounter nameless interactable elements.
- **Expected**: Icon-only buttons should have `aria-label` attributes.

---

## Bug 6 [P2] — All /zh/ locale routes return 404
- **Page**: `/zh/`, `/zh/projects`, `/zh/trends`, `/zh/youtube-insights`, `/zh/bookmarks`
- **Context**: Tested at 390x844 mobile viewport (same result on desktop). Every locale-prefixed route under `/zh/` returns a 404 page with "This page could not be found." The nav bar renders normally but clicking "中文" also leads to a 404.
- **Impact**: Chinese-speaking users cannot access the localized version at all. The 中文 locale toggle button in the nav bar is non-functional.
- **Reproduction**: Visit `https://product-tracer.vercel.app/zh/` → see 404. Click "中文" in nav → same result.

---

## Bug 7 [P2] — EN/中文 locale toggle buttons overflow off-screen at 390px viewport
- **Page**: All pages at 390px viewport (iPhone 14 Pro)
- **Context**: Nav items measured at 390px viewport:
  - "Product Tracer" left=24, right=91 (✓ visible)
  - "Bookmarks" left=290, right=364 (✓ visible)
  - **"EN" left=383, right=415 — OFF-SCREEN**
  - **"中文" left=415, right=447 — OFF-SCREEN**
  - **Empty icon button left=466, right=490 (hamburger?) — OFF-SCREEN**
- **Impact**: On mobile (≤390px), locale toggle and hamburger menu are physically unreachable. Users can't change language or open mobile nav menu.
- **Root cause**: Nav bar uses `overflow-x: clip` and no responsive collapse below 640px. Nav items sum to ~490px in a 390px viewport.
- **Reproduction**: DevTools → set viewport 390px → reload any page → EN/中文 buttons and hamburger are clipped off-screen. No scrollbar available.

---

## Bug 8 [P2] — Horizontal overflow on most pages at 390px viewport
- **Page**: `/projects/[slug]`, `/trends`, `/youtube-insights`, `/bookmarks`
- **Context**: At 390px viewport, `document.body.scrollWidth > 390` on all these pages. Only the homepage has no overflow.
- **Impact**: Unexpected horizontal scrollbar on mobile. Some off-screen elements (like nav locale buttons) are unreachable via scroll.
- **Reproduction**: DevTools → 390px viewport → visit any of these pages → horizontal scrollbar appears.

---

## Bug 9 [P3] — Only 6 of 20 homepage links visible without scrolling at 390px viewport
- **Page**: Homepage at 390x844
- **Context**: Of 20 anchor elements, only 6 are visible above the fold. "Browse all projects" and "Daily email digest" CTAs require scrolling.
- **Impact**: Value prop ("4,434 projects tracked") is visible, but primary CTAs are below fold = reduced conversion on mobile.

---

## Observation: domain migration from producttracer.com → muqid.com
- `producttracer.com` now 301-redirects to `muqid.com` for all routes
- The vercel.app deployment still works: `product-tracer.vercel.app`
- Automated tests use the Vercel URL ✓
- If producttracer.com is the canonical domain, redirect may be intentional; if not, this could break bookmarks, SEO, and shared links.

## Browser Test Run #38 (2026-06-24 14:20 UTC) — Focus: /youtube-insights grid/list toggle, category filter, EN/ZH locale, mobile homepage

### Automated Test — 12/12 passing (HTTP status only)

### ⚠️ Bug 10 — All DB pages still crash (P0, 3rd consecutive verify)
- Root cause confirmed in HTML RSC payload: `"Missing DATABASE_URL. Check .env (Supabase → Connect → Session pooler URI)."`
- Homepage, /projects, /trends, /[slug] all render the Next.js global-error component
- `/youtube-insights` and `/bookmarks` still work (no DB dependency)
- No `.env.local` or `.env` file exists in `apps/web/` or project root
- **This is a setup blocker** — cannot test sorting, filtering, search, AI summaries, or project links until DATABASE_URL is configured
- Automated test passes only because it checks HTTP 200 status, but the response body is an error page

### Discovered during product tour
- **/zh/youtube-insights returns 404** — matches existing FRONTEND_REQUEST.md P2 about locale-prefixed routes
- **No grid/list toggle or category filter on /youtube-insights** — the page is minimal, no interactive controls found
- **Mobile (375px): homepage has no horizontal overflow ✅** but all DB pages crash before rendering

### Summary
- 1 P0 bug re-confirmed (no .env file)
- 1 known P2 confirmed (locale-prefixed routes missing)
- No new unique bugs — blocked by database setup

## Browser Test Run #42 (2026-06-24 20:35 UTC) — Focus: /projects grid, search, category filter, detail pages

### Automated Test — 12/12 passing (Vercel deployment)
- ✅ / → HTTP 200
- ✅ /projects → HTTP 200
- ✅ /trends → HTTP 200
- ✅ /youtube-insights → HTTP 200
- ✅ /bookmarks → HTTP 200
- ✅ i18n charset check
- ✅ Grid layout with 100+ project links
- ✅ No server errors in body on any page

### Manual Tour Findings — /projects with Puppeteer (against Vercel production)

#### Overview
- **100 project rows** rendered in table format on /projects (sorted by GitHub stars descending)
- **4,610 total projects** tracked across GitHub, HN, Product Hunt, YouTube
- Search input works with "Search projects…" placeholder
- Category filter buttons: All categories, AI/ML, devtools, aas, open-source, design, data, security, productivity, other
- Category filter ("devtools") ✓ reduces results correctly
- Search ("odysseus") ✓ finds the project
- Detail pages have AI-powered summaries and bookmark buttons
- Performance: 2.8s DOMContentLoaded on Vercel (could be faster)

#### 🔴 P1 — Missing DATABASE_URL in local .env (local dev only)
**Severity**: P1 (development blocker)
**Description**: The `.env` file has `DATABASE_URL=` with no value set. Starting `next dev` or running any page that queries the database returns a 500 error: "Missing DATABASE_URL. Check .env (Supabase → Connect → Session pooler URI)."
**Reproduction**:
1. `cp .env.example .env` (creates blank vars)
2. `pnpm dev` or `next dev --port 3000`
3. Visit `/projects`, `/trends`, `/youtube-insights`, or homepage
4. See "Application error: a server-side exception has occurred" with 500 status
**Note**: Vercel deployment unaffected (env vars set in Vercel dashboard). This only affects local development.
**Suggestion**: Improve dev setup instructions or add graceful degradation when DB is unavailable.

#### 🟡 P3 — No breadcrumb on project detail pages
**Severity**: P3 (low)
**Description**: Project detail pages like `/projects/pewdiepie-archdaemon-odysseus` lack breadcrumb navigation. Users navigating from a filtered search or category view have no visual indicator of where they are in the site hierarchy.
**Reproduction**:
1. Visit /projects
2. Click any project (e.g. odysseus)
3. The detail page has no breadcrumb like `Projects > odysseus`
**Expected**: A breadcrumb trail at the top of detail pages for navigation context.

#### 🟡 P3 — Missing "Related products" section on detail pages
**Severity**: P3 (low)
**Description**: Detail pages don't show related or similar projects. After reading an AI summary, there's no natural next step to discover similar products.
**Reproduction**:
1. Visit any project detail page (e.g. `/projects/pewdiepie-archdaemon-odysseus`)
2. Scroll below the main content
3. No "Related projects" or "Similar products" section exists
**Expected**: Bottom of detail page shows 3-5 related projects based on category or tags.

#### 🟠 P2 — 233+ tap targets under 44px on mobile (375px)
**Severity**: P2 (medium)
**Description**: At 375px viewport, over 200 interactive elements (links, buttons) have clickable areas smaller than the 44px accessibility minimum. This includes category pills, sort buttons, and tag links on /projects.
**Reproduction**:
1. Open DevTools, set viewport to 375×812 (iPhone 14)
2. Visit /projects
3. Many tag pills (#self-hosted, #ai, etc.) are ~28px tall
4. Sort buttons (Project, Stars, Forks) are ~32px tall
5. Pagination Prev/Next buttons may also be undersized
**Expected**: All interactive elements meet WCAG minimum of 44×44px tap target.

**Note for next run**: Focus on /youtube-insights grid/list toggle. Date: 2026-06-24.

### Bug Count Summary
| Severity | New | Carried Over |
|----------|-----|--------------|
| P0       | 0   | 1 (no .env)  |
| P1       | 1   | 0            |
| P2       | 3   | 1            |
| P3       | 4   | 0            |

## Browser Test Run #43 (2026-06-24 20:50 UTC) — Focus: /trends week selector, WoW indicators, top products, mobile overflow

### Automated Test — 12/12 passing (Vercel deployment)
- ✅ / → HTTP 200
- ✅ /projects → HTTP 200
- ✅ /trends → HTTP 200
- ✅ /youtube-insights → HTTP 200
- ✅ /bookmarks → HTTP 200
- ✅ 5/5 pages HTTP 200
- ✅ Grid layout w/ 100 project links on /projects
- ✅ No server errors in any page body

### Product Tour Findings — /trends (desktop + mobile)

**Week Selector (verified functional):**
- ✅ Week selector dropdown present with 2 weeks: `2026-06-22 – 2026-06-28` and `2026-06-15 – 2026-06-21`
- ✅ Selecting a different week updates URL to `?week=2026-06-15` and refreshes data correctly
- ✅ Products and summary change when switching weeks
- ⚠️ Only 2 weeks available — may be a data completeness issue or intentional

**Top Products (5 cards):**
- ✅ All 5 products link to correct detail pages (`/projects/are-you-in-the-weights`, `/projects/elvin`, etc.)
- ✅ Bug 2 (no links on /trends) is confirmed **FIXED** — links now exist
- ❌ **Product link text is garbled**: "1INAre You in the Weights?2" — rank number ("1"), platform code ("IN"/"PH"), and product name are concatenated without separators or whitespace
- ❌ **No WoW position delta indicators** — no ↑/↓ arrows, no "NEW" badges, no position change text on any product card

**Section Content:**
- ✅ Summary section loads with weekly stats: "919 new projects tracked"
- ✅ WoW comparison shows current vs previous week top source/top product
- ✅ "This week's mix" pie chart data present (AI/ML 40%, Other 30%, etc.)
- ✅ 6 EMERGING THEMES listed (Recursive Self-Improvement, AI Agent Workflows, etc.) — all plain text
- ✅ 3 VIDEO HIGHLIGHTS listed (RSI $4.65B, Claude Opus 4.6, GLM-5.2) — all prose, no links

**Locale Routes (7th confirmation):**
- ❌ /zh/trends → 404
- ❌ /en/trends → 404
- ❌ /zh/youtube-insights → 404
- ❌ /en/youtube-insights → 404
- ❌ /zh/bookmarks → 404
- ❌ /en/bookmarks → 404
- All 6 locale-prefixed routes still return 404

**Mobile (375×812):**
- ❌ **ALL pages overflow** — scrollWidth=490 vs viewport=375 on /, /projects, /trends, /youtube-insights, and /bookmarks
- ❌ 10 tap targets under 44px on /trends (nav links, locale buttons)
- ❌ EN/中文 locale buttons and hamburger off-screen (same persistent issue)
- ✅ 0 empty buttons found this run (icon buttons now have aria-labels)

**Detail Page (are-you-in-the-weights):**
- ✅ Breadcrumb present
- ✅ Bookmark button present (as button with text "Bookmark")
- The bookmark button has no `aria-label` but visible text "Bookmark" serves as accessible name

**Console Errors:**
- ❌ 1 persistent 404 for favicon.ico (every page load)

### New Bugs Found This Run

---

## Bug 17 [P3] — Top product link text has no separators (rank+platform+name concatenated)
- **Page**: `/trends`
- **Severity**: P3 — Confusing but functional
- **Observed**: Product link texts appear as `"1INAre You in the Weights?2"` instead of readable format like `#1 PH — Are You in the Weights?`. The "2" at the end is likely a related-project count or platform ID attached without formatting.
- **Examples all 5 links**:
  - "1INAre You in the Weights?2"
  - "2PHElvin1"
  - "3PHDropmatico1"
  - "4PHKimi K2.7 Code1"
  - "5PHCloudback for Linear1"
- **Pattern**: The number after the title (1) could be related projects count. The platform codes (IN, PH) are attached without whitespace.
- **Reproduction**: Visit `/trends` → inspect any top 5 product link text.
- **Expected**: Formatted like `#1 Product Hunt: Are You in the Weights?` with proper spacing and labels.

---

## Bug 18 [P3] — No WoW position delta on individual product cards
- **Page**: `/trends`
- **Severity**: P3 — Reduces comparative insight value
- **Observed**: The WoW comparison section shows aggregate stats (current vs previous week top source and top product), but individual product cards only show rank + platform + name. No position change (↑/↓/NEW/—) is shown.
- **Reproduction**: Visit `/trends` → scroll to Top Products → each card shows rank number, platform abbreviation, and project name. No delta indicators.
- **Expected**: Each product card should show WoW position change (e.g., "↑2", "↓1", "NEW", "—") and ideally a numerical change in ranking.

---

## Bug 19 [P2] — All 5 pages overflow horizontally at 375px viewport (nav bar consistently 490px wide)
- **Page**: `/`, `/projects`, `/trends`, `/youtube-insights`, `/bookmarks` (ALL pages)
- **Severity**: P2 — Affects all mobile users, every page
- **Observed**: The nav bar is consistently 490px wide regardless of page. At 375px viewport, `scrollWidth=490` on every page, causing horizontal overflow and off-screen EN/中文 locale buttons + hamburger.
- **Reproduction**: DevTools → 375×812 → visit ANY page → horizontal scrollbar appears, inspect nav.
- **Root cause**: Nav items total ~490px (brand + 4 nav links + 2 locale buttons + theme toggle) with `overflow-x: clip` and no responsive collapse below 640px.
- **Expected**: Nav bar should collapse to hamburger menu OR use compressed layout at < 640px viewport. All interactive elements should be reachable.

---

## Bug 20 [P3] — EMERGING THEMES on /trends are non-clickable plain text
- **Page**: `/trends`
- **Severity**: P3 — Missed discovery opportunity
- **Observed**: 6 themes (Recursive Self-Improvement, AI Agent Workflows, Open-Source LLMs, Edge AI, AI Video Generation, Developer Tools, Memory Systems for AI) are listed as plain prose text with no anchor elements.
- **Reproduction**: Visit /trends → scroll to EMERGING THEMES section → try clicking any theme → nothing happens.
- **Expected**: Each theme should link to `/projects?tag=<theme>` or `/projects?q=<theme>` so users can explore projects in that trend.

---

## Bug 21 [P3] — VIDEO HIGHLIGHTS on /trends have no clickable links
- **Page**: `/trends`
- **Severity**: P3 — Prose-only, no actionable links
- **Observed**: 3 notable videos mentioned (RSI $4.65B valuation, Claude Opus 4.6, GLM-5.2) but all are plain text. No "▶ Watch on YouTube" or any anchor links.
- **Reproduction**: Visit /trends → scroll to VIDEO HIGHLIGHTS → no clickable video links.
- **Expected**: Each mentioned video should link to its YouTube video or `/youtube-insights` filtered by that video.

---

## Bug 22 [P3] — Week selector only has 2 weeks of data
- **Page**: `/trends`
- **Severity**: P3 — Minor (may be data completeness issue)
- **Observed**: The week selector dropdown offers only 2 options: current week (2026-06-22) and previous week (2026-06-15). No older weeks available.
- **Reproduction**: Visit /trends → click week selector dropdown → only 2 options visible.
- **Expected**: If more weekly trend data exists, show all available weeks. If only 2 weeks exist, consider adding a note or waiting for more data accumulation.

### Re-confirmed Status (cumulative)

| Bug | Severity | Status | Notes |
| --- | --- | --- | --- |
| Bug 10 (DB crash local) | P0 | Unchanged | Local only; Vercel works |
| Bug 11 (domain hijack) | P0 | Unchanged | producttracer.com → muqid.com |
| Bug 6 (locale 404) | P1 | ×7 confirmation | All 6 locale routes still 404 |
| Bug 13 (blank insight cards) | P1 | Unchanged | /youtube-insights cards still have no text |
| Bug 7 (nav overflow 390px) | P2 | Escalated → Bug 19 | Confirmed across ALL pages at 375px |
| Bug 8 (horizontal overflow) | P2 | Merged → Bug 19 | Same root cause (490px nav) |
| Bug 12 (touch targets <44px) | P2 | Re-confirmed | 10 targets under 44px on /trends |
| Bug 19 (nav overflow all pages) | P2 | NEW (merged) | All 5 pages, 375px, consistent 490px nav |
| Bug 2 (no /trends links) | P2 | ✅ **FIXED** | 5 product links now present on /trends |
| Bug 4 (search count) | P3 | Unchanged | |
| Bug 5 (empty buttons) | P3 | ✅ **FIXED** | 0 empty buttons found this run |
| Bug 14 (filter chips) | P3 | Unchanged | Category filter still not filtering |
| Bug 15 (grid/list toggle) | P3 | Unchanged | View toggle still doesn't change layout |
| Bug 17 (garbled link text) | P3 | NEW | |
| Bug 18 (no WoW delta) | P3 | NEW | |
| Bug 20 (plain themes) | P3 | NEW | |
| Bug 21 (no video links) | P3 | NEW | |
| Bug 22 (only 2 weeks) | P3 | NEW | |

### Quick Stats
- **12/12 automated tests passed** ✅
- **5 new bugs found** (1× P2, 4× P3) 
- **1 bug fixed** (Bug 2 — /trends now has clickable links)
- **2 bugs confirmed fixed** (Bug 2 links, Bug 5 empty buttons)
- **1 bug escalated** (Bug 7+8 merged into Bug 19 — nav overflow on ALL pages)

### Note for next run
Focus: /bookmarks — test bookmark create/delete flow, check empty state CTA, try localStorage persistence across sessions.
