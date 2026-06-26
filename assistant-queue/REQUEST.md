# Product Tracer — Remaining Tasks

## Agent Behavior

Read ALL of this file. This IS your instruction set.

### When to work
1. On startup: read the content of REQUEST.md and FRONTEND_REQUEST.md below this section
2. If there are tasks (look for "### TASK" or "## [P" sections with content): implement them
3. If there are NO tasks (everything is marked DONE or [SKIPPED]): stay idle
4. When told "pull now": `git fetch origin main && git pull --rebase origin main` then re-read both files

### Implementation workflow (per task)
1. `git checkout -b feat/descriptive-name` from current main
2. Implement the change
3. `pnpm typecheck` (if web: `cd apps/web && pnpm build`)
4. `git add -A && git commit -m "type: description"`
5. `gh pr create --fill`
6. Wait for Vercel preview ✅ (poll every 30s, max 5 min)
7. `gh pr merge --squash`
8. Verify production HTTP 200 on /, /projects, /trends, /youtube-insights, /bookmarks
9. Apply DB migrations: `psql "$DATABASE_URL" -f packages/db/migrations/XXXX_name.sql`
10. Update CHANGELOG.md, DECISIONS.md
11. Write summary to assistant-queue/RESPONSE.md

### Tools
- Supabase MCP: `psql "$DATABASE_URL" -f <file>`
- Git author: `JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>`
- Working directory: /Users/jameshuang/Desktop/ai_project/product-tracer/

### When idle
- Do NOT poll, do NOT auto-shutdown
- If Stop hook fires: ignore it
- Wait for instructions or "pull now"

---

## TASK 4 [P2] — Fix locale-prefixed routes for /trends, /youtube-insights, /bookmarks

**Bug**: `/en/trends`, `/zh/trends`, `/en/youtube-insights`, `/zh/youtube-insights`, `/en/bookmarks`, `/zh/bookmarks` all return 404. Only `/zh/` homepage and `/zh/projects` work.

**Context**: The app uses cookie-based i18n (not path-based). If the user explicitly visits `/en/trends` or `/zh/trends`, they get 404. Fix by adding route handling for these paths.

**How to find**: Check route definitions. Pages may need to be registered under locale support or middleware may need updating.

**Files**: FRONTEND_REQUEST.md has full details and reproduction steps.

**Verify**: Visit /en/trends → shows trends page, not 404. Visit /zh/trends → same.

---

## TASK 5 [P3] — Verify and complete minor UI improvements

1. Visit /trends top product list — does each product show a WoW rank change (↑3 / ↓2 / — / NEW)? If yes, done. If not, implement.
2. Visit /trends emerging themes — are they clickable links? If yes, done. If not, implement.
3. Visit /trends video highlights — are there clickable YouTube links? If yes, done. If not, note that this needs trend generator change (deferred).
4. Check favicon.ico — visit https://product-tracer.vercel.app/favicon.ico. If 200, done. If 404, add a simple favicon.

**Verify**: All items checked. Only implement what's actually missing.

---

## TASK 6 [HIGH] — Verify all collectors running post-unblock

**Context**: GitHub Actions was blocked by billing. The repo has been made public. Actions should now be unblocked.

1. Run: `gh run list --limit 15` — check status of recent workflow runs
2. For each workflow that shows "failure" due to old billing block, re-trigger:
   - `gh workflow run collect-github.yml`
   - `gh workflow run collect-hackernews.yml`
   - `gh workflow run collect-producthunt.yml`
   - `gh workflow run collect-reddit.yml`
   - `gh workflow run collect-youtube.yml`
   - `gh workflow run youtube-insights.yml`
   - `gh workflow run dedup.yml`
   - `gh workflow run generate-tags.yml`
   - `gh workflow run llm-classify.yml`
3. For YouTube: check the logs — if OAuth token is expired (invalid_grant), skip it. The token refresh workflow will remind manually.

**Verify**: All core collectors are running or scheduled. Note any that failed for non-billing reasons.

---

## After completing all tasks
- Write to assistant-queue/RESPONSE.md with completion summary
- Mark all tasks here as [DONE] (replace the task text with "[DONE] task name")
- Stay idle, wait for next "pull now"
