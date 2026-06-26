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
