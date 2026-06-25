# Bug Reports — 2026-06-25 | Tour #51

## Focus: /projects (search, sort, filter, detail pages) on Vercel

**Environment**: Vercel (product-tracer.vercel.app)
**Date**: 2026-06-25T00:38:00 UTC

### Automated Test
- 12/12 tests ✅ (5 pages HTTP 200, grid layout, ZH locale baseline)

### Human Tour Findings

#### [P0] /en/projects returns 404 (locale-prefixed routes broken)
**Severity**: P0 — consistent with existing queue ticket
**Detail**: `/en/projects` returns HTTP 404 ("This page could not be found"). Only non-prefixed `/projects` and `/projects?locale=zh` work.
**Reproduction**:
1. Navigate to `https://product-tracer.vercel.app/en/projects`
2. Observe 404 page
3. Same issue expected for `/en/trends`, `/en/youtube-insights`, `/en/bookmarks`, `/zh/trends`, `/zh/youtube-insights`, `/zh/bookmarks`
**Already filed in**: FRONTEND_REQUEST.md [P2] — should be promoted to P0 since locale toggle is unusable

#### [P3] Favicon missing (404)
**Detail**: `https://product-tracer.vercel.app/favicon.ico` returns 404
**Reproduction**: Open browser console on any page
**Impact**: Low — cosmetic, browser shows no favicon

#### [P3] EN and ZH content identical on /projects via query param
**Detail**: `?locale=zh` on /projects does not change site content (body text same length, Chinese characters present in both EN and ZH mode likely from project descriptions, not nav/UI).
**Reproduction**:
1. Visit `/projects` and `/projects?locale=zh`
2. Compare body text — identical content
3. Chinese characters detected in both because project titles/descriptions contain CJK data regardless of locale
**Root cause**: Likely locale only affects nav labels, not project data

#### [P2] "zzzzzzzz" search yields no empty state
**Detail**: Searching for a non-existent term ("zzzzzzzz") on /projects does not trigger an empty-state message (no "No results", "no projects", "Not found", or "try a different" text). The search clears results but shows nothing informative.
**Reproduction**:
1. Go to /projects
2. Type "zzzzzzzz" in search box
3. Observe no empty state message
**Expected**: Show "No projects found for 'zzzzzzzz'" or similar

### Locale-prefixed routes still P0
- `/en/projects` → 404 (confirmed this run)
- FRONTEND_REQUEST.md already tracks this as [P2], should be P0

### What was OK
- Search input works (placeholder: "Search projects…")
- Sort dropdown present
- Category filter via dropdown
- All 5 core pages respond 200
- ZH mode has Chinese characters
- Detail page breadcrumb: ✅
- Detail page bookmark button: ✅
- No broken images on detail pages
- Page load times OK
