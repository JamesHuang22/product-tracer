# Bug Reports — 2026-06-25 | Tour #69

## Focus: Mobile (375×812) + Detail Page QA

**Environment**: Vercel (product-tracer.vercel.app) | Local dev server up (port 3000)
**Date**: 2026-06-25T05:00 UTC

### Automated Test
- 12/12 tests ✅ (5 pages HTTP 200, grid layout, ZH locale baseline)

---

## [P0] Mobile nav collapse: ALL nav links invisible at 375px viewport (previously unreported)

**Severity**: P0 — site unusable on mobile (iPhone SE/12/13/14)

**Detail**: At 375×812 viewport, zero nav links are visible. The hamburger menu icon (SVG) exists but is small (28×28px). All 7 nav links (Projects, Insights, Trends, Bookmarks, EN, 中文, hamburger SVG button) have `width: 0` / `height: 0` or are invisible. The navbar renders at ~490px width despite 375px viewport.

**Reproduction**:
1. Open DevTools, set viewport to 375×812 (iPhone)
2. Navigate to any page (/, /projects, /youtube-insights, /trends, /bookmarks)
3. Observe: Projects, Insights, Trends, Bookmarks — all invisible
4. Hamburger SVG icon IS present but only 28×28px — hard to tap
5. Tapping hamburger — no visible menu opens (content doesn't change)

**Evidence (this run)**:
- `/`: 0/7 nav links visible, nav is 0×0px bounding box
- `/youtube-insights`: nav collapsed, hamburger 28×28px
- `/trends`: only 5/16 interactive elements meet 44px threshold

**Expected**: Mobile nav fully functional at 375px. Hamburger toggles a slide-out menu with all nav items. OR nav items collapse into a properly-sized hamburger.

---

## [P3] All 35 mobile tap targets on /youtube-insights below 44px WCAG threshold

**Severity**: P3 — accessibility violation at 375px viewport

**Detail**: Confirmed this run: 35/35 visible interactive elements have tap targets below 44×44px. Even the hamburger menu (28×28px) and filter pills (87×26px, 132×26px) fall short.

**Reproduction**:
1. DevTools → 375×812 viewport
2. `/youtube-insights`
3. `document.querySelectorAll('a, button').forEach(el => { if(el.offsetParent !== null) { const r=el.getBoundingClientRect(); if(r.w<44||r.h<44) console.log(el.tagName, el.textContent.trim().slice(0,20), r.w, r.h); } })`
4. All elements reported sub-44px

**Sample (this run)**:
- Brand "Product Tracer": 112×20px
- Hamburger: 28×28px
- Grid/List toggle: 32×32px
- "All categories (93)": 132×26px
- "AI/ML (25)": 87×26px

**Expected**: All interactive elements ≥ 44×44px.

---

## [P3] Key insight card tap targets on homepage also below 44px on mobile

**Detail**: On homepage at 375px, 31/48 interactive elements are below 44px threshold. This affects nav, insight cards, project cards — essentially the entire page.

---

## [P3] /trends product cards missing WoW delta indicators (confirmed this run)

**Detail**: Top 5 product list shows rank + platform + title but NO WoW position change indicator (e.g., "↑2", "↓1", "NEW"'). Products: Are You in the Weights?, Elvin, Dropmatico, Kimi K2.7 Code, Cloudback for Linear.

**Reproduction**:
1. Go to /trends
2. Look at "Top Products" section
3. Each card shows "#1 — IN Are You in the Weights?" with no arrow/delta

**Expected**: Each product card shows WoW delta (↑2, ↓1, —, NEW).

---

## [P3] Emerging Themes link to filtered projects — CONFIRMED WORKING ✅

The 8 emerging themes (Recursive Self-Improvement, AI Agent Workflows, etc.) now link to `/projects?tag=...` with proper URLs. ✅

---

## [P3] Trends week selector EXISTS and works ✅

A `<select>` dropdown with 2 weeks available:
- "2026-06-22 – 2026-06-28"
- "2026-06-15 – 2026-06-21"

Switching weeks changes the data visually. ✅

---

## [P3] Detail page end-to-end verification — PASSING ✅

| Feature | Status |
|---------|--------|
| AI Summary section | ✅ Present and renders full text |
| Bookmark button (client-side toggle) | ✅ "Bookmark" ↔ "Bookmarked" works |
| "You might also like" — 4 project links | ✅ Present with clickable links |
| "Projects" back link | ✅ Present |
| Tag links (#ai-agent, #llm, etc.) | ✅ Clickable, link to filtered /projects |
| Visit site link | ✅ Present |
| Tracked since date | ✅ Present |

---

## [P0] key_insight "leak" — RE-ASSESSED: FALSE ALARM ✅

**Previous reports**: 6 instances of `key_insight` in visible body text.

**This run investigation**: All 6 instances are in Next.js RSC payload `<script>` tags (`self.__next_f.push(...)`). **Zero instances** appear in non-script rendered text or visible UI elements. The field names `key_insight`, `sentiment`, `relevance_score` are in server serialization data only — they are NOT visible to users.

**Recommendation**: Downgrade this from P0 bug report. This is standard Next.js behavior. Consider removing from bug tracking.

---

## [P0] Locale-prefixed routes return 404 — CONFIRMED STILL BROKEN

**This run**: Re-checked `/zh/youtube-insights` → "This page could not be found."

**Recommendation**: This is the highest-priority actionable bug (6 runs unfixed).

---

## All Open Bugs Summary (this update)

| Sev | Bug | Age | Status |
|-----|-----|-----|--------|
| P0 | Mobile nav: all links invisible at 375px | NEW | 🔴 Unfixed |
| P0 | All locale-prefixed routes return 404 | 6 runs | 🔴 Unfixed |
| P2 | Category filter on /youtube-insights doesn't filter | 2 runs | 🔴 Unfixed |
| P2 | ZH locale button doesn't update URL locale prefix | 2 runs | 🔴 Unfixed |
| P3 | Mobile tap targets < 44px WCAG (35/35 on /youtube-insights) | 2 runs | 🔴 Unfixed |
| P3 | /trends product cards missing WoW delta | NEW | 🔴 Unfixed |
| ~~P0~~ | ~~key_insight leak~~ reassessed — RSC script only | — | ⛔ FALSE ALARM |
| — | — | — | — |

## What was OK this run
- All 5 pages HTTP 200 ✅
- Detail page: AI summary, bookmark, related projects, tags all work ✅
- Trends week selector exists and works ✅
- Emerging themes are clickable links (fixed since last report) ✅
- Bookmark button toggles "Bookmark" ↔ "Bookmarked" client-side ✅
- /projects search (`?q=ai`) returns 100 results ✅
- ZH locale toggle on /youtube-insights works (content + categories translate) ✅
- No horizontal scroll on any page at 375px ✅
- Detail page /projects/elvin renders correctly ✅
