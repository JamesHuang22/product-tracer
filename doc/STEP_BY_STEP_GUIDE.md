# Step-by-Step Guide — Starting the Autonomous Development System

> Follow in order. Estimated time: 15 minutes.

---

## Overview

You'll set up:
| Component | Type | How |
|-----------|------|-----|
| **Planner** | OpenClaw cron (every 5 min) | Me — write specs for pending tasks |
| **Coder** | CC `--worktree` (your terminal) | You — implement code, say "pull now" |
| **Health** | OpenClaw cron (every 30 min) | Me — monitor site uptime |

---

## Step 1: Create queue file

```bash
cd /Users/jameshuang/Desktop/ai_project/product-tracer
mkdir -p assistant-queue
```

**Alex will write the initial queue.md.** It will contain:
- The system description (so the Coder knows the rules)
- Any pending tasks migrated from the old queue files

---

## Step 2: Register Planner cron

```bash
openclaw cron add \
  --name planner \
  --cron "*/5 * * * *" \
  --agent main \
  --message "Read assistant-queue/queue.md from product-tracer repo. If there is a task with Status: pending, analyze the task and write a detailed spec section. Change Status to spec. Commit and push. Stay silent otherwise." \
  --timeout-seconds 180 \
  --session isolated
```

**What this does:** Every 5 minutes, I check queue.md. If there's a pending task → I write a spec → commit → push. If nothing → silence.

---

## Step 3: Register Health cron

```bash
openclaw cron add \
  --name health \
  --cron "*/30 * * * *" \
  --agent main \
  --message "HTTP health check for product-tracer.vercel.app. curl /, /projects, /trends. If any non-200, send Telegram alert to James." \
  --timeout-seconds 60 \
  --session isolated
```

---

## Step 4: Start Coder session

This is the only step you do in your terminal.

```bash
cd /Users/jameshuang/Desktop/ai_project/product-tracer
claude --worktree coder --dangerously-skip-permissions --name "PT Coder"
```

**What `--worktree coder` does:**
- Creates an independent working directory at `.claude/worktrees/coder/`
- Has its own branch, its own file changes
- Your `main` working tree is untouched — you can work on it in another terminal

**After the session starts, paste this goal:**

```markdown
/goal You are the Product Tracer Coder Agent.

YOUR ONLY JOB:
1. Read assistant-queue/queue.md
2. Find the first task with Status: "ready" or "spec"
3. Read its spec section carefully
4. git pull --rebase origin main
5. git checkout -b feat/task-XXX
6. Implement the code per spec
7. pnpm typecheck
8. gh pr create --fill
9. Poll CI every 30s (max 5 min): gh pr view --json statusCheckRollup
10. If Vercel ✅ → gh pr merge --squash
11. curl -sI https://product-tracer.vercel.app/ → 200
12. curl /projects /trends /youtube-insights /bookmarks /login → all 200
13. If migrations exist: psql "$DATABASE_URL" -f packages/db/migrations/XXX.sql
14. Update CHANGELOG.md
15. Write summary to assistant-queue/RESPONSE.md
16. In queue.md: change Status to "done", add PR # and verify result
17. git add -A && git commit -m 'coder: TASK-XXX done' && git push
18. Stay idle. Say "pull now" when James can start the next task.

GOLDEN RULES:
- NEVER re-read queue during a task. Finish first.
- NEVER close the session.
- If stuck → write "Status: blocked" in queue.md with the problem and wait.
- If a page returns non-200 → do NOT merge. Investigate first.
- When idle → just sit there. Say "done, waiting for next task".
- Self-review before PR: check for null safety, stray console.log, TODO comments.
```

---

## Step 5: Load skills

Inside the Coder session, run these commands:

```
/skill agent-session
/skill vercel-verify
/skill frontend-design
```

---

## Step 6: Verify everything is working

```bash
# Check cron jobs
openclaw cron list
# → planner (every 5 min)
# → health (every 30 min)

# Check site
curl -sI https://product-tracer.vercel.app/

# Check worktree
ls -la /Users/jameshuang/Desktop/ai_project/product-tracer/.claude/worktrees/
# → coder/
```

---

## Your daily routine

| Situation | Action |
|-----------|--------|
| You want to add a feature | Telegram me: "帮我在 /projects 加排序" |
| Coder finished last task | Say **"pull now"** in the Coder terminal |
| You want to check status | Telegram me: "系统状态？" |
| You want to pause everything | Telegram me: "停了" |
| You want to resume | Telegram me: "恢复" |
| Site is down | Health checker alerts you automatically |

---

## Rollback

```bash
openclaw cron disable <planner-id>
openclaw cron disable <health-id>
# In Coder terminal: Ctrl+C or exit
git worktree remove .claude/worktrees/coder
```
