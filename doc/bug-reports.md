
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
