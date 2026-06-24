# Bug Reports — 2026-06-24

## Browser Test Run #49 (2026-06-24 23:50 UTC) — Focus: /projects search, sort, category filter, AI summaries, detail pages

### Automated Test — 12/12 passing (Vercel deployment)
- ✅ / → HTTP 200
- ✅ /projects → HTTP 200
- ✅ /trends → HTTP 200
- ✅ /youtube-insights → HTTP 200
- ✅ /bookmarks → HTTP 200
- ✅ Grid layout w/ 100 project links on /projects
- ✅ No server errors in any page body
- ✅ i18n charset check passed

### Product Tour Findings

**/projects (desktop 1280px):**
- ✅ 100 project links rendered in grid
- ✅ Search for "odysseus" → 2 results found correctly
- ✅ 7 interactive buttons/filters present (EN, 中文, Project, Stars, Forks tabs)

**Detail page (/projects/are-you-in-the-weights):**
- ✅ AI Summary section present
- ✅ Bookmark button present
- ❌ **No breadcrumb navigation** — regression from earlier runs where breadcrumb was confirmed present
- ❌ **No Related/Suggested projects section** — Bug 23 persists

**/youtube-insights:**
- ⚠️ **Bug 13 significant improvement**: 20/20 cards now have insight text (was 5/20 blank last run, 20/20 blank originally). All cards display 🔥-prefixed insight text.
- ✅ All 20 cards now render with usable content
- ❌ Category filter still doesn't filter (Bug 14 persisting)
- ❌ Grid/list toggle still identical (Bug 15 persisting)

**Homepage:**
- ❌ **Bug 26 persists**: i18n key "home.section.insights.viewAll" rendered as visible text on homepage (below "Insights" section heading, above insight cards)
- ✅ 3 insight cards all have 🔥-prefixed text with content
- ✅ 3 "Watch on YouTube" links on homepage (one per card — correct)

**/trends:**
- ❌ **Bug 17 persists**: 5/5 top product links garbled ("1INAre You in the Weights?2", "2PHElvin1", etc.)
- ✅ Week selector still functional with 2 weeks

**Locale Routes:**
- ❌ **Bug 6 persists — 9th confirmation**: All 6 locale-prefixed routes (/en/trends, /zh/trends, /en/youtube-insights, /zh/youtube-insights, /en/bookmarks, /zh/bookmarks) return 404

**Mobile (375px viewport):**
- ❌ **Bug 19 persists**: Nav scrollWidth=400px in 375px viewport — EN, 中文, and theme toggle off-screen
- ❌ **290 interactive elements < 44px touch target** (WCAG violation) — worst offender is BODY with `overflow-x:clip` causing 115px horizontal overflow
- ❌ 6 overflow elements detected on /projects at 375px (max 115px)

**Console Errors:**
- ❌ 7 "Failed to load resource: 404" errors across all page loads — likely favicon.ico (Bug 25) persists

### New/Updated This Run

---

## Bug 27 [P3] — Breadcrumb on /projects/[slug] detail page missing (regression)
- **Page**: `/projects/are-you-in-the-weights`
- **Severity**: P3 — Navigation convenience
- **Observed**: Breadcrumb `<nav aria-label="Breadcrumb">` was confirmed present in Run #45 (odysseus detail page). Now in Run #49, breadcrumb is absent on are-you-in-the-weights detail page. May be project-specific or template regression.
- **Reproduction**: Visit `/projects/are-you-in-the-weights` → inspect for `<nav aria-label="Breadcrumb">` or breadcrumb text → not found.
- **Expected**: Breadcrumb navigation should appear consistently on all project detail pages.

---

## Bug 13 status update: ✅ NOW FULLY RESOLVED (20/20 cards with text)
- Run #41: 20/20 blank
- Run #45: 5/20 blank (partial fix)
- Run #47: 5/20 blank
- **Run #49: 0/20 blank** — all 20 cards have 🔥-prefixed insight text
- **Suggested status change**: ✅ FIXED (close Bug 13)

### Re-confirmed Status (cumulative)

| Bug | Severity | Status | Notes |
| --- | --- | --- | --- |
| Bug 10 (DB crash local) | P0 | Unchanged | Local env only; Vercel works |
| Bug 11 (domain hijack) | P0 | Unchanged | producttracer.com → muqid.com |
| Bug 6 (locale 404) | P1 | ×9 confirmation | All 6 locale routes still 404 |
| Bug 13 (blank cards) | P2 | ✅ **FIXED** | 0/20 blank now (was 20/20) |
| Bug 19 (nav overflow) | P2 | Persists | 400px nav in 375px viewport |
| Bug 12 (touch targets <44px) | P2 | Unchanged | 290 elements <44px on /projects |
| Bug 23 (empty related section) | P2 | Unchanged | "You might also like" heading, 0 links |
| Bug 26 (i18n key leak) | P2 | Persists | "home.section.insights.viewAll" visible |
| Bug 14 (filter chips broken) | P3 | Unchanged | Category chips don't filter |
| Bug 15 (grid/list toggle) | P3 | Unchanged | Grid/list produce identical layout |
| Bug 17 (garbled link text) | P3 | Persists | 5/5 /trends links garbled |
| Bug 18 (no WoW delta) | P3 | Unchanged | Individual product cards lack WoW |
| Bug 20 (plain themes) | P3 | Unchanged | EMERGING THEMES plain text |
| Bug 21 (video highlights) | P3 | Unchanged | Plain prose, no clickable links |
| Bug 24 (Bookmark <44px) | P3 | Unchanged | 38px tall button |
| Bug 25 (favicon 404) | P3 | Persists | Every page load |
| Bug 27 (breadcrumb regression) | P3 | NEW | Missing on detail page |

### Quick Stats
- **12/12 automated tests passed** ✅
- **1 new bug found** (Bug 27 — breadcrumb regression, P3)
- **1 bug fixed** (Bug 13 — 0 blank insight cards on /youtube-insights, P2→✅)
- **9+ confirmation of locale 404 bug** (Bug 6)
- **0 critical issues** — all Vercel pages serving correctly
