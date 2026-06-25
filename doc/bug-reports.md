# Bug Reports — 2026-06-25 | Tour #61

## Focus: /youtube-insights — grid/list toggle, category filter, EN/ZH locale

**Environment**: Vercel (product-tracer.vercel.app)
**Date**: 2026-06-25T03:50 UTC

### Automated Test
- 12/12 tests ✅ (5 pages HTTP 200, grid layout, ZH locale baseline)

---

### [P0] key_insight field leaking raw JSON on HOMEPAGE (regression — still unfixed, 5th run)

**Severity**: P0 — sensitive backend schema exposed in rendered HTML

**Detail**: Raw JSON fragments containing `key_insight`, `sentiment`, and `relevance_score` fields are leaking in rendered text on the homepage. 6 instances confirmed. This was first reported in Tour #56 and has persisted across all subsequent runs.

```
"sentiment":"neutral","key_insight":"The US Commerce Secretary accuses...
"sentiment":"positive","key_insight":"Getting your first 10 customers re...
"sentiment":"neutral","key_insight":"An AI lab with no product yet rais...
```

**Reproduction**:
1. Go to https://product-tracer.vercel.app/
2. Search page body for 'key_insight' — 6 matches found
3. Visible in insight card text alongside proper rendered content

**Expected**: No backend field names should appear in rendered HTML.

**Note**: This same bug is **NOT** present on /youtube-insights or /trends — only homepage is affected.

---

### [P0] All locale-prefixed routes return 404 (regression — still unfixed, 6th run)

**Severity**: P0 — core navigation broken

**Confirmed this run**:
- `/zh/youtube-insights` → HTTP 404 ("This page could not be found.")

**Previously confirmed (persistent across numerous runs)**:
- `/en/projects`, `/zh/projects`: HTTP 404
- `/en/trends`, `/zh/trends`: HTTP 404
- `/en/youtube-insights`, `/zh/youtube-insights`: HTTP 404
- `/en/bookmarks`, `/zh/bookmarks`: HTTP 404
- `/en/`, `/zh/`: HTTP 404

**Reproduction**:
1. Navigate to any locale-prefixed URL (e.g., `/zh/youtube-insights`)
2. Browser shows "This page could not be found." 404
3. The 404 page itself includes the EN/中文 locale toggle — creating a circular UX

**Expected**: All routes support both `/en/...` and `/zh/...` prefixing for consistent locale switching.

---

### [P2] Category filter pills on /youtube-insights do NOT filter content

**Severity**: P2 — core UX expectation broken

**Detail**: The 8 category filter pills (AI/ML, Developer Tools, Startup/Business, Tech News, etc.) are rendered and clickable, but clicking them does NOT filter the video list. The URL changes from `/youtube-insights` to `/youtube-insights?category=ai_ml`, but the content stays the same.

**Reproduction**:
1. Go to https://product-tracer.vercel.app/youtube-insights
2. Count YouTube video links — 25 present
3. Click "AI/ML (25)" category pill
4. URL changes to `?category=ai_ml` but YouTube link count remains 25
5. No API request is triggered; content does not re-render

**Expected**: Clicking a category should filter the displayed videos to only those in that category.

---

### [P2] ZH locale button on /youtube-insights does NOT update URL locale prefix

**Severity**: P2 — locale switching UX bug

**Detail**: Clicking the "中文" button on /youtube-insights changes the page content to Chinese (nav items, category labels, video summaries all in ZH), but the URL stays at `/youtube-insights?category=ai_ml` instead of changing to `/zh/youtube-insights?category=ai_ml`. The locale state is stored client-side without URL reflection.

**Reproduction**:
1. Go to /youtube-insights
2. Click "中文" button
3. Page content correctly switches to Chinese (验证, 开发工具, 创业/商业)
4. URL remains at `/youtube-insights` (or `/youtube-insights?category=ai_ml`)
5. Refresh the page — locale resets to EN

**Expected**: Locale switching should update the URL path so the locale is bookmarkable and survives page refresh.

---

### [P3] ALL mobile tap targets are below 44px accessibility threshold

**Severity**: P3 — accessibility violation on mobile

**Detail**: At 375px viewport, ALL 40 interactive elements (links + buttons) on /youtube-insights have bounding boxes smaller than 44×44px. This fails WCAG 2.5.5 (Target Size) and Apple's HIG minimum touch target of 44pt.

**Reproduction**:
1. Open DevTools, set viewport to 375×812 (iPhone)
2. Go to /youtube-insights
3. Run: `document.querySelectorAll('a, button').forEach(el => { const r = el.getBoundingClientRect(); if (r.width < 44 || r.height < 44) console.log(el.textContent.trim(), r.width, r.height); })`
4. All 40 elements report sub-44px dimensions

**Expected**: All interactive elements should have at least 44×44px tap targets, especially nav items, filter buttons, and pagination.

---

### [P3] RSC 404 for project "airposture-open-source-posture-coach-using-airpods" on homepage

**Severity**: P3 — console error, non-breaking

**Detail**: The homepage triggers a `_rsc` fetch for a project slug that returns HTTP 404.

**Reproduction**:
1. Open browser DevTools Network tab on homepage
2. Observe 404 response for `/projects/airposture-open-source-posture-coach-using-airpods?_rsc=...`

**Expected**: No broken internal links on the homepage.

---

### What was OK
- /youtube-insights title correct: "YouTube Insights — Product Tracer" ✅
- Grid/list toggle exists and renders properly ✅
- 93 insights loaded (total count in ZH: "全部分类 (93)") ✅
- Category filter pills render with correct counts ✅
- ZH locale when toggled renders Chinese content correctly ✅
- 25 YouTube video links present on /youtube-insights ✅
- Content is useful and informative (AI coding, business, dev tools insights) ✅
- No console errors on /youtube-insights ✅
- No broken images on /youtube-insights ✅
- No horizontal scroll on mobile at 375px ✅
- ZH button on /youtube-insights works — translates all content to 中文 ✅
- Pagination ("Next" on last page) exists ✅
- Mobile vh/scroll fits within 375px viewport ✅
- 5/5 core pages return HTTP 200 ✅

---

### All Open Bugs Summary

| Sev | Bug | Age |
|-----|-----|-----|
| P0 | key_insight leak on homepage | 5 runs |
| P0 | All locale-prefixed routes return 404 | 6 runs |
| P1 | Search/query params on /projects non-functional | 5 runs |
| P2 | No empty state for zero-result search on /projects | 5 runs |
| P2 | Category filter on /youtube-insights doesn't filter | 2 runs |
| P2 | ZH locale button doesn't update URL locale prefix | 2 runs |
| P3 | ALL mobile tap targets < 44px (40/40) | NEW |
| P3 | RSC 404 for airposture project on homepage | 2 runs |
