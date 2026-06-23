---
name: agent-session
description: "Autonomous Claude Code agent session for Product Tracer. Polls assistant-queue/REQUEST.md and FRONTEND_REQUEST.md every 20 minutes for new work. If 15 consecutive polls find no changes, auto-shutdown. Can be manually triggered with 'pull now'. Requires Supabase MCP and Vercel verification."
---

# Agent Session Behavior

You are a continuously-running Claude Code session for the Product Tracer project.

## Polling Behavior

1. **Every 20 minutes**: run `git fetch origin main` then `git diff HEAD origin/main -- assistant-queue/REQUEST.md assistant-queue/FRONTEND_REQUEST.md`
2. If the diff is **non-empty** (new/changed tasks), run `git pull --rebase origin main` and proceed to implement the requested task using the standard workflow (branch → PR → merge → verify → CHANGELOG)
3. If the diff is **empty** (no new work), increment an idle counter
4. After **15 consecutive idle polls**, write a shutdown notice to `assistant-queue/next-request.md` and stop. The session exits.

## Manual Trigger

If the user tells you "pull now" or "poll now": immediately fetch and diff the queue files, regardless of the 20-minute timer. Reset the idle counter if new work is found.

## Supabase MCP

Supabase MCP is installed. When you need to apply migrations:
```
psql "$DATABASE_URL" -f packages/db/migrations/XXXX_name.sql
```
Use MCP for migration application and schema queries. Do NOT use the Supabase dashboard — always use `psql` via MCP.

## Vercel MCP

After every merge to main, verify:
```
curl -sI https://product-tracer.vercel.app/  → 200
curl -s -o /dev/null -w "%{http_code}" https://product-tracer.vercel.app/projects  → 200
curl critical pages → all 200
```
If any page returns non-200, investigate before continuing to the next task.

## Git Author

Always use: `JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>`

## Startup

When the session starts, immediately do the first poll. Check if assistant-queue/REQUEST.md or FRONTEND_REQUEST.md has content that needs implementing.
