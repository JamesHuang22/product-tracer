# Frontend Audit — product-tracer/apps/web

Date: 2026-06-07
Auditor: Frontend agent (Claude Code)
Scope: every `.tsx` / `.ts` / `.css` file under `apps/web/`. No backend, worker, or package files touched.

## Method

Walked every view as a user would, cross-referencing each rendered string against
the i18n dictionary (`lib/i18n.ts`), each route link against the actual route tree,
and each data field against its `fmtCount` / `cleanOneLiner` formatter:

- `/` — `app/page.tsx` → `components/home-content.tsx` + `platform-section.tsx`
- `/projects` — `app/projects/page.tsx` → `projects-table.tsx`
- `/projects/[slug]` — `app/projects/[slug]/page.tsx`
- `/platform/[platform]` — `app/platform/[platform]/page.tsx` (GH, HN, PH, YT, Reddit, X)
- `/youtube` — confirmed it does **not** exist; the home YouTube card and badges
  already point at `/platform/youtube`, which is the correct live route. No broken
  link, nothing to add.

Baseline `tsc --noEmit` passed before and after all changes.

---

## Findings & resolutions

### 1. i18n hole — table search placeholder (severity: med) — FIXED
- **File:** `app/projects/projects-table.tsx`
- **Issue:** `placeholder="Search projects…"` was hardcoded English. It stayed English
  after toggling to 中文 — a visible i18n leak on the two most-used list views
  (`/projects` and every `/platform/*` page, which share this component).
- **Fix:** Added `table.search` key (en/zh) and wired `placeholder={t('table.search')}`.
  Also added a matching `aria-label` (the input previously had no accessible name).

### 2. i18n hole — result count "{n} of {m}" (severity: med) — FIXED
- **File:** `app/projects/projects-table.tsx`
- **Issue:** The count chip rendered the literal English word `of` (`{rows.length} of {projects.length}`).
- **Fix:** Added `table.count` key with `{shown}`/`{total}` placeholders
  (`'{shown} of {total}'` / `'{total} 个中显示 {shown} 个'`) and rendered via `t()`.

### 3. i18n hole + empty-state bug — "No projects match …" (severity: med) — FIXED
- **File:** `app/projects/projects-table.tsx`
- **Issue (two-part):**
  1. The no-results message was hardcoded English.
  2. The same message was shown even when the list is genuinely empty (no DB rows,
     empty filter) — producing the nonsensical `No projects match ""`.
- **Fix:** Added `table.noMatch` (with `{query}`) and a new `table.empty` key, and
  branched on whether a filter is active:
  `{filter ? t('table.noMatch', { query: filter }) : t('table.empty')}`.

### 4. Navigation inconsistency — GitHub "View all" link (severity: low) — FIXED
- **File:** `components/home-content.tsx`
- **Issue:** Every live platform card links its footer to `/platform/<platform>`, but
  the GitHub card omitted `viewAllHref`, so it fell back to the default `/projects`.
  Its label still read "View all GitHub projects", so the link under-delivered
  (took users to the combined list, not the GitHub-scoped page that exists at
  `/platform/github`).
- **Fix:** Added `viewAllHref="/platform/github"` to match the other four cards.

---

## Verified OK (no change needed)

- **Number formatting:** `fmtCount` returns `—` for null/undefined and `k`-compacts
  ≥1000 — no raw `null`/`undefined` reaches the UI. Stat cards, table cells, home
  rows all route through it.
- **Platform badges:** `PLATFORM_BADGE` (table) and `PLATFORM_VISUALS` / `PLATFORM_META`
  (home + detail) cover all six platforms; unknown platforms degrade gracefully to a
  2-char monogram. No missing badges.
- **i18n coverage:** every other `t()` / `translate()` key used in the app resolves in
  both `en` and `zh`; the two dictionaries are in lockstep. `translate()` falls back to
  English then to the raw key, so no key ever renders bare.
- **Routes / links:** all internal `Link`s resolve to real routes; external links carry
  `target="_blank" rel="noreferrer"`. YouTube detail link correctly recovers the video
  id from the `videoId:owner/repo` composite `external_id`.
- **Server/client split:** data fetching stays in Server Components; only the localizable
  chrome and the interactive table are `'use client'`. Locale persists via cookie +
  `router.refresh()`, so server-rendered strings update on toggle with no hydration
  mismatch.
- **Responsive:** `/projects` swaps a desktop `<table>` for mobile cards at `md`; count
  chip given `shrink-0` so it can't be squeezed on narrow widths.

## Known issues (left as-is — out of frontend scope or by design)

- **YouTube detail sparkline always shows "Not enough history yet".** `app.project_metric`
  has no YouTube column, so `PLATFORM_META.youtube.metricKey` is `null` by necessity.
  Surfacing a YouTube trendline needs a backend metric column — out of `apps/web` scope.
- **Home platform rows show a bare metric number with no unit.** `metric_label`
  (stars/score/upvotes/views) is fetched in `lib/db.ts` but not rendered; the card header
  identifies the platform, so it's unambiguous in context. Low value, left unchanged.
- **No manual dark-mode toggle.** Dark mode follows `prefers-color-scheme` only. By design.
