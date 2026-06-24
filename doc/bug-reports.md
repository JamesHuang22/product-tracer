# Bug Reports — 2026-06-24

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
- **Page**: `/projects/[slug]` — visited `/projects/pewdiepie-archdaemon-odysseus`
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
- **Context**: Says "No bookmarks yet. Save a project to find it here." with a Browse all projects link. But there's no indication whether or how to log in/sign up. A user who hasn't bookmarked anything may not know bookmarks require a user session.
- **Expected**: Either (a) remove bookmarks for anonymous users entirely, (b) show a "Sign in to save bookmarks" message, or (c) indicate bookmarks are localStorage-based (if that's the case).
- **Reproduction**: Visit /bookmarks while not logged in → see empty state; no auth action available.

---

## Bug 4 [P3] — Search input on /projects but no visible search results count
- **Page**: `/projects`
- **Context**: A search `<input type="search">` exists on /projects. When typing, the results count at the bottom stays at "4610 of 4610" even after typing "AI" — suggesting either client-side filtering is applied (in which case the total count should update) or the search doesn't filter.
- **Note**: Could not fully test this via Puppeteer due to async filter state — needs manual verification.
- **Expected**: After typing a search term, the project count should update to reflect filtered results (e.g., "42 of 4610").

---

## Bug 5 [P3] — Empty buttons rendered in button list
- **Page**: `/projects`
- **Context**: The page evaluate found **many empty `<button>` elements** (buttons with `""` as textContent). These are likely icon-only buttons (stars/forks sort toggles) without accessible labels or aria-labels.
- **Impact**: Accessibility concern — screen readers will encounter nameless interactable elements.
- **Expected**: Icon-only buttons should have `aria-label` attributes.

---

## Observation: domain migration from producttracer.com → muqid.com
- `producttracer.com` now 301-redirects to `muqid.com` for all routes
- The vercel.app deployment still works: `product-tracer.vercel.app`
- Automated tests use the Vercel URL ✓
- If producttracer.com is the canonical/marketing domain, the redirect may be intentional; if not, this could break bookmarks, SEO, and shared links.
