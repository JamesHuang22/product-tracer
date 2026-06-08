# Frontend Response — Claude Code (Frontend) → Alex

## Task: Fix YouTube — data shows but not rendering

Done. Root cause was a **YouTube-specific data-shape mismatch** in the frontend
queries, fixed entirely in `apps/web/lib/db.ts`. `pnpm typecheck` passes.

### Root cause

The YouTube collector (`collect-youtube.ts`) writes **one `app.identity_link` per
`(video, repo)` pair** — `external_id = "{videoId}:{owner/repo}"`. So a project
showcased in N videos has **N** `platform='youtube'` identity_link rows. Every other
collector writes ~one link per project, so only YouTube triggered this.

The frontend queries `join app.identity_link` (an inner join) to scope/identify
platform projects. With multiple YouTube links per project, that join **multiplied
rows**, producing:

1. **Detail page** (`getProjectBySlug`): a YouTube project returned N identical
   platform rows → the page rendered N duplicate YouTube cards, all with the same
   `key={snap.platform}` (React duplicate-key warning + broken render).
2. **Home top list** (`getPlatformTop('youtube')`): the same project repeated in the
   top-5, with duplicate `key={p.id}`.
3. **Platform page** (`getPlatformProjects('youtube')`): the same project repeated as
   multiple table rows.

### Fixes (all in `apps/web/lib/db.ts`)

- **`getProjectBySlug`** — platforms query now uses `select distinct on (il.platform) …
  order by il.platform, latest.timestamp desc` → exactly one card per platform (keeps
  the link whose snapshot is newest). Kills the duplicate YouTube cards / duplicate keys.
- **`getPlatformTop`** (all four branches: github / product_hunt / youtube / hacker_news)
  — replaced the row-multiplying `join app.identity_link` with a `where exists (…)`
  semi-join. One row per project. (Also future-proofs HN/PH, where a project can be
  submitted more than once.)
- **`getPlatformProjects`** (platform page table) — same `join` → `where exists (…)`
  semi-join, so each project appears once.

### On the "0 projects tracked" symptom

`getPlatformProjectCount('youtube')` already uses `count(distinct project_id)` and reads
`app.identity_link` directly — that query is correct and unaffected by the join bug. If
the home card still literally shows **0**, that means there are **no `platform='youtube'`
rows in `app.identity_link`** — i.e. the collector didn't persist links, or migration
`0005_youtube_platform.sql` (which adds `'youtube'` to the `identity_link` /
`raw.snapshot` check constraints) hasn't been applied to the live DB. Both are
backend/worker/DB concerns **outside `apps/web/`**, so I did not touch them. Flagging for
the backend agent: confirm 0005 is applied and that `collect-youtube` isn't logging
`store_video_failed` / constraint violations into `raw.collector_error`.

Once YouTube identity_links exist, the home count, the home top-5 list, the
`/platform/youtube` table, and YouTube-only project detail pages will all render
correctly with these fixes (verified by code/data-model tracing; no live DB available in
this environment).

### Navigation (verified)

YouTube-only projects (no `github` in `platforms`) route to `/projects/[slug]` (internal
detail), which now shows a single YouTube card with views/likes and a working
`youtube.com/watch?v=…` link. The home "View all YouTube projects" link points to
`/platform/youtube` (valid route; there is no `/youtube` route and nothing references one).

### Files touched

`apps/web/lib/db.ts` only. `pnpm --filter @product-tracer/web typecheck` passes.
