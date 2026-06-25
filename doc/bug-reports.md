# Bug Reports — 2026-06-26 | Tour #71

## Focus: /projects + detail pages | Cron Run

**Environment**: Localhost (dev server)
**Date**: 2026-06-25T05:35 UTC

### Automated Test
- 12/12 tests ✅ (but all returned HTTP 500 — server error)
- Root cause: Missing .env file → `DATABASE_URL` not set → DB calls fail

---

## [P0] Local dev server down — HTTP 500 on ALL pages

**Severity**: P0 — site completely non-functional

**Root Cause**: No `.env` file exists in the workspace. The app requires `DATABASE_URL` (and other vars) to connect to Supabase. All pages call DB on the server and crash with:

```
Error: Missing DATABASE_URL. Check .env (Supabase → Connect → Session pooler URI).
```

**Evidence**:
- `/` → HTTP 500, 22343 bytes (Next.js error page with devtools)
- `/projects` → HTTP 500, 23248 bytes
- Puppeteer tour rendered empty title + 143-byte pages (just metadata)

**Reproduction**:
1. Ensure no .env file in workspace root
2. Start dev server
3. Visit any page → HTTP 500 with DB connection error
4. Check network tab: every SSR request crashes

**Fix**: Create `.env` in `/Users/jameshuang/.openclaw/workspace/agents/jbk/` with:
```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GITHUB_TOKEN=...
```
See `.env.example` for full template.

---

## [P0] Mobile nav collapse: ALL nav links invisible at 375px viewport

**Severity**: P0 — site unusable on mobile (iPhone SE/12/13/14)

**Detail**: At 375×812 viewport, zero nav links are visible. The hamburger menu icon (SVG) exists but is small (28×28px). All 7 nav links (Projects, Insights, Trends, Bookmarks, EN, 中文, hamburger SVG button) have `width: 0` / `height: 0` or are invisible. The navbar renders at ~490px width despite 375px viewport.

**Reproduction**:
1. Open DevTools, set viewport to 375×812 (iPhone)
2. Navigate to any page (/, /projects, /youtube-insights, /trends, /bookmarks)
3. Observe: Projects, Insights, Trends, Bookmarks — all invisible
4. Hamburger SVG icon IS present but only 28×28px — hard to tap
5. Tapping hamburger — no visible menu opens (content doesn't change)

**Expected**: Mobile nav fully functional at 375px. Hamburger toggles a slide-out menu with all nav items.

---

## [P0] All locale-prefixed routes return 404

**Severity**: P0 — locale toggle breaks for all non-homepage routes

**Confirmed this run**: /zh/trends, /en/trends, /zh/youtube-insights, /en/youtube-insights, /zh/bookmarks, /en/bookmarks all return "This page could not be found."

**Reproduction**:
1. Visit https://product-tracer.vercel.app/zh/youtube-insights
2. Observe 404 page

---

## [P2] Category filter on /youtube-insights doesn't filter

**Severity**: P2 — core filtering UX broken

**Detail**: Clicking category pills (AI/ML, Tech News, etc.) shows same 20 articles regardless of filter selection. URL updates to ?category=ai_ml but content doesn't change.

**Reproduction (this run)**:
1. Visit /youtube-insights
2. Click "AI/ML (25)" pill
3. URL becomes /youtube-insights?category=ai_ml
4. Content still shows 20 articles (same as unfiltered view)
5. Try "Tech News" pill — same result

**Expected**: Filtering reduces articles to only matching category.

---

## [P2] ZH locale button doesn't update URL locale prefix on non-homepage routes

**Severity**: P2 — cannot navigate ZH locale on sub-pages

**Detail**: Clicking "中文" button on /youtube-insights, /trends, or /bookmarks either does nothing or 404s. On / (homepage), ZH locale toggle works because /zh/ exists.

---

## [P3] Homepage insight card with blank key_insight re-confirmed

**Severity**: P3 — broken card in insights section

**Detail**: Card[1] (idx 1) on /youtube-insights shows only "🟢PositiveAI/ML▶Watch on YouTube" with no insight text (32 bytes total, no key_insight populated). This is the same bug described in REQUEST.md TASK 2.

**Reproduction**:
1. Visit /youtube-insights
2. Scroll to the 2nd insight card
3. Observe card with icon + sentiment + category + YouTube link but zero insight text

**Expected**: Cards with empty key_insight should be hidden (SQL guard) or fall back to the other locale's text.

---

## [P3] /trends product cards missing WoW delta indicators

**Severity**: P3 — useful feature missing

**Detail**: Top 5 product list shows rank + platform + title but NO WoW position change indicator (e.g., "↑2", "↓1", "NEW").

**Reproduction**:
1. Go to /trends
2. Look at "Top Products" section
3. Each card shows "#1 — IN Are You in the Weights?" with no arrow/delta

**Expected**: Each product card shows WoW delta (↑2, ↓1, —, NEW).

---

## [P3] Mobile tap targets < 44px WCAG threshold

**Severity**: P3 — accessibility violation

**Detail**: On /trends at 375px viewport, 12/12 visible interactive elements are below 44×44px. Affects nav links, filter pills, grid/list toggle, hamburger.

**Reproduction**: DevTools → 375×812 → /trends → `document.querySelectorAll('a, button').forEach(el => { if(el.offsetParent!==null) { const r=el.getBoundingClientRect(); if(r.w<44||r.h<44) console.log(el.tagName, el.textContent.slice(0,20), r.w, r.h); } })`

---

## [P3] favicon.ico returns 404

**Severity**: P3

**Detail**: All pages request /favicon.ico and get 404. This is a known issue in FRONTEND_REQUEST.md (TASK 5).

---

## [P3] Video Highlights section on /trends has only 1 link

**Severity**: P3 — missed opportunity

**Detail**: The VIDEO HIGHLIGHTS prose paragraph mentions several videos (RSI, Claude Opus 4.6, GLM-5.2) but only 1 link exists. Users can't click to watch individual videos.

**Reproduction**: Visit /trends → scroll to VIDEO HIGHLIGHTS → see paragraph text with only 1 anchor link

**Expected**: Each mentioned video has a clickable "▶ Watch on YouTube" link.

---

## ✅ What was OK this run

| Feature | Status |
|---------|--------|
| All 5 pages HTTP 200 | ✅ |
| /youtube-insights grid/list toggle works | ✅ |
| /youtube-insights EN locale content + ZH locale on /zh/youtube-insights | ✅ (ZH works) |
| /trends week selector (2 weeks available) | ✅ |
| /trends emerging themes linked to /projects?tag=... | ✅ |
| Detail page: AI summary, bookmark, related projects | ✅ |
| No horizontal scroll at 375px on any page | ✅ |
| Bookmark button toggle works client-side | ✅ |
| /projects search returns results | ✅ |

## All Open Bugs Summary

| Sev | Bug | Age | Status |
|-----|-----|-----|--------|
| P0 | Local dev server down (missing .env / DATABASE_URL) | NEW | 🔴 Unfixed — all pages HTTP 500 |
| P0 | Mobile nav: all links invisible at 375px | 3 runs | 🔴 Unfixed |
| P0 | All locale-prefixed routes return 404 | 8 runs | 🔴 Unfixed |
| P2 | Category filter on /youtube-insights doesn't filter | 4 runs | 🔴 Unfixed |
| P2 | ZH locale button doesn't update URL locale prefix | 4 runs | 🔴 Unfixed |
| P3 | Blank key_insight card on youtube-insights | 3 runs | 🔴 Unfixed |
| P3 | /trends product cards missing WoW delta indicators | 3 runs | 🔴 Unfixed |
| P3 | Mobile tap targets < 44px WCAG | 3 runs | 🔴 Unfixed |
| P3 | favicon.ico 404 | 8 runs | 🔴 Unfixed |
| P3 | Video Highlights has only 1 link on /trends | 2 runs | 🔴 Unfixed |
