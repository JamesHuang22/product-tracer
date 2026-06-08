# Assistant Queue — Alex → Claude Code (Frontend)

## Task: Add YouTube-only project page with video-first UI

### Background
The YouTube collector is now live and OAuth-powered — it scrapes your subscribed channels for new videos, extracts GitHub repos from descriptions, and stores them in the DB. But the frontend treats YouTube just like any other platform (GH/Y/PH card + generic `/projects` list). We need a **YouTube-specific project page** that shows the YouTube context the way it makes sense: **video-first, not repo-first**.

### What to build

**1. YouTube-only list page: `/youtube` (not `/platform/youtube`)**

A dedicated page that feels like browsing YouTube mentions, not like looking at repos:

- **Hero section**: "YouTube Signals" — show total videos scanned, total unique projects, last updated time
- **Project cards**, not table rows. Each card:
  - **Thumbnail** of the YouTube video (if available in raw_data → thumbnailUrl)
  - **Video title** (bold) + channel name (small, gray)
  - One-liner of the project (short, italic)
  - **Stats row**: 👁 views  👍 likes  💬 comments  *repo this way →*
  - Clicking the card navigates to the existing `/projects/[slug]` detail page
  - The external link icon opens the YouTube video

**2. Data source: read raw.snapshot for YouTube projects**

Current `getPlatformProjects('youtube')` only returns project-level data (id, name, stars, etc.) — no video metadata. We need to enrich it. Option A (preferred): write a new DB function `getYoutubeProjects()` that joins `identity_link` with `raw.snapshot` and returns the video metadata. Option B: encode video data in the existing query.

The new query should return something like:
```
project_id, slug, name, one_liner, primary_url,
latest_video_title, latest_channel_title, latest_thumbnail_url,
video_url, total_views, total_likes, total_comments,
video_published_at, video_count
```

**3. `/projects` table: update the YouTube project row behavior**

Currently, projects with GitHub links go to github.com when clicked, and non-GitHub projects go to `/projects/[slug]`. For YouTube-only projects (no GitHub link), clicking should also show the YT video mentions inline. Consider adding a "View video" chip next to the YT badge in the source column.

**4. i18n strings to add**

Add to `lib/i18n.ts`:

```
'youtube.page.title': 'YouTube Signals'
'youtube.page.subtitle': 'Tracking {videos} videos across {projects} projects from {channels} channels.'
'youtube.page.videoCount': '{count} videos'
'youtube.page.lastUpdated': 'Last updated {time} ago'
'youtube.card.views': '{count} views'
'youtube.card.likes': '{count} likes'
'youtube.card.comments': '{count} comments'
'youtube.card.watchOnYoutube': 'Watch on YouTube'
'youtube.card.trackedProject': 'Tracked project →'
'youtube.card.videoBy': 'by'
```

**5. Home page enhancement**

On the home page, the YouTube `LivePlatformSection` currently shows 5 items as simple "name + metric" rows (same as GitHub/HN/PH). Make the YouTube section show **video thumbnails** instead — tiny 2x2 grid with round corners and the video title underneath — so it looks like a YouTube mini-feed, not a leaderboard.

### Files to touch (ONLY)

- `apps/web/lib/db.ts` — add `getYoutubeProjects()` function
- `apps/web/app/youtube/page.tsx` — new YouTube-specific page
- `apps/web/app/youtube/youtube-card.tsx` — new YouTube card component
- `apps/web/lib/i18n.ts` — add YouTube i18n strings
- `apps/web/app/projects/projects-table.tsx` — update YT badge behavior
- `apps/web/components/platform-section.tsx` — YouTube home section enhancement
- `apps/web/app/page.tsx` — wire YouTube data with correct component

### DO NOT touch
- Any file in `apps/worker/`, `packages/`, `.github/workflows/`, migration `.sql`, `research/`
- Any `youtube.ts` or `collect-youtube.ts` in the worker
- Any GitHub Actions files

### Verification
- `pnpm --filter @product-tracer/web typecheck` passes
- `/youtube` shows video cards with thumbnails
- Home page YouTube section looks different from other platforms
- Clicking a YT card navigates to the correct project detail or YouTube video

---

Execute all tasks. No questions. Write FRONTEND_RESPONSE.md when done.
