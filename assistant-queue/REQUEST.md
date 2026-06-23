# Product Tracer — Full Feature Sprint

You are now the **sole Claude Code agent** handling both frontend and backend for product-tracer.

**Repo**: `~/Desktop/ai_project/product-tracer/` (main branch)
**Git author**: `JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>`

---

## Workflow (non-negotiable)

For EVERY task:
1. `git checkout -b feat/<descriptive-name>` from main
2. Implement the changes
3. Run typecheck: `pnpm --filter @product-tracer/web typecheck` (frontend) or `pnpm --filter @product-tracer/worker typecheck` (backend) — **both must pass**
4. `git add -A && git commit -m 'feat: ...'`
5. `git push origin feat/<branch>` → create PR via `gh pr create`
6. Wait for Vercel preview build to pass (check via `gh pr checks`)
7. `gh pr merge --squash`
8. **Verify**: `curl -sI https://product-tracer.vercel.app/` → HTTP 200
9. `curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/projects` → 200
10. `curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/trends` → 200
11. `curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/youtube-insights` → 200
12. `curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/feed/projects.xml` → 200
13. Check response body is not empty: `curl -s https://product-tracer.vercel.app/ | head -c 500`
14. Apply any DB migrations via: `psql "$DATABASE_URL" -f packages/db/migrations/XXXX_name.sql`
15. Update `CHANGELOG.md` and `DECISIONS.md`
16. Write summary to `assistant-queue/RESPONSE.md` or `assistant-queue/FRONTEND_RESPONSE.md`

**Never push directly to main. Always branch → PR → merge.**

---

## Tasks (execute in order, one at a time)

### T0 [P2 BUG] — Fix mobile horizontal scroll on /

**Severity**: Bug — the mobile horizontal scroll regression is blocking users on 375px viewports.

**Fix**: Check `apps/web/app/globals.css` and `apps/web/app/layout.tsx`. The issue is likely overflow on a flex/grid container or fixed-width element. Apply `overflow-x-clip` or `max-width: 100vw` on the root layout. Do NOT use a CSS library — fix with inline Tailwind or minimal custom CSS.

**Files to touch**: `apps/web/app/globals.css`, `apps/web/app/layout.tsx`

**Verify**: Open Chrome at 375×812 viewport → no horizontal scrollbar.

---

### T1 [FEATURE] — Detail Page Content Richness

Read the full spec in `assistant-queue/FRONTEND_REQUEST.md` (179 lines).

**6 sub-tasks**:
1. **Fix AI summary rendering** — `app.project.ai_summary` column has 50+ rows but production detail pages show nothing. Debug the query and rendering chain in `apps/web/lib/db.ts` and `apps/web/app/projects/[slug]/page.tsx`.
2. **Add breadcrumb navigation** — `Projects > {project name}` at top of detail page
3. **Structured sections** — Organize detail page: Header → AI Summary → External Links → Related Projects
4. **Related Projects component** — New file `apps/web/components/related-projects.tsx` — horizontal row of 4 mini cards from same `llm_category`, ordered by `stars DESC`, excluding current project
5. **Graceful 404 page** — New file `apps/web/app/projects/[slug]/not-found.tsx` — centered 404 with "Browse all projects" link
6. **ZH i18n** — Add detail page keys to `apps/web/lib/i18n.ts`

**Files to touch**: `apps/web/app/projects/[slug]/page.tsx`, `apps/web/app/projects/[slug]/not-found.tsx`, `apps/web/lib/db.ts`, `apps/web/components/related-projects.tsx`, `apps/web/lib/i18n.ts`

**No migration needed** — all columns (`ai_summary`, `llm_category`, `stars`) already exist.

---

### T2 [FEATURE] — Fuzzy Search on /projects

4000+ projects and no way to search. This is the #1 user-facing gap.

**Backend**:
1. Create `packages/db/migrations/0015_pg_trgm_search.sql` (skip 0014 if it doesn't exist — just pick the next number):
   ```sql
   create extension if not exists pg_trgm;
   create index if not exists idx_project_name_trgm on app.project using gin (name gin_trgm_ops);
   create index if not exists idx_project_one_liner_trgm on app.project using gin (one_liner gin_trgm_ops);
   ```
2. Create `apps/web/app/api/search/route.ts`:
   ```
   GET /api/search?q={query}
   → SELECT name, slug, one_liner, stars, score
     FROM app.project
     WHERE name % q OR one_liner % q
     ORDER BY similarity(name, q) DESC
     LIMIT 20
   ```

**Frontend**:
3. Add a search input to the projects page header — debounced 300ms, calls `/api/search?q=...`, shows dropdown results while typing, links to detail pages
4. Add search icon (Lucide `Search`) inside the input

**Files to touch**:
- `packages/db/migrations/0015_pg_trgm_search.sql` (NEW)
- `apps/web/app/api/search/route.ts` (NEW)
- `apps/web/app/projects/page.tsx` — add search input
- `apps/web/app/projects/projects-table.tsx` — if needed for search results display

**Verify**: Type "gpt" → see all GPT-related projects pop up. Type "AI" → see results.

---

### T3 [FEATURE] — Score heat indicator on project cards

**Detail**: Add a subtle visual indicator for project quality scores on the /projects page cards.

**Implementation**:
- Add a thin left border or background tint based on `project.quality_score`:
  - score >= 80: green (`border-l-4 border-l-emerald-500`)
  - score >= 60: yellow (`border-l-4 border-l-amber-500`)
  - score >= 40: gray (no border)
  - no score or < 40: no special styling
- The `quality_score` column already exists in `app.project`

**Files to touch**: `apps/web/app/projects/projects-table.tsx`

**Verify**: High-scoring cards have visible green accent.

---

### T4 [FEATURE] — Weekly Trends Dashboard: Visual Charts

**Detail**: Enhance the /trends page with basic charts and WoW comparisons.

**Backend** (`apps/web/lib/db.ts`):
- Add `getTrendCategoryDistribution()` — aggregate current weekly_trend products by `llm_category`
- Add `getTrendTopProducts(limit: 5)` — top products by `combined_score` from current week

**Frontend** (`apps/web/app/trends/page.tsx`):
- Category distribution: simple horizontal bar chart or flex boxes with percentages (no external chart library required — use CSS-only bars)
- Top 5 products: numbered list with scores, stars, and links
- Week-over-Week: compare this week's top category against last week's (same table, query by `created_at`)

**No migration needed** — all data in existing `app.weekly_trend` table.

**Files to touch**: `apps/web/app/trends/page.tsx`, `apps/web/lib/db.ts`

**Verify**: `/trends` shows category bars, top 5 list, WoW changes.

---

### T5 [FIX] — Reddit collector: GitHub Actions 403

Reddit blocks GitHub Actions IPs (Cloudflare-based runners). Current `collectors/reddit.ts` uses no-OAuth JSON API.

**Options (pick one)**:
1. Route through `old.reddit.com` with a realistic `User-Agent` header
2. Add a delay between requests and a cached proxy via `node-fetch` + `agent-keepalive`
3. If all fail, mark Reddit collector as "requires manual deploy" and move on

**Files to touch**: `apps/worker/src/collectors/reddit.ts`, `.github/workflows/collect-reddit.yml`

**Verify**: Trigger workflow run, check if non-403.

---

### T6 [FEATURE] — AI Recommendation Engine

**"You might also like"** — 4 related projects based on shared `llm_category`, ordered by `(stars * 0.7 + score * 0.3) DESC`.

This builds on T1's Related Projects component. If T1 is done, extend it:
1. Add weighted ordering: `COALESCE(stars, 0) * 0.7 + COALESCE(quality_score, 0) * 0.3 DESC`
2. Label the section "You might also like" (EN) / "猜你喜欢" (ZH)
3. If `llm_category` is NULL for current project, fall back to projects with the most matching tags

**Files to touch**: `apps/web/lib/db.ts`, `apps/web/components/related-projects.tsx`, `apps/web/app/projects/[slug]/page.tsx`

---

## Quick reference

| Command | Purpose |
|---|---|
| `pnpm --filter @product-tracer/web typecheck` | Frontend typecheck |
| `pnpm --filter @product-tracer/worker typecheck` | Backend typecheck |
| `pnpm --filter @product-tracer/worker sums:generate` | Run AI summaries script |
| `psql "$DATABASE_URL" -f packages/db/migrations/XXXX_name.sql` | Apply migration |
| `curl -sI https://product-tracer.vercel.app/` | Verify homepage 200 |
| `gh pr create --fill` | Create PR from current branch |
| `gh pr merge --squash` | Merge approved PR |

## After completing ALL tasks

1. Ensure both `assistant-queue/RESPONSE.md` and `assistant-queue/FRONTEND_RESPONSE.md` are updated
2. Write a concise summary to `assistant-queue/next-request.md` noting what was done and what's left
3. Commit and push all queue files
