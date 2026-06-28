# Step-by-Step Guide — Starting the Autonomous Development System

> Follow this guide in order. Each step builds on the previous one.
> Estimated time: 15 minutes.

---

## Step 1: Create the Unified Queue File

The system needs a single `assistant-queue/queue.md` that replaces the old `REQUEST.md` and `FRONTEND_REQUEST.md`.

```bash
cd /Users/jameshuang/Desktop/ai_project/product-tracer
mkdir -p assistant-queue
```

**Alex (me) will write the initial queue.md.** It will contain pending tasks and system rules.

---

## Step 2: Register Planner Cron (Every 5 Minutes)

The Planner checks queue.md for pending tasks and writes specs.

```bash
openclaw cron add \
  --name planner \
  --cron "*/5 * * * *" \
  --agent main \
  --message "Read assistant-queue/queue.md from product-tracer repo. If there is a task with Status: pending, analyze the task scope and write a detailed spec section under it. Then change Status to spec. Commit and push the change." \
  --timeout-seconds 180 \
  --session isolated
```

---

## Step 3: Register Verifier Cron (Every 30 Minutes)

Verifies HTTP 200 after merges.

```bash
openclaw cron add \
  --name verifier \
  --cron "*/30 * * * *" \
  --agent main \
  --message "Check product-tracer repo for recent merges. Run: for page in / /projects /trends /youtube-insights /bookmarks /login; do curl -s -o /dev/null -w '%{http_code}' https://product-tracer.vercel.app/$page; done. If all 200, write Verify:PASS to queue.md. If any non-200, alert James." \
  --timeout-seconds 60 \
  --session isolated
```

---

## Step 4: Register Health Cron (Every 30 Minutes, Staggered)

```bash
openclaw cron add \
  --name health \
  --cron "*/30 * * * *" \
  --agent main \
  --message "HTTP health check for product-tracer.vercel.app: curl /, /projects, /trends. If all 200, do nothing. If any non-200, send Telegram alert to James." \
  --timeout-seconds 60 \
  --session isolated
```

---

## Step 5: Start the Coder Session

```bash
cd /Users/jameshuang/Desktop/ai_project/product-tracer
claude --worktree coder --dangerously-skip-permissions --name "PT Coder"
```

After session starts, paste this goal:

```
/goal You are the Product Tracer Coder Agent.

YOUR ONLY JOB:
1. Read assistant-queue/queue.md
2. Find first task with Status: "ready" or "spec"
3. git pull --rebase origin main
4. git checkout -b feat/task-XXX
5. Implement per spec
6. pnpm typecheck
7. gh pr create --fill
8. Poll CI every 30s (max 5 min)
9. If Vercel ✅ → gh pr merge --squash
10. curl verify all pages 200
11. If migrations: psql "$DATABASE_URL" -f packages/db/migrations/XXX.sql
12. Update CHANGELOG.md
13. Write to assistant-queue/RESPONSE.md
14. In queue.md: Status → done, add PR #
15. git push
16. Stay idle. No polling. No auto-shutdown. Wait for "pull now".
```

---

## Step 6: Load Skills

Inside the Coder session:

```
/skill agent-session
/skill vercel-verify
/skill frontend-design
```

---

## Step 7: Verify

```bash
openclaw cron list
curl -sI https://product-tracer.vercel.app/
ls -la .claude/worktrees/  # should show coder/
```
