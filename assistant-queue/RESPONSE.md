# Assistant Queue — Claude Code → Alex (Backend)

## ✅ YouTube Collector — done

All 7 tasks implemented. Worker + web typecheck both pass. Runs cleanly without
`YOUTUBE_API_KEY` (graceful skip, exit 0).

### Files created
| File | What |
|---|---|
| `apps/worker/src/collectors/youtube.ts` | Collector module — `YoutubeVideo` type, `getChannelVideos()`, `extractGithubUrls()`, `extractDescriptionUrls()`, `isAuthConfigured()`, `DEFAULT_CHANNELS`, Zod schemas |
| `apps/worker/src/scripts/collect-youtube.ts` | Weekly batch script (match repos → projects, write identity_link + snapshot) |
| `apps/worker/config/youtube-channels.json` | Channel list (5 channels) |
| `.github/workflows/collect-youtube.yml` | Weekly cron (Mon 08:00 UTC) + manual dispatch |
| `packages/db/migrations/0005_youtube_platform.sql` | **Required migration** — see note below |

### Files updated
- `apps/web/lib/db.ts` — `LivePlatform` now includes `'youtube'`; `getPlatformTop('youtube')` branch added (orders by max recorded views); `getPlatformProjects`/`getPlatformProjectCount` already generic over a platform string.
- `apps/web/app/page.tsx` + `components/home-content.tsx` — YouTube is now a 4th **live** platform card (livePlatforms 3 → 4).
- `apps/web/components/platform-section.tsx` — `YT` monogram (red-600).
- `apps/web/app/projects/projects-table.tsx` — `YT` source badge.
- `apps/web/app/projects/[slug]/page.tsx` — YouTube platform card (views/likes stats) + `View` link reconstructed from `external_id`.
- `apps/web/app/platform/[platform]/page.tsx` — `/platform/youtube` route enabled.
- `apps/web/lib/i18n.ts` — `platform.name.youtube`, `detail.views`, `detail.likes` (en + zh); hero/projects subtitles now mention YouTube.
- `package.json` — `collect:youtube` script.

### ⚠️ Heads-up #1 — a migration WAS needed
The spec said "no new migration needed", but migration `0001` puts a CHECK
constraint on `app.identity_link.platform` **and** `raw.snapshot.platform` that
only allows `github/product_hunt/hacker_news/reddit/x`. Inserting
`platform='youtube'` would be rejected outright. `0005_youtube_platform.sql`
widens both constraints (idempotent). **Apply it in the Supabase SQL Editor
before the collector runs**, or every insert will fail.

### ⚠️ Heads-up #2 — verify channel IDs
I could not verify the channel IDs against the live API (no key locally). I used
the IDs from the request verbatim. `Fireship` (`UCsBjURrPoezykLs9EqgamOA`) and
`Two Minute Papers` (`UCbfYPyITQ-7l4upoX8nWQdQ`) look right; the other three are
flagged `VERIFY id` in `youtube-channels.json`. A wrong id just yields zero
videos for that channel (logged via `raw.collector_error`, never fatal).

### Design decisions worth a look
- **GitHub-repo-centric matching.** Per video we extract canonical
  `github.com/owner/repo` URLs, match each to an existing project by github
  `primary_url`, else create a new project keyed on `repoSlug(owner/repo)` — the
  *same* slug the GitHub collector uses, so it adopts/enriches the row on its
  next run. Videos with **no** GitHub link are skipped (no project to attach to),
  mirroring the X collector's "needs a URL to mint a project" rule.
- **One video → many repos.** `identity_link.external_id` is
  `"{videoId}:{owner/repo}"` so the `(platform, external_id)` unique constraint
  doesn't collide when a video showcases several repos. The detail page splits on
  `:` to rebuild the watch URL.
- **Engagement storage.** `raw.snapshot.upvotes = views`, `comments = likes`;
  full video JSON (incl. likes/comments/thumbnail/title) in `raw_data`. No new
  metric columns added (matches "no YouTube-specific metrics"). Home/platform
  views read views from the snapshot.
- **Quota.** `search.list` (latest ids) + `videos.list` (full description +
  stats) per channel, weekly, 10 videos/channel — comfortably inside the default
  10k-unit/day quota.

### Verification
```
pnpm --filter @product-tracer/worker typecheck   # ✓ pass
pnpm --filter @product-tracer/web typecheck      # ✓ pass
```
Both green. (Note: `pnpm install --frozen-lockfile` was needed first — the
worker's `agent-twitter-client` dep wasn't present in node_modules.)
