# Product Tracer — Day 2 Sprint

You are the **sole Claude Code agent** for both frontend and backend.

**Repo**: `~/Desktop/ai_project/product-tracer/` (main branch)
**Git author**: `JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>`

Previous sprint (2026-06-22) completed 7 tasks (T0–T6, PRs #43–#49). Now on Day 2.

---

## Workflow (non-negotiable)

For EVERY task:
1. `git checkout -b feat/<name>` from main
2. Implement changes
3. `pnpm --filter @product-tracer/web typecheck` (frontend) / `pnpm --filter @product-tracer/worker typecheck` (backend) — **both must pass**
4. `git add -A && git commit -m 'feat: ...'`
5. `git push origin feat/<branch>` → `gh pr create --fill`
6. Wait for Vercel preview build ✅ (`gh pr checks`)
7. `gh pr merge --squash`
8. **Verify**: `curl -sI https://product-tracer.vercel.app/` → HTTP 200
9. `curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/projects` → 200
10. `curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/trends` → 200
11. `curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/youtube-insights` → 200
12. `curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/api/search?q=ai` → 200
13. Apply any DB migrations via: `psql "$DATABASE_URL" -f packages/db/migrations/XXXX_name.sql`
14. Update `CHANGELOG.md`, `DECISIONS.md`
15. Write summary to `assistant-queue/RESPONSE.md`

---

## Tasks (execute in order)

### U1 [FEATURE] — Bookmark / Save Projects

Allow users to bookmark projects (localStorage-based, no auth needed).

**Frontend**:
1. Add a bookmark toggle button (Lucide `Bookmark` / `BookmarkCheck`) on:
   - Each project card on `/projects`
   - Each project detail page (`[slug]/page.tsx`)
2. New page: `/bookmarks` — lists all bookmarked projects (from localStorage), same card style as `/projects`
3. Nav link: add "Bookmarks" to the nav bar (next to Trends)
4. I18n keys: `nav.bookmarks`, `bookmarks.title`, `bookmarks.empty`, `detail.bookmark`, `detail.bookmarked`

**Implementation**:
- Create `apps/web/lib/bookmarks.ts` — `getBookmarks(): string[]`, `toggleBookmark(slug: string): void`, `isBookmarked(slug: string): boolean` — all localStorage-based
- Create `apps/web/app/bookmarks/page.tsx` — reads bookmark slugs, queries projects, renders cards
- On `/projects/page.tsx` and `[slug]/page.tsx` — add bookmark button that calls `toggleBookmark`

**Files to touch**:
- `apps/web/lib/bookmarks.ts` (NEW)
- `apps/web/app/bookmarks/page.tsx` (NEW)
- `apps/web/app/projects/page.tsx` — add bookmark button to cards
- `apps/web/app/projects/[slug]/page.tsx` — add bookmark toggle
- `apps/web/app/projects/projects-table.tsx` — add bookmark button to rows
- `apps/web/lib/i18n.ts` — i18n keys
- `apps/web/components/nav.tsx` or relevant nav component — add "Bookmarks" link

**Verify**: Click bookmark on a project card → refresh page → still bookmarked → visit /bookmarks → see project there.

---

### U2 [IMPROVEMENT] — Backfill AI summaries (one-off big batch)

The daily cron only generates 50 summaries per day. At 4344 projects this takes months. Do a one-time backfill of the remaining 4200+.

**Implementation**:
- Run the existing `generate-summaries.ts` script with a larger batch size:
  ```bash
  SUMMARY_BATCH=500 pnpm --filter @product-tracer/worker sums:generate
  ```
  (Or whatever the env var is — check the script)

**No PR needed** — just run the script directly. But monitor token cost ($0.0015 per ~50, so ~$0.13 for 4200).

**Files to touch**: None (run existing script)

**Verify**: Check `SELECT count(*) FROM app.project WHERE ai_summary IS NOT NULL` increases significantly.

---

### U3 [IMPROVEMENT] — Backfill llm_category coverage

Only 87 / 4344 projects are LLM-classified. This means:
- "You might also like" is empty for most projects
- Trends page category chart falls back to platform
- Search ranking is less relevant

**Implementation**:
- Re-run the existing `llm-classify` workflow or script over the backlog.
- The script is at `apps/worker/src/scripts/llm-classify.ts`
- GitHub workflow: `.github/workflows/llm-classify.yml` (daily 06:30 UTC)

**Option A**: Trigger the workflow manually: `gh workflow run llm-classify.yml`
**Option B**: Run a one-off with larger batch: check if `BATCH_SIZE` env var is supported

**No PR needed** — just trigger/call existing infrastructure.

---

### U4 [FEATURE] — AI auto-tagging with granular tags

Currently projects have one `llm_category` (8 coarse categories). Add finer-grained tags via LLM.

**Backend**:
1. Create migration `0015_granular_tags.sql`:
   ```sql
   alter table app.project add column if not exists tags text[];
   create index if not exists idx_project_tags on app.project using gin (tags);
   ```
2. Update `llm-classify.ts` to also output 3-5 granular tags per project during classification
3. OR create a new script `apps/worker/src/scripts/generate-tags.ts` that processes un-tagged projects

**Frontend**:
1. Show tags as small badges/chips on project cards and detail pages
2. Click a tag → search by that tag (`/search?tag=...`)
3. Tag-based filtering on `/projects`

**Files to touch**:
- `packages/db/migrations/0015_granular_tags.sql` (NEW)
- `apps/worker/src/scripts/generate-tags.ts` (NEW) or modify `llm-classify.ts`
- `.github/workflows/generate-tags.yml` (NEW) — daily 02:00 UTC
- `apps/web/lib/db.ts` — add tags to queries
- `apps/web/app/projects/projects-table.tsx` — show tag chips
- `apps/web/app/projects/[slug]/page.tsx` — show tag chips
- `apps/web/app/api/search/route.ts` — add tag-based search

**Verify**: Classified projects show 3-5 tag chips. Clicking a tag shows all projects with that tag.

---

### U5 [FEATURE] — YouTube Insight OG image generation

Auto-generate og:image thumbnails for sharing YouTube insights.

**Options (choose simplest)**:
1. **Server-side OG image** via Next.js `@vercel/og` (Satori + React): generate a simple card with the insight title and category
2. **Static fallback**: if too complex, add a generic og:image with video title overlay

**Implementation**:
- Add `generateMetadata` to `apps/web/app/youtube-insights/page.tsx` with Open Graph tags
- Create `apps/web/app/og/youtube-insight/route.tsx` — dynamic OG image generation
- Each insight card gets proper `<meta>` tags for sharing

**Files to touch**:
- `apps/web/app/youtube-insights/page.tsx`
- `apps/web/app/og/youtube-insight/route.tsx` (NEW, if using @vercel/og)
- `apps/web/app/youtube-insights/[id]/page.tsx` (for individual insight pages)

---

### U6 [FEATURE] — Insight category filter: multi-select

Current YouTube insights filter only supports single category. Upgrade to multi-select.

**Files to touch**: `apps/web/app/youtube-insights/page.tsx`, category filter component

---

## Strategic note

The most impactful task for making the product feel complete is **U1 (Bookmarks)** — it's pure frontend, no migration, no API, and gives users a reason to return.

The most impactful for data quality is **U3 (backfill llm_category)** — currently 98% of projects are unclassified, which hurts all recommendation/search/trends features.

Do U1 first (quick win), then U2+U3 (data quality), then U4 if time permits.
