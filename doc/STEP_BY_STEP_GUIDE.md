# Step-by-Step Guide — Starting the Autonomous Development System

> Follow in order. Estimated time: 15 minutes.

---

## What you'll be running

| Terminal | Role | Behavior |
|----------|------|----------|
| 1 | **Coder-Auto** | Polls queue every 30 min, works autonomously |
| 2 | **Coder-OnDemand** | Waits for "pull now" — you trigger it |
| (background) | Planner cron | Every 5 min, writes specs (me) |
| (background) | Health cron | Every 30 min, monitors site (me) |

No manual scope assignment. Both coders compete for tasks via a lock mechanism in queue.md.

---

## Step 1: Create queue file

```bash
cd /Users/jameshuang/Desktop/ai_project/product-tracer
mkdir -p assistant-queue
```

Alex will write the initial queue.md with the system rules.

---

## Step 2: Register Planner cron (every 5 min)

```bash
openclaw cron add \
  --name planner \
  --cron "*/5 * * * *" \
  --agent main \
  --message "Read assistant-queue/queue.md from product-tracer repo. If any task has Status: pending, write a detailed spec section. Change Status to ready. Commit and push." \
  --timeout-seconds 180 \
  --session isolated
```

---

## Step 3: Register Health cron (every 30 min)

```bash
openclaw cron add \
  --name health \
  --cron "*/30 * * * *" \
  --agent main \
  --message "HTTP health check for product-tracer.vercel.app. curl /, /projects, /trends. If any non-200, alert James via Telegram." \
  --timeout-seconds 60 \
  --session isolated
```

---

## Step 4: Start Coder-Auto

Open a new terminal tab.

```bash
cd /Users/jameshuang/Desktop/ai_project/product-tracer
claude --worktree coder-auto --dangerously-skip-permissions --name "PT Coder Auto"
```

**After session starts, load skills:**
```
/skill agent-session
/skill vercel-verify
/skill frontend-design
```

**Then paste this goal:**
```markdown
/goal You are Coder-Auto for Product Tracer. Your job is to poll the queue every 30 minutes and implement tasks automatically.

BEHAVIOR:
1. Every 30 minutes: read assistant-queue/queue.md
2. Find first task with Status: "ready" AND Locked by: (empty)
3. Lock it: change "Locked by" to "coder-auto", "Locked at" to current timestamp
4. git add -A && git commit -m "lock: TASK-XXX by coder-auto" && git push
5. git pull --rebase origin main
6. git checkout -b feat/task-XXX
7. Implement per spec
8. pnpm typecheck → gh pr create --fill
9. Poll Vercel (max 5 min)
10. If ✅ → gh pr merge --squash
11. curl verify all pages 200
12. If migrations: psql "$DATABASE_URL" -f packages/db/migrations/XXX.sql
13. Update CHANGELOG.md → write RESPONSE.md → Status: done
14. git push → wait 30 min → poll again

LOCKING RULES:
- If another coder already locked the task (Locked by is not empty): skip it, find the next one
- If no ready + unlocked task exists: stay idle, wait 30 min
- Never work on a task without locking it first
```

---

## Step 5: Start Coder-OnDemand

Open another terminal tab.

```bash
cd /Users/jameshuang/Desktop/ai_project/product-tracer
claude --worktree coder-ondemand --dangerously-skip-permissions --name "PT Coder OD"
```

**Load skills:**
```
/skill agent-session
/skill vercel-verify
/skill frontend-design
```

**Paste this goal:**
```markdown
/goal You are Coder-OnDemand for Product Tracer. You only work when James tells you "pull now".

BEHAVIOR:
1. On "pull now": read assistant-queue/queue.md
2. Find first task with Status: "ready" AND Locked by: (empty)
3. Lock it: change "Locked by" to "coder-ondemand", "Locked at" to current timestamp
4. git add -A && git commit -m "lock: TASK-XXX by coder-ondemand" && git push
5. git pull --rebase origin main
6. git checkout -b feat/task-XXX
7. Implement per spec
8. pnpm typecheck → gh pr create --fill
9. Poll Vercel (max 5 min)
10. If ✅ → gh pr merge --squash
11. curl verify all pages 200
12. If migrations: psql "$DATABASE_URL" -f packages/db/migrations/XXX.sql
13. Update CHANGELOG.md → write RESPONSE.md → Status: done
14. git push → idle. Wait for next "pull now".

LOCKING RULES:
- Always check Locked by before starting. If non-empty, skip that task.
- Never work on a task without locking it first.
- When idle: just sit there. Say "waiting for pull now".
```

---

## Verify everything

```bash
openclaw cron list
# → planner (every 5 min)
# → health (every 30 min)

curl -sI https://product-tracer.vercel.app/
# → 200

ls -la .claude/worktrees/
# → coder-auto/  coder-ondemand/
```

---

## Your daily routine

| Situation | Do this |
|-----------|---------|
| Add a feature | Telegram: "帮我在 /projects 加排序" → I write task → Planner specs → Coder-Auto picks it up within 30 min |
| Coder-Auto is busy, you want to jump in | Say **"pull now"** in the Coder-OnDemand terminal |
| Check status | Telegram: "系统状态？" |
| Pause everything | Telegram: "停了" |
| Clear a stuck lock | Telegram: "TASK-001 的 lock 清了" → I clear it |
| Leave for the day | Coder-Auto keeps running. OnDemand stays idle. Health monitors site. |

---

## Rollback

```bash
openclaw cron disable <planner-id>
openclaw cron disable <health-id>
# In each Coder terminal: Ctrl+C or exit
git worktree remove .claude/worktrees/coder-auto
git worktree remove .claude/worktrees/coder-ondemand
```
