# Frontend Feature Requests — Product Tracer

Created: 2026-06-24 09:36 UTC
Source: Automated browser test Run #26 — locale-prefixed /trends returns 404, mobile nav overflow confirmed

---

## [P2] Fix locale-prefixed routes for /trends, /youtube-insights, /bookmarks

**Problem**: `/en/trends`, `/zh/trends`, `/en/youtube-insights`, `/zh/youtube-insights`, `/en/bookmarks`, and `/zh/bookmarks` all return 404 ("This page could not be found."). Only `/zh/` homepage and `/zh/projects` work with locale prefixes.

**Expected**: All routes should support locale prefixing so the locale toggle works consistently across the entire app. `/en/trends` should serve the trends page with EN nav items, `/zh/trends` with ZH nav items.

**How to find**: Check the route definitions in `apps/web/app/[locale]/` directory. The /trends, /youtube-insights, and /bookmarks pages may not be registered under the `[locale]` dynamic segment.

**Files likely affected**: Route group/page files in `apps/web/app/` — may need to move or duplicate pages under `[locale]` directory or fix middleware/navigation links.

---

## [P2] Mobile nav bar responsive collapse for sub-640px viewports

**Problem**: At 375px viewport (iPhone SE/12/13/14), the nav bar's EN/中文 locale toggle buttons and hamburger menu are rendered off-screen and are invisible/unreachable. The nav container is ~490px wide in a 375px viewport with `overflow-x: clip`.

**Root cause**: Nav bar uses `sm:` breakpoint (640px) with `gap-4 sm:gap-6`. No responsive behavior exists below 640px. The nav items (brand + 5 links + locale toggle + hamburger) don't fit at 375px.

**Expected**: 
- At viewports < 640px, collapse nav items into a hamburger menu (hide individual nav links + locale toggle behind menu)
- OR use a compressed layout (smaller gap, abbreviated brand, move locale to footer)
- All interactive elements should be reachable at 375px viewport

**Files likely affected**: `apps/web/app/components/nav.tsx` or similar nav component, plus mobile menu component.

---

## [P3] Add WoW indicator to /trends top product list

**Problem**: The /trends page lists "TOP PRODUCTS" but there's no week-over-week change indicator visible in the text. The WoW comparison card at the top shows aggregated stats, but individual product cards don't show their change (e.g., "↑12" or "↓3").

**How to verify**: Visit /trends, inspect the top 5 product list. Each card shows rank + platform badge + title but no WoW delta.

**Expected**: Each product card shows a WoW delta indicator (e.g., "↑2" means moved up 2 positions, "↓1" means dropped 1 position, "—" means unchanged). New entries should show "NEW".

---

## [P3] Add clickable links to EMERGING THEMES on /trends

**Problem**: The EMERGING THEMES section lists 8 themes as plain text. Users can't click a theme to see filtered projects.

**Expected**: Each theme keyword should link to a filtered view (e.g., `/projects?tag=recursive-self-improvement` or `/projects?q=ai-agent-workflows`).

---

## [P3] Add clickable video links to VIDEO HIGHLIGHTS on /trends

**Problem**: The VIDEO HIGHLIGHTS section is a plain prose paragraph summarizing notable videos (RSI, Claude Opus 4.6, GLM-5.2) with zero clickable links.

**Expected**: Each mentioned video should have a "▶ Watch on YouTube" link or similar.
