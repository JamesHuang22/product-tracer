# Bug Reports — 2026-06-25 | Tour #60

## Focus: /youtube-insights — grid/list toggle, category filter, EN/ZH locale

**Environment**: Vercel (product-tracer.vercel.app)
**Date**: 2026-06-25T03:35 UTC

### Automated Test
- 12/12 tests ✅ (5 pages HTTP 200, grid layout, ZH locale baseline)
- Note: `projects[i].href` in test script captures first 100 links; actual link count may differ — this is a test limitation, not a bug

---

### [P0] key_insight field leaking raw JSON on HOMEPAGE (regression — still unfixed)

**Severity**: P0 — sensitive backend schema exposed in rendered HTML

**Detail**: Raw JSON fragments containing `key_insight`, `sentiment`, and `relevance_score` fields are leaking in rendered text on the homepage. 6 instances confirmed. This was first reported in Tour #56 and has persisted across runs #57, #58, #59, #60.

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

### [P0] All locale-prefixed routes return 404 (regression — still unfixed)

**Severity**: P0 — core navigation broken

**Confirmed this run**:
- `/zh` → HTTP 404
- `/en/youtube-insights` → HTTP 404
- `/zh/youtube-insights` → HTTP 404

**Previously confirmed (persistent across 5+ runs)**:
- `/en/projects`, `/zh/projects`: HTTP 404
- `/en/trends`, `/zh/trends`: HTTP 404
- `/en/youtube-insights`, `/zh/youtube-insights`: HTTP 404
- `/en/bookmarks`, `/zh/bookmarks`: HTTP 404

**Reproduction**:
1. Navigate to any locale-prefixed URL (e.g., `/zh/youtube-insights`)
2. Browser shows "This page could not be found." 404
3. Clicking the ZH locale button on /youtube-insights changes URL to `?category=ai_ml` instead of `/zh/youtube-insights` (navigates to base path + query, not locale prefix)

**Expected**: All routes support both `/en/...` and `/zh/...` prefixing for consistent locale switching.

---

### [P2] Category filter pills on /youtube-insights do NOT filter content

**Severity**: P2 — core UX expectation broken

**Detail**: The 8 category filter pills (AI/ML, Developer Tools, Startup/Business, Tech News, etc.) on /youtube-insights are rendered and clickable, but clicking them does NOT filter the video list. The URL changes from `/youtube-insights` to `/youtube-insights?category=ai_ml`, but the content stays the same (20 YouTube links before and after).

**Reproduction**:
1. Go to https://product-tracer.vercel.app/youtube-insights
2. Count YouTube video links (20)
3. Click "AI/ML (25)" category pill
4. URL changes to `?category=ai_ml` but YouTube link count remains 20
5. No API request is triggered; content does not re-render

**Expected**: Clicking a category should filter the displayed videos to only those in that category. Content and link count should change.

---

### [P2] ZH locale button on /youtube-insights does NOT update URL locale prefix

**Severity**: P2 — locale switching UX bug

**Detail**: Clicking the "中文" button on /youtube-insights changes the page content to Chinese (nav items, category labels, video summaries all in ZH), but the URL stays at `/youtube-insights?category=ai_ml` instead of changing to `/zh/youtube-insights?category=ai_ml`. The locale state is stored client-side without URL reflection.

**Reproduction**:
1. Go to /youtube-insights
2. Click "中文" button
3. Page content correctly switches to Chinese (验证, 开发工具, 创业/商业)
4. URL remains at `/youtube-insights` (or `/youtube-insights?category=...`)
5. Expected: URL should reflect locale as `/zh/youtube-insights`

**Expected**: Locale switching should update the URL path (e.g., `/en/...` or `/zh/...`) so that:
- The locale is bookmarkable
- Refreshing the page preserves the locale choice
- Direct navigation to `/zh/youtube-insights` works (currently 404)

---

### [P3] RSC 404 on homepage for project "airposture-open-source-posture-coach-using-airpods"

**Severity**: P3 — console error, non-breaking

**Detail**: The homepage triggers a `_rsc` fetch for `/projects/airposture-open-source-posture-coach-using-airpods` that returns HTTP 404. This suggests the homepage is trying to prefetch/link to a project detail page that doesn't exist, or the slug changed/regenerated.

**Reproduction**:
1. Open browser DevTools on homepage
2. Observe: `Failed to load resource: the server responded with a status of 404 ()`
3. URL: `/projects/airposture-open-source-posture-coach-using-airpods?_rsc=...`

**Expected**: No broken internal links on the homepage. Either the link should be removed or the project should exist.

---

### What was OK
- /youtube-insights title correct: "YouTube Insights — Product Tracer" ✅
- Grid/list toggle exists and renders properly ✅
- 93 insights loaded (total count in ZH: "全部分类 (93)") ✅
- Category filter pills render with correct counts ✅
- ZH locale toggle renders Chinese content correctly ✅
- Bookmarks page has ZH empty state with CTA "浏览所有项目" ✅
- No key_insight leaks on /youtube-insights or /trends ✅
- No console errors on /youtube-insights ✅
- 25 YouTube video links present on /youtube-insights ✅
- Content is useful and informative: AI coding, business, dev tools insights ✅
- 5/5 core pages return HTTP 200 ✅

---

### All Open Bugs Summary

| Sev | Bug | Age |
|-----|-----|-----|
| P0 | Custom domain producttracer.com → muqid.com redirect | 5 runs |
| P0 | key_insight leak on homepage | 4 runs |
| P0 | All locale-prefixed routes return 404 | 5+ runs |
| P1 | Search/query params on /projects non-functional | 5 runs |
| P2 | No empty state for zero-result search on /projects | 5 runs |
| P2 | Category filter on /youtube-insights doesn't filter | NEW |
| P2 | ZH locale button doesn't update URL locale prefix | NEW |
| P3 | Multiple /trends rendering issues (labels, WoW, formatting) | 4 runs |
| P3 | Small tap targets / nav overflow on mobile | 5 runs |
| P3 | RSC 404 for airposture project on homepage | NEW |
