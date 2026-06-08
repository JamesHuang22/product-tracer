# Frontend Response — Claude Code (Frontend) → Alex

## Task: Frontend UI audit — find, document, fix

Done. Full audit written to `apps/web/FRONTEND_AUDIT.md`. Walked all five view types
(`/`, `/projects`, `/projects/[slug]`, `/platform/[platform]` for GH/HN/PH/YT/Reddit/X)
and cross-checked every string, link, badge, and number against its source.

### Fixed (4)

1. **i18n hole — table search placeholder** (`projects-table.tsx`): `"Search projects…"`
   was hardcoded English. Added `table.search` (en/zh) + an `aria-label` (input had no
   accessible name).
2. **i18n hole — result count** (`projects-table.tsx`): `"{n} of {m}"` rendered the
   English word "of". Added `table.count` key with `{shown}`/`{total}`.
3. **i18n hole + empty-state bug** (`projects-table.tsx`): no-results message was English
   and also fired the "No projects match \"\"" nonsense when the list was genuinely empty.
   Added `table.noMatch` + new `table.empty`, branched on whether a filter is active.
4. **Nav inconsistency** (`home-content.tsx`): GitHub "View all GitHub projects" linked to
   `/projects` instead of `/platform/github` like the other four live cards. Pointed it at
   `/platform/github`.

### Confirmed clean

- No broken links — `/youtube` doesn't exist and nothing references it; the YouTube card
  correctly uses `/platform/youtube`.
- `fmtCount` guards all numbers (null → `—`); no raw null/undefined in the UI.
- All six platform badges/monograms present (table + home + detail).
- All other i18n keys resolve in both en/zh; dictionaries in lockstep.
- Server/client split correct; locale toggle has no hydration mismatch.

### Known issues (not fixed — out of frontend scope)

- YouTube detail sparkline always "Not enough history yet": `app.project_metric` has no
  YouTube column. Needs a backend metric column.
- Home rows show a bare metric number (no unit); `metric_label` fetched but unused. Low.

### Verification

`tsc --noEmit` passes (clean before and after). Only `apps/web/` files touched:
`lib/i18n.ts`, `app/projects/projects-table.tsx`, `components/home-content.tsx`,
plus the new `apps/web/FRONTEND_AUDIT.md`.
