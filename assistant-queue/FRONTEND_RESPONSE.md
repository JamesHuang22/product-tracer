# Frontend Response — Claude Code (Frontend) → Alex

## Task: Redesign home page — stats bar + Latest Activity feed

Done. Added an overview stats bar and a "Latest Activity" feed above the platform
sections. `pnpm typecheck` passes. Only `apps/web/` files touched.

### DB queries (`apps/web/lib/db.ts`)

- `getTotalProjectCount()` — `count(*)` of `app.project`.
- `getNewThisWeek()` — projects with `created_at > now() - interval '7 days'`.
- `getActiveSignalCount()` — `count(*)` of `app.signal` (returns 0 when empty → "Hot
  signals" shows 0 with no data, as specified).
- `getLatestProjects(limit)` — recent projects ordered by `created_at desc`, returned in
  the existing `ProjectListItem` shape (platforms array + latest GitHub stars/forks), so
  it reuses the same badge/format helpers.

### Home page wiring (`apps/web/app/page.tsx`)

Added the four new fetches to the existing `Promise.all` (still one parallel round-trip)
and passed `totalProjects`, `newThisWeek`, `hotSignals`, `latest` into `HomeContent`.

### UI (`apps/web/components/home-content.tsx`)

- **Stats bar** (below hero): 4 cards — Total projects, Active platforms (4), New this
  week, Hot signals — each with a lucide icon + number + label, in the existing card
  design language (neutral bg, subtle border, rounded). Responsive: 2 cols on mobile,
  4 on `sm+`.
- **Latest Activity** (between stats and platform sections): horizontal-scroll row of the
  last 10 projects. Each card shows name, platform badges, truncated one-liner
  (`cleanOneLiner`), and a relative "Nd/Nh/Nm ago" timestamp; links to the project detail
  page. Empty-state fallback when there are no projects.
- Numbers run through `fmtCount`; relative time is computed at day granularity so it's
  stable across the SSR→hydration boundary (no mismatch).

### i18n (`apps/web/lib/i18n.ts`)

Added en+zh keys for the new chrome: `home.stats.*` (4), `home.latest.title` /
`.subtitle` / `.empty`, and `time.justNow` / `.minutesAgo` / `.hoursAgo` / `.daysAgo`
(relative-time labels are localised like the rest of the UI).

### Verification

- Stats bar shows real counts; Latest Activity shows up to 10 newest projects. ✓
- Responsive (2→4 col stats; horizontal-scroll feed on mobile). ✓
- `pnpm --filter @product-tracer/web typecheck` passes. ✓
  (No ESLint config is set up in the repo — `next lint` only offers interactive setup —
  so lint was not run; typecheck is clean.)

### Files touched

`apps/web/app/page.tsx`, `apps/web/components/home-content.tsx`, `apps/web/lib/db.ts`,
`apps/web/lib/i18n.ts`.
