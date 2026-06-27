# Bug Reports

> Automated browser test + human-like product tour — 2026-06-25 06:05 UTC
> Tester: JBK (Product Manager + QA Lead)

---

## P0 — Database connection missing: all DB-dependent pages return 500

**Severity**: P0 (site down)  
**First seen**: 2026-06-25 06:05 UTC  
**Environment**: localhost:3000 (next dev --turbopack)

### Impact
4 out of 5 critical pages are completely broken:

| Page         | Status | Error                                                   |
|-------------|--------|---------------------------------------------------------|
| `/`         | 500    | `Missing DATABASE_URL`                                  |
| `/projects` | 500    | `Missing DATABASE_URL`                                  |
| `/trends`   | 500    | `Missing DATABASE_URL`                                  |
| `/youtube-insights` | 500 | `Missing DATABASE_URL`                                  |
| `/bookmarks` | 200   | ✅ Works (purely client-side, no DB calls)              |

### Root cause
No `.env` or `.env.local` file exists in `apps/web/`. The `DATABASE_URL` environment variable is not set. The app needs a Supabase session pooler URI (specified in `.env.example`).

```bash
# Expected env (from .env.example)
DATABASE_URL=postgresql://...
```

The `.env.example` file exists at the repo root but all values are blank. The actual `.env` (which is gitignored) is missing entirely.

### Reproduction
1. Ensure no `.env` exists in `apps/web/` or repo root
2. Run `pnpm dev` (which launches `next dev --turbopack` on port 3000)
3. Visit `http://localhost:3000/projects` (or `/`, `/trends`, `/youtube-insights`)
4. Observe: blank page → "Application error: a server-side exception" → browser console shows `Missing DATABASE_URL. Check .env`

### Resolution needed
1. Create `apps/web/.env.local` (or `.env` at workspace root) with a valid `DATABASE_URL` from Supabase
2. Or set `DATABASE_URL` in the shell environment (e.g., `export DATABASE_URL=...` before `pnpm dev`)
3. Verify all pages return HTTP 200 after fix

---

## P1 — Missing search/filter UI on /projects

**Severity**: P1  
**Status**: Not directly testable due to P0 (DB down), but inferred from component scan

### Observation
When the DB is fixed, verify:
- Search input is present
- Sort/filter `<select>` elements exist
- Project cards render with images, descriptions, and links

### Reproduction (blocked by P0)
1. Fix database connection
2. Visit `/projects`
3. Confirm search bar, sort controls, and project grid render correctly

---

> Weekly product tour — 2026-06-26 16:30 UTC (Focus: 0 — Homepage)
> JBK (Product Manager + QA Lead)

### Result: No new bugs

All critical pages return HTTP 200 on Vercel:
- ✅ `/` — Hero stats render (4.9k projects, 4 platforms, 1k new, 108 signals), cards present, latest activity populated
- ✅ `/projects` — Project cards render with descriptions, tags, stars/forks. Search/filter UI present. 4,624 projects browsable.
- ✅ `/trends` — Summary, WoW comparison, This week's mix (bar chart), Top Products (5 items with rank + platform badge + signal count), Emerging Themes (7 clickable tags), Video Highlights section present. Week selector works.
- ✅ `/youtube-insights` — Video cards render with sentiment labels (Negative/Positive/Neutral/Neutral), descriptions, Watch on YouTube links.
- ✅ `/[slug]` — Detail pages show breadcrumb, AI summary, cross-platform signal cards (GH stars/forks, YT views/likes), related links.

**No regressions detected from previous run. Focus (0: Homepage) fully functional.**

Known deferred items (no re-report):
- `/en/* /zh/*` 404 — intentional by design (cookie-based i18n)
- Video Highlights clickable links on /trends — already tracked in FRONTEND_REQUEST P3 (deferred, needs trend generator change)
- WoW delta on top product cards — tracked in FRONTEND_REQUEST P3
- Mobile nav collapse at 375px — tracked in FRONTEND_REQUEST P2

---

> Weekly product tour — 2026-06-26 17:30 UTC (Focus: 1 — /projects)
> JBK (Product Manager + QA Lead)

### P3 — Missing favicon.ico (404)

**Severity**: P3 (minor — cosmetic)
**First seen**: 2026-06-26 17:30 UTC
**Environment**: Vercel production

### Impact
`https://product-tracer.vercel.app/favicon.ico` returns HTTP 404. Browser tabs and bookmark icons show a generic document icon instead of the Product Tracer brand mark.

### Reproduction
1. Visit `https://product-tracer.vercel.app/favicon.ico`
2. Observe: HTTP 404 response

### Expected
`favicon.ico` should exist (or a `<link>` to a PNG/SVG favicon should be set in the layout).

### Resolution needed
Add a favicon file (`.ico`, `.png`, or `.svg`) to the `public/` directory and reference it in the root layout metadata.

---

### Result for this week
- ✅ `https://product-tracer.vercel.app/` — 200, hero stats, cards, latest activity
- ✅ `/projects` — 200, search/filter/sort works, cards with tags, categories, stars
- ✅ `/trends` — 200, week selector, WoW comparison, mix chart, top 5 products, clickable emerging theme tags
- ✅ `/youtube-insights` — 200, video cards with sentiment labels
- ✅ `/[slug]` — 200, breadcrumb, AI summary, platform signals
- ❌ `/favicon.ico` — 404 (new, tracked above)

**No regressions on existing pages. /projects search, filter, sort, and tag rendering all functional.**

Known deferred (no re-report):
- `/en/* /zh/*` 404 — intentional (cookie-based i18n)
- Video Highlights clickable links — tracked in FRONTEND_REQUEST P3 (needs trend generator changes)
- WoW delta on top product cards — tracked in FRONTEND_REQUEST P3
- Mobile nav collapse at 375px — tracked in FRONTEND_REQUEST P2

---

> Weekly product tour — 2026-06-26 21:05 UTC (Focus: 2 — /[slug] detail page)
> JBK (Product Manager + QA Lead)

### Result: No new bugs

All critical pages return HTTP 200 on Vercel:
- ✅ `/` — 200, hero stats, cards, latest activity
- ✅ `/projects` — 200, search/filter/sort, project cards with tags/categories/stars
- ✅ `/projects/:slug` — 200, breadcrumb, AI summary, cross-platform signals (GH stars/forks, YT views/likes), sparkline charts, tag chips, related projects in "You might also like" with star counts
- ✅ `/trends` — 200, week selector, WoW comparison, mix chart, top products, emerging themes
- ✅ `/youtube-insights` — 200, video cards with sentiment labels

**Detail page deep-dive**:
- Breadcrumb → Projects / open-design — renders correctly
- AI Summary sparkles icon + description — renders well
- Cross-platform signals render as cards with GH (star count + fork count) and YT (view count + like count)
- GitHub sparkline chart renders correctly
- "You might also like" shows 4 related project cards with names, descriptions, star counts
- Tag chips render as clickable filter links (e.g., `/projects?tag=local-first`)
- Bookmark button present, "Visit site" link present, "Tracked since" date shows
- Pages with no YouTube data gracefully show "Not enough history yet" instead of breaking

**No regressions detected. /[slug] detail pages render fully with all expected features.**

Known deferred (no re-report):
- `/en/* /zh/*` 404 — intentional (cookie-based i18n)
- Video Highlights clickable links — tracked in FRONTEND_REQUEST P3 (needs trend generator changes)
- WoW delta on top product cards — tracked in FRONTEND_REQUEST P3
- Mobile nav collapse at 375px — tracked in FRONTEND_REQUEST P2

---

> Weekly product tour — 2026-06-26 22:30 UTC (Focus: 4 — /trends)
> JBK (Product Manager + QA Lead)

### Result: No new bugs

All critical pages return HTTP 200 on Vercel:
- ✅ `/` — 200, hero stats, 4.9k projects, activity feed
- ✅ `/projects` — 200, search/filter/sort, cards with tags/stars
- ✅ `/[slug]` — 200, breadcrumb, AI summary, platform signals, related projects
- ✅ `/trends` — 200, week selector (2 weeks), WoW comparison cards, category mix chart, top 5 products (all clickable with platform badges and signal counts), emerging themes (7 clickable tags linking to `/projects?tag=...`), video highlights summary, footer stats (919 projects · 170 signals · 83 insights)
- ✅ `/youtube-insights` — 200

**Trends deep-dive**:
- Week selector renders two options (current + previous week)
- WoW comparison shows top source (PH) and top product for both this/last week
- Category mix bar chart shows AI/ML (40%), Other (30%), design/devtool/saas (10% each)
- Top 5 products: rank #, WoW change indicator (all show "—" = unchanged), platform badge, product name link, signal count badge
- Emerging themes: 7 tags as clickable `<a>` links — Recursive Self-Improvement, AI Agent Workflows, Open-Source LLMs, Edge AI, AI Video Generation, Developer Tools, Memory Systems for AI
- Video Highlights: prose summary (no clickable links — deferred)
- No regressions, no 500s, no console errors detectible from HTTP fetch

Known deferred (no re-report):
- Video Highlights clickable links — tracked in FRONTEND_REQUEST P3
- WoW rank change arrows (all show "—" this week but feature not implemented) — tracked in FRONTEND_REQUEST P3
- `/en/* /zh/*` 404 — intentional (cookie-based i18n)

---

> Weekly product tour — 2026-06-27 00:30 UTC (Focus: 5 — Mobile 375px)
> JBK (Product Manager + QA Lead)

### Bugs Found

**B1 — Untranslated i18n key on homepage Insights section**
- **Where**: Homepage → Insights section → "View all" link text
- **What**: Renders `home.section.insights.viewAll` as raw text instead of "View all" or translated equivalent
- **Severity**: P3 (visual, visible to all users on desktop & mobile)
- **Expected**: Should resolve the i18n key to a human-readable label
- **Root cause**: Missing i18n translation for key `home.section.insights.viewAll`
- **Status**: New

**B2 — Mobile tap targets below 44px touch minimum (375px viewport)**
- **Where**: Header at 375px viewport
- **What**: Dark mode toggle `h-7 w-7` (28px), hamburger menu `h-8 w-8` (32px) — both under 44px iOS/Android minimum
- **Severity**: P4 (usability, intermittently hard to tap)
- **Expected**: Buttons padded or sized to ≥44×44px on touch devices
- **Root cause**: Tailwind h-7/h-8 classes with no touch-responsive sizing
- **Status**: New

---

> Weekly product tour — 2026-06-27 02:30 UTC (Focus: 2 — /[slug] detail page)
> JBK (Product Manager + QA Lead)

### Result: No new bugs

All critical pages return HTTP 200 on Vercel:
- ✅ `/` — 200
- ✅ `/projects` — 200
- ✅ `/[slug]` — 200
- ✅ `/trends` — 200
- ✅ `/youtube-insights` — 200

**Detail page deep-dive**:
- Breadcrumb: Projects → slug name — renders correctly with chevron separator
- Title + category badge ("other") — renders
- Visit site link → correct GitHub URL with external icon
- Bookmark button → present with BookmarkButton component (bookmark/filled states)
- Tracked since date: 2026-05-24 — renders
- AI Summary section: sparkles icon + description paragraph — renders well, concise prose
- Cross-platform signals: GitHub card with 49k stars / 4.2k forks, sparkline SVG chart, "Updated 2026-06-27" — all render correctly
- "You might also like": 4 related project cards (clawhub, feishin, ag-kit, book) in 4-column grid, each with name, description, star count — all clickable links
- `ag-kit` card has no description (null), renders without breaking — graceful handling

**No regressions detected. All expected sections render correctly.**

Known deferred (no re-report):
- `/en/* /zh/*` 404 — intentional (cookie-based i18n)
- Untranslated i18n key on homepage — tracked in bug reports (B1)
- Mobile tap targets below 44px — tracked in bug reports (B2)
- WoW rank change indicators + clickable links in trends — tracked in FRONTEND_REQUEST.md

---

> Weekly product tour — 2026-06-27 03:30 UTC (Focus: 4 — /trends)
> JBK (Product Manager + QA Lead)

### Result: No new bugs

All critical pages return HTTP 200 on Vercel:
- ✅ `/` — 200, hero stats, latest activity, platform sections
- ✅ `/projects` — 200, search/filter/sort, cards
- ✅ `/[slug]` — 200, breadcrumb, AI summary, platform signals
- ✅ `/trends` — 200 (full page SSR rendered correctly)
- ✅ `/youtube-insights` — 200

**/trends deep-dive (Focus: 4):**
- Week selector renders 2 options (current + previous), switching works
- WoW comparison cards render both weeks with top source (PH) and top product
- Category mix bar chart: AI/ML 40%, Other 30%, design/devtool/saas 10% each — bars sized proportionally
- Top 5 products: rank #, platform badge, product name (clickable link to /projects/slug), signal count badge, all show "—" for WoW rank change (tracked in FRONTEND_REQUEST P3)
- Emerging themes: 7 clickable tags linking to `/projects?tag=...`
- Video Highlights: prose summary paragraph (no clickable links — deferred)
- Footer stats: 919 projects · 170 signals · 83 insights

**Detection quality note**: The same product "Are You in the Weights?" uses inconsistent casing in the WoW comparison section between weeks — displays as "Are You in the Weights?" (title case) for this week vs "Are you in the Weights?" (sentence case "you") for last week. The slug is consistently lowercase. This is a data-source normalization issue in the trend generator, not a frontend bug — no ticket filed.

**Open bugs still present (no regression):**
- B1: `home.section.insights.viewAll` key still rendering raw text on homepage
- B2: Mobile tap targets (dark mode 28px, hamburger 32px) below 44px minimum
- `favicon.ico` still returns 404

Known deferred (no re-report):
- `/en/* /zh/*` 404 — intentional (cookie-based i18n)
- WoW change arrows — tracked in FRONTEND_REQUEST P3

---

## JBK Review — 2026-06-27 06:05 UTC (Mobile 375px)

**Focus:** Mobile 375px — scroll, nav, tap targets

### Result: No new bugs

All pages render and scroll correctly at 375px:
- ✅ **Homepage**: `grid-cols-2` stat cards fit well. Horizontal scroll card strips (`overflow-x-auto`) work. Hero section, platform badges, project cards all render. Body uses `overflow-x-clip` to prevent horizontal bleed.
- ✅ **Header/Nav**: Desktop nav is `hidden sm:flex` (hidden < 640px). Mobile shows hamburger menu (`h-8 w-8` = 32px) and dark mode toggle (`h-7 w-7` = 28px). Both already tracked as B2.
- ✅ **/projects**: Search bar, category filter, sort dropdown all visible. Cards render in single-column layout.
- ✅ **Detail page**: Breadcrumb, AI summary, signal sections all render.
- ✅ **/trends**: Week selector, WoW comparison cards, stat grid, top products, themes, video highlights all render.
- ✅ **Bookmarks**: Empty state renders (no bookmarks).
- ✅ **/youtube-insights**: Content renders (verified title).

### Still present (no regression):
- B1: `home.section.insights.viewAll` raw i18n key on homepage insights section
- B2: Mobile tap targets below 44px AAPL guideline (28px dark mode toggle, 32px hamburger)
- `favicon.ico` 404
- `home.section.insights.viewAll` link also uses raw key in the Insights section heading

### Notes:
- The mobile horizontal scroll card strips use `-mx-6` negative margins to break out of the `px-6` container — creates edge-to-edge scroll effect. Works as designed.

---

> Weekly product tour — 2026-06-27 06:30 UTC (Focus: 0 — Homepage)
> JBK (Product Manager + QA Lead)

### Result: No new bugs

All critical pages return HTTP 200 on Vercel:
- ✅ `/` — 200, hero stats (5k projects, 4 platforms, 1.1k new, 108 signals), latest activity (10 cards with descriptions + platform badges), platform sections (GH, HN, PH, YT with top 5 each), insights card strip, trends summary
- ✅ `/projects` — 200
- ✅ `/[slug]` — 200
- ✅ `/trends` — 200
- ✅ `/youtube-insights` — 200

**Homepage deep-dive (Focus: 0):**
- Hero renders correctly with 4,698 projects count, tagline, CTA buttons
- Stats grid: 4 cards (Total projects 5k, Active platforms 4, New this week 1.1k, Hot signals 108)
- Latest activity: horizontal scroll strip of 10 project cards from HN and GH, each with truncated description, platform badge, relative time
- By platform grid: 4×2 col layout at desktop (2×2 at mobile), each with platform badge, project count, top 5 ranked list with star/upvote/view counts, external link hover effects
- Insights section: card strip with descriptions + YouTube links (B1 still present: `home.section.insights.viewAll` raw key)
- Trends section: summary paragraph, 4 top product cards, 7 clickable theme tags
- Footer: RSS feed links present

**Still present (no regression from prior round):**
- B1: `home.section.insights.viewAll` raw i18n key — P3, reported 2026-06-27 00:30 UTC
- B2: Mobile tap targets (28px dark mode toggle, 32px hamburger) below 44px guideline — P4
- `favicon.ico` returns 404 — P3

Known deferred (no re-report):
- `/en/* /zh/*` 404 — intentional (cookie-based i18n)
- WoW change arrows — tracked in FRONTEND_REQUEST P3
- Video Highlights clickable links — tracked in FRONTEND_REQUEST P3
