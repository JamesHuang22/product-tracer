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
