# Bug Reports — 2026-06-24

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
