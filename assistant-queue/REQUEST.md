# Assistant Queue — Alex → Claude Code (Backend)

## New Feature: YouTube Collector

Add a YouTube channel collector to product-tracer. The goal is to monitor curated YouTube channels that review/demo new AI projects and products, and extract those projects into our database.

### How It Works
- We maintain a list of YouTube channels (indie/AI project reviewers)
- Periodically fetch their latest videos
- Parse video descriptions for GitHub links and project mentions
- Match to existing projects or create new ones

### Implementation

**1. Create `apps/worker/src/collectors/youtube.ts`**
Exports:
- `YoutubeVideo` type (id, title, description, channelTitle, publishedAt, videoUrl, thumbnailUrl, githubUrls[], descriptionUrls[])
- `getChannelVideos(channelId: string, apiKey: string): Promise<YoutubeVideo[]>` — uses YouTube Data API v3 to fetch latest N videos from a channel
- `extractGithubUrls(text: string): string[]` — extract GitHub repo URLs from video description text
- Default channel list as a const array

**2. Create `apps/worker/src/scripts/collect-youtube.ts`**
Batch script that:
1. Reads `YOUTUBE_API_KEY` from env (optional — skip gracefully if not set, like X collector's `isAuthConfigured`)
2. Fetches latest videos for each configured channel (max 10 per channel per run, run weekly)
3. For each video, extracts GitHub URLs from description
4. Tries to match GitHub repos to existing projects in DB
5. For unmatched repos: creates new project (like other collectors do)
6. For all videos: writes to `raw.snapshot` (platform='youtube', upvotes=views, comments=likes?)
7. Stores channel/video info in `app.identity_link` (platform='youtube')
8. Prints stats

**3. Update `apps/web/lib/db.ts`**
Add `getPlatformProjects('youtube')`, `getPlatformTop('youtube')`, `getPlatformProjectCount('youtube')` support so the frontend can display YouTube-sourced projects.

**4. Frontend: add YouTube to home page**
- Add YouTube as a live platform section on `/` (similar to GitHub/HN/PH cards)
- Add YouTube badge/source to `/projects` table and `/projects/[slug]` detail page
- Add i18n keys for YouTube (en + zh)

**5. Create `.github/workflows/collect-youtube.yml`**
Standard workflow:
```yaml
name: Collect YouTube
on:
  schedule:
    - cron: '0 8 * * 1'  # Weekly: Monday 8:00 UTC
  workflow_dispatch:
```
Set `YOUTUBE_API_KEY` as an env var from secrets.

**6. Add a config file `apps/worker/config/youtube-channels.json`**
Initial channels (indie/AI project reviewers):
- Matt Wolfe (UCzHl5aV1M8qNqGTY5kU0X5w) — AI tools weekly roundup
- The AI Advantage (UCV7_KgXRRc4I5JmXRA5eW6A) — AI project tutorials  
- Fireship (UCsBjURrPoezykLs9EqgamOA) — tech reviews
- AI Explained (UCcQ2M7CRA7tP0t8dZm8fX3A) — AI deep dives
- Two Minute Papers (UCbfYPyITQ-7l4upoX8nWQdQ) — AI paper demos

(Need to verify these channel IDs are correct — Claude may need to look them up during implementation)

**7. Update the home page to show YouTube as a live platform**
Already handled by step 4.

### Database Schema
- Use existing `app.project` + `app.identity_link` (platform='youtube', external_id=video_id)
- Use existing `raw.snapshot` (platform='youtube')
- Video metadata (views, likes, title, thumbnail) goes into `raw.snapshot.raw_data` as JSON
- No new migration needed unless we want YouTube-specific metrics

### Verification
- `pnpm --filter @product-tracer/worker typecheck` passes
- Can run without `YOUTUBE_API_KEY` set (graceful skip)
- Frontend shows YouTube projects correctly

---

Execute all tasks. No questions needed. Write RESPONSE.md when done.
