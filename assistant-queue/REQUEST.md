# Product Tracer — Remaining Tasks

## Agent Session Rules

You are a continuously-running agent. Follow these rules:

### Polling
1. Every 30 minutes: `git fetch origin main && git diff HEAD origin/main -- assistant-queue/REQUEST.md assistant-queue/FRONTEND_REQUEST.md`
2. If diff is non-empty: git pull --rebase, implement new tasks
3. If empty: increment idle counter
4. After 6 consecutive idle polls (3 hours): write shutdown notice and stop

### Manual trigger
"pull now" → immediately fetch and diff queue files, reset idle counter.

### Supabase MCP (installed)
Migrations via: `psql "$DATABASE_URL" -f packages/db/migrations/XXXX_name.sql`

### Vercel verify after every merge
```
curl -sI https://product-tracer.vercel.app/  → 200
curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/projects → 200
curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/trends → 200
curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/youtube-insights → 200
```

### Git author
`JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>`

### Workflow (non-negotiable)
1. Branch from main → implement → `pnpm typecheck` → commit → push → `gh pr create --fill`
2. Wait for Vercel preview ✅ → `gh pr merge --squash`
3. Verify HTTP 200 on all critical paths
4. Apply DB migrations via psql (Supabase MCP)
5. Update CHANGELOG.md, DECISIONS.md
6. Write summary to assistant-queue/RESPONSE.md (backend) or FRONTEND_RESPONSE.md (frontend)

---

## IMPORTANT: TASK 1-3 already completed (PR #68/#69/#70 merged). Start from TASK 4.

---

### TASK 4 [P2] — Fix locale-prefixed routes for /trends, /youtube-insights, /bookmarks

**Bug**: `/en/trends`, `/zh/trends`, `/en/youtube-insights`, `/zh/youtube-insights`, `/en/bookmarks`, `/zh/bookmarks` all return 404. Only `/zh/` homepage and `/zh/projects` work.

**Context**: The app uses cookie-based i18n (not path-based). If the user explicitly visits `/en/trends` or `/zh/trends`, they get 404. Fix by adding route handling for these paths — either middleware redirect or registering routes.

**Files**: FRONTEND_REQUEST.md has full details.

---

### TASK 5 [P3] — Minor UI improvements
- Add WoW delta to /trends top product list (already done in PR #73? verify)
- Clickable theme links on /trends (already done in PR #74? verify)
- Clickable YouTube links on /trends video highlights (deferred — needs trend generator change)
- `favicon.ico` 404 (check if fixed)

**Verify**: Visit /trends, check which features are present, skip already-done ones.

---

### TASK 6 [NEW] — Re-enable all collectors after GitHub Actions unblocked

**Context**: GitHub Actions billing was blocking all workflows. The repo has been made public and Actions is now unblocked. GitHub, Hacker News, Product Hunt, Reddit, and YouTube collectors are all running.

**Do**: Verify that the following workflows ran successfully or are scheduled:
1. collect-github.yml
2. collect-hackernews.yml
3. collect-producthunt.yml
4. collect-reddit.yml
5. collect-youtube.yml
6. youtube-insights.yml
7. dedup.yml
8. llm-classify.yml

Check run history: `gh run list --limit 10`
If any show "failure" due to the old billing block, they can be re-triggered: `gh workflow run <workflow-name>`

**Note**: YouTube collector may fail with OAuth (token expired). Check its logs — if `invalid_grant`, skip it (the refresh script has been updated to auto-remind every 6 days).

---

### After completing all tasks
1. If all tasks done with nothing pending → write to next-request.md: "all tasks complete, queue clean"
2. Update CHANGELOG.md, DECISIONS.md
3. Write summary to RESPONSE.md
4. Continue polling for new work (idle timer resets)
