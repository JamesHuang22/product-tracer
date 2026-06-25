# Bug Reports — 2026-06-25 | Tour #56

## Focus: Homepage — first impression, insight cards, key_insight leak regression, ZH locale

**Environment**: Vercel (product-tracer.vercel.app)
**Date**: 2026-06-25T02:35:00 UTC

### Automated Test
- 12/12 tests ✅ (5 pages HTTP 200, grid layout, ZH locale baseline)

---

### [P0] key_insight field leaking raw JSON on homepage (regression)

**Severity**: P0 — sensitive backend schema exposed in rendered HTML

**Detail**: Raw JSON fragments containing `key_insight`, `key_insight_zh`, `sentiment`, and `relevance_score` fields are leaking in rendered text on the homepage. This was previously fixed (TASK 1) but the fix regressed. 6 leak instances found:

```
"sentiment":"neutral","key_insight":"The US Commerce Secretary accuses...
"sentiment":"positive","key_insight":"Getting your first 10 customers re...
"sentiment":"neutral","key_insight":"An AI lab with no product yet rais...
```

**Reproduction**:
1. Go to https://product-tracer.vercel.app/
2. Search page body for 'key_insight' — 6 matches found
3. Visible in insight card text alongside proper rendered content

**Expected**: No backend field names (`key_insight`, `sentiment`, `relevance_score`) should appear in rendered HTML. Only the localized text content should render.

**Impact**: Exposes internal schema structure to users. Minor scraping risk. Indicates the TASK 1 fix (null/empty guard) may have been lost in a recent deployment or is not covering this code path.

---

### [P0] ZH locale homepage (/zh) returns 404 (regression)

**Severity**: P0 — locale switching from EN to ZH on homepage is broken

**Detail**: `/zh` returns a 404 page with "This page could not be found." and title "Product Tracer — Cross-platform indie product signals" (EN fallback). This is a regression from earlier runs where `/zh/` homepage worked.

**Reproduction**:
1. Go to https://product-tracer.vercel.app/zh
2. Observe 404 page with "This page could not be found."
3. No locale toggles are rendered on the 404 page

**Expected**: `/zh` should render the homepage with Chinese-localized content (H1, nav items, insight cards in ZH).

**Impact**: Zero Chinese-language users can access the app. All locale-prefixed routes are now broken (P0 already tracked for /trends, /youtube-insights, /bookmarks — /zh homepage is newly broken).

---

### [P3] Homepage CTA button labels: "Browse all projects" vs "All projects"

**Severity**: P3 — minor UX inconsistency

**Detail**: The hero section has "Browse all projects" CTA, but the Projects section below has "All projects" — two different labels for the same destination (/projects).

**Reproduction**:
1. Go to homepage
2. Hero area: "Browse all projects" button
3. Projects section header: "All projects" link
4. Both go to /projects

**Expected**: Consistent action label. "Browse all projects" is more descriptive and action-oriented — should be used in both places.

---

### [P3] No section transitions or scroll indicators on homepage

**Severity**: P3 — minor UX feedback

**Detail**: The homepage loads all 2616px at once with hard section boundaries. No scroll-down hint, no transition between hero → projects → insights → trends sections. The hero is not scroll-constrained (full-height + CTA visible at 900px viewport) so first-time users may not realize there's content below.

**Reproduction**:
1. Go to homepage at 1440x900 viewport
2. Hero fits entirely on screen (no fold cue)
3. Scroll down — sections appear abruptly with no transition

**Expected**: A subtle scroll indicator (arrow/dots), smooth section transitions, or a partial exposure of next section to encourage scrolling.

---

### What was OK
- Load time: 1607ms (acceptable)
- Meta description present and clear
- H1 value proposition: "Cross-platform signals for indie products." — communicates value in 3 seconds ✅
- 0 broken images (no images on homepage)
- 3 section headings: Projects, Insights, Trends
- Stats cards look good: Total projects 4.6k, Active platforms 4, New this week 922, Hot signals 155
- Browse all projects CTA works correctly → /projects loads fine
- 0 console errors
- 6 YouTube links rendered correctly on homepage
- /projects has 0 key_insight leaks (only homepage affected)
- Project count: 4610 of 4610

---


# Bug Reports — 2026-06-25 | Tour #55

## Focus: /projects — search, category filter, mobile overflow

**Environment**: Vercel (product-tracer.vercel.app)
**Date**: 2026-06-25T02:05:00 UTC

### Automated Test
- 12/12 tests ✅ (5 pages HTTP 200, grid layout, ZH locale baseline)

---

### [P1] Search input on /projects is completely non-functional

**Severity**: P1 — search/filter is a core UX expectation and does not work at all

**Detail**: The search input on /projects exists (placeholder: "Search projects…") but does not filter the project list regardless of method:
- Navigating to `/projects?q=react` shows all 4610 projects (unfiltered)
- Typing in the search input and pressing Enter navigates to `/projects` WITHOUT appending the `?q=` parameter (the URL drops the query entirely)
- No API/network requests are made when search is invoked
- The same bug applies to category filter URL params (`/projects?category=design` shows all 4610 projects) and sort params (`/projects?sort=newest` still shows odysseus first)

**Reproduction**:
1. Go to https://product-tracer.vercel.app/projects?q=react
2. Observe "4610 of 4610" in the count — all projects shown, no filtering applied
3. Search input field is empty despite `?q=react` in the URL
4. Type "react" into the search input and press Enter
5. URL changes to `/projects` (no query param), still 4610 projects shown

**Expected**:
- URL param `?q=react` should populate the search input AND filter the project list to matching results
- Pressing Enter after typing should navigate to `/projects?q=<search-term>` AND filter results
- Category and sort URL params should also work

**Likely root cause**: The search is a client-side component that may not read URL search params on mount, or the project listing page ignores `q`, `category`, and `sort` query params entirely. Possibly a stale/mock search component.

---

### [P1] All URL query params (/projects) are ignored (q, category, sort)

**Severity**: P1 — multiple param types (search, category filter, sorting) are all silent failures

**Detail**: Confirmed:
- `/projects?q=react` → shows all 4610 (no search filter)
- `/projects?category=design` → shows all 4610 (no category filter)
- `/projects?sort=newest` → odysseus is still first (same order as star-sort default)

**Reproduction**:
1. Navigate to `/projects?category=design`
2. Observe "4610 of 4610" projects shown — filter not applied
3. Navigate to `/projects?sort=newest`
4. Project order is unchanged from default star-sort

**Expected**: Query params should affect the displayed project list (search filter, category filter, sort order).

---

### [P3] 57 small tap targets on /projects at 375px viewport (regression from 14)

**Severity**: P3 — accessibility concern, worsened from earlier report of 14

**Detail**: At 375px viewport, 57 interactive elements on /projects are < 36px in at least one dimension. Previously reported 14 on project detail pages; this is much worse on the listing page due to category pills, tags, and other elements.

**Reproduction**:
1. Open DevTools, set 375px viewport
2. Navigate to /projects
3. Run `document.querySelectorAll('a, button').filter(el => el.getBoundingClientRect().width < 36 || el.getBoundingClientRect().height < 36)`
4. 57 elements are undersized

---

### [P3] Nav overflow at 375px viewport (400px nav in 375px viewport)

**Severity**: P3 — cosmetic, body overflow is clipped

**Detail**: The `<nav class="flex">` element is 400px wide in a 375px viewport. Body `overflow-x: clip` hides the overflow but the nav doesn't fit properly. The hamburger menu is present but the nav container itself overflows.

**Reproduction**:
1. Open DevTools, set 375px viewport
2. Navigate to any page
3. Inspect `<nav>` element — it's 400px wide in a 375px viewport
4. `document.body.scrollWidth` = 490px, `clientWidth` = 375px

**Expected**: Nav should be ≤ 375px wide to prevent any horizontal overflow at smallest mobile viewports.

---

### What was OK
- /projects loads quickly (100 project links)
- First project detail has breadcrumb, bookmark button, 3 sections (CROSS-PLATFORM SIGNALS, AI SUMMARY, YOU MIGHT ALSO LIKE)
- 0 broken images on detail page
- Searching shows "4610 of 4610" counts correctly (backend healthy)
- Empty search 'zzzzzznonexistent123456' correctly returns 100 project links (showing count is server-side, though filter is broken client-side)

---


# Bug Reports — 2026-06-25 | Tour #54

## Focus: Custom domain redirect / DNS issue — P0

**Environment**: producttracer.com (production custom domain)
**Date**: 2026-06-25T01:50 UTC

### Automated Test
- 12/12 tests ✅ (against Vercel URL)

---

### [P0] Custom domain producttracer.com redirects to muqid.com — site is unreachable via main URL

**Severity**: P0 — site is completely inaccessible via the custom domain. All traffic to producttracer.com 301-redirects to http://www.muqid.com (a completely unrelated Belgian company site).

**Detail**:
- `curl -sI https://producttracer.com` → `HTTP 301 → http://www.muqid.com`
- The Vercel deployment at `https://product-tracer.vercel.app` is healthy (HTTP 200 on all 5 core pages)
- The custom domain DNS/Vercel binding appears to have broken or been overridden
- All sub-routes (/projects, /trends, /youtube-insights, /bookmarks) also redirect to muqid.com
- muqid.com shows "Currently there is no content to show." on all Product Tracer routes

**Reproduction**:
1. Go to https://producttracer.com in any browser
2. Browser redirects to http://www.muqid.com with no user-facing Product Tracer content
3. All producttracer.com/* paths redirect identically to muqid.com/*
4. Existing users who have bookmarked producttracer.com see the Belgian company site

**Impact**:
- 100% of users accessing via producttracer.com cannot reach the app
- SEO is likely impacted (canonical domain now points to unrelated content)
- Bookmarked links are dead
- This effectively takes the entire product offline from its intended domain

**Likely root cause**:
- DNS records for producttracer.com may have been changed (CNAME, ALIAS, or A record no longer points to Vercel)
- Vercel domain configuration may have expired or been removed
- SSL certificate on Vercel side for producttracer.com may have expired/been revoked
- Domain registrar DNS changes or Vercel project domain setting reset

**Suggested next steps**:
1. Check Vercel project settings → Domains — is producttracer.com still configured?
2. Check DNS records for producttracer.com (CNAME/ALIAS to `cname.vercel-dns.com` or similar)
3. Check domain registrar (likely Namecheap/Cloudflare/GoDaddy) — any recent DNS changes?
4. If a Vercel config issue: re-add domain to Vercel project, re-provision SSL cert
5. If a DNS issue: update DNS records, wait for propagation

**Workaround**: Users can still access the app at https://product-tracer.vercel.app while the domain issue is resolved.

---

# Bug Reports — 2026-06-25 | Tour #53 (previous entry preserved below)

## Focus: /trends page — week selector, WoW indicators, emerging themes, video highlights

**Environment**: Vercel (product-tracer.vercel.app)
**Date**: 2026-06-25T01:35:00 UTC
**Tour script**: trends-tour.cjs, trends-detail.cjs

### Automated Test
- 12/12 tests ✅ (5 pages HTTP 200, grid layout, ZH locale baseline)

---

### [P2] Week selector label missing space between text and date range
**Severity**: P2 — minor rendering glitch
**Detail**: The week selector `<label>` renders as "Week2026-06-22 – 2026-06-28" with no space between "Week" and the date range. Should be "Week 2026-06-22 – 2026-06-28" or similar.
**Reproduction**:
1. Go to /trends
2. Inspect the week selector dropdown label
3. Observe: "Week2026-06-22" — missing space after "Week"
4. Expected: "Week 2026-06-22 – 2026-06-28"

### [P3] WoW comparison section shows raw date ranges without formatting
**Severity**: P3 — cosmetic
**Detail**: The "Week over week" section shows raw date strings "This week2026-06-22 – 2026-06-28" and "Last week2026-06-15 – 2026-06-21" without proper spacing or label formatting between "week" and the date range.
**Reproduction**:
1. Go to /trends, scroll to "Week over week" section
2. Observe: "This week2026-06-22 – 2026-06-28" (no space after 'week')
3. Expected: "This week: 2026-06-22 – 2026-06-28" or better formatting with human-readable labels

### [P3] Product cards in Top Products section show rank/platform badge formatting issue
**Severity**: P3 — unclear display
**Detail**: Product card text shows concatenated rank+platform+title without separators, e.g., "1INAre You in the Weights?2" instead of "1. IN Are You in the Weights?" or similar. The platform badge "IN" and rank "1" are concatenated against each other and the title.
**Reproduction**:
1. Go to /trends, scroll to Top Products section
2. Observe card text: "1INAre You in the Weights?2" (garbled concatenation)
3. Expected: "#1 • IN • Are You in the Weights?" or spaced formatting

### [P3] No WoW delta indicators on individual product cards
**Severity**: P3 — already tracked in FRONTEND_REQUEST.md
**Detail**: Top Products list shows rank + platform + title but no week-over-week position change (e.g., "↑2", "↓1", "NEW"). Only the first card shows a delta number (the "2" at end of title text).
**Reproduction**:
1. Go to /trends, scroll to Top Products
2. Check if any card shows position change indicator
3. Cards 2-5 show no delta at all; card 1 has ambiguous "2" at end

### [P3] Emerging Themes are plain text with no clickable links
**Severity**: P3 — already tracked in FRONTEND_REQUEST.md
**Detail**: All 8 emerging themes (Recursive Self-Improvement, AI Agent Workflows, etc.) render as plain text. None are clickable. No links to filtered project views.
**Reproduction**:
1. Go to /trends, scroll to Emerging Themes section
2. Click any theme — nothing happens
3. Expected: each theme links to /projects?tag=... or /projects?q=...

### [P3] Video Highlights section has no clickable links
**Severity**: P3 — already tracked in FRONTEND_REQUEST.md
**Detail**: Video Highlights is a plain prose paragraph. Mentions RSI, Claude Opus 4.6, GLM-5.2 but provides zero clickable YouTube links.
**Reproduction**:
1. Go to /trends, scroll to Video Highlights section
2. No "▶ Watch on YouTube" links exist
3. Expected: each mentioned video has a clickable link

### [P0] Locale-prefixed /zh/trends and /en/trends still return 404
**Severity**: P0 — core navigation broken
**Detail**: Confirmed again this run. /zh/trends and /en/trends both show "404 — This page could not be found." Only /trends works (EN default).
**Reproduction**:
1. Go to /trends, click locale toggle to EN or 中文
2. Expected: locale-prefixed page loads
3. Actual: 404 error page

### What was OK
- /trends loads quickly with title "Weekly Hot Trends — Product Tracer"
- Week selector dropdown works (2 weeks available: 2026-06-22 and 2026-06-15)
- Summary section has useful narrative content about weekly activity
- WoW comparison section has both "This week" and "Last week" data
- Top Products links work correctly (click through to project detail pages)
- Detail pages from trend links have breadcrumb, bookmark button, and AI summary

---

# Bug Reports — 2026-06-25 | Tour #52

## Focus: Mobile (375px viewport) + Deep search / locale-prefixed routes on Vercel

**Environment**: Vercel (product-tracer.vercel.app)
**Date**: 2026-06-25T00:50:00 UTC
**Tour script**: tour-mobile.mjs, tour-deep.mjs

### Automated Test
- 12/12 tests ✅ (5 pages HTTP 200, grid layout with 100+ project links, ZH locale baseline)

### Mobile Tour Findings (375px viewport)

#### ✅ Nav bar responsive collapse working
- All 5 pages show a hamburger menu at 375px viewport
- No horizontal overflow detected on any page
- All nav links are reachable (proper mobile collapse)

#### ✅ Homepage scrollable on mobile
- 6 scroll segments covered: hero → Projects section → Insights → Trends section
- No content clipping, no broken layout

#### ⚠️ 14 small tap targets (< 36px) on project detail page
**Severity**: P3
**Detail**: On [slug] detail pages at 375px viewport, 14 interactive elements are smaller than Apple's recommended 44px / Google's 48px minimum tap target. Likely includes tags, badges, category pills, or footer links.
**Reproduction**:
1. Open Chrome DevTools, set 375px viewport
2. Navigate to any project detail page (e.g., /projects/odysseus)
3. Inspect tap targets with DevTools or run `document.querySelectorAll('a, button')` and filter by `el.getBoundingClientRect()` < 36px

#### ✅ Bookmarks page has proper empty state
- "No bookmarks yet. Save a project to find it here." with CTA "Browse all projects"
- Good UX

### Deep Search / Locale Findings

#### [P0] All locale-prefixed routes return 404 (confirmed)
**Severity**: P0 — core navigation is broken
**Affected routes confirmed 404**:
- `/en/projects`
- `/zh/projects`
- `/en/trends`
- `/zh/trends`

(Expected same for `/en/youtube-insights`, `/zh/youtube-insights`, `/en/bookmarks`, `/zh/bookmarks`)

**Reproduction**:
1. Click locale toggle on any page (projects, trends, insights)
2. Expected: page reloads with locale prefix (e.g., `/zh/projects`)
3. Actual: 404 page ("This page could not be found.")
4. User is stuck with no working locale-switching flow for any page except homepage

**Note**: Already tracked in FRONTEND_REQUEST.md as [P2] — should be promoted to P0 since locale toggle is broken for all non-homepage routes.

#### [P2] No empty state for zero-result search on /projects
**Severity**: P2 — confusing UX
**Detail**: Searching for a non-existent term ("zzzzzzzz") on /projects yields blank content with no informative message. No "No results", "No projects found", "Try a different search", or similar text appears.
**Reproduction**:
1. Go to /projects
2. Search for "zzzzzzzz" (type or via URL param `?q=zzzzzzzz`)
3. Observe: no feedback that search returned zero results
4. Expected: "No projects matching 'zzzzzzzz'" or empty state illustration

#### ✅ Homepage insight cards are healthy
- All 3 insight cards have rich text content (no empty cards)
- No `key_insight` field leakage in rendered HTML
- Section headings present: "Latest activity" / "Insights" context
- TASK 1 fix appears to be working on production

### What was OK
- All 5 core pages load and render at 375px viewport
- Nav hamburger menu present on all pages
- Bookmarks page has proper empty state
- Insight cards all have text content (no blank cards)
- Homepage scrollable end-to-end on mobile
- No broken images on detail page
- Breadcrumb + bookmark button present on detail pages
