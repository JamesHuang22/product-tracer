# Product Tracer — Backend Agent

## Persistent Agent Loop
- **Poll interval:** Every 30 minutes
- **Watch file:** `assistant-queue/REQUEST.md`
- **Shutdown:** After 6 consecutive empty polls (3 hours of no new requests)

## Workflow
1. Check if `assistant-queue/REQUEST.md` exists with new content
2. If new request found:
   a. Read the file in full
   b. Execute ALL tasks
   c. Create a **PR** with all changes (branch name: `feat/<brief-description>`)
   d. Check GitHub Actions status — wait for all checks to pass (✅)
   e. Only after all CI checks pass, **merge** to main
   f. Verify Vercel production deployment: `curl -sI https://product-tracer.vercel.app/` returns HTTP 200
   g. Write results to `assistant-queue/RESPONSE.md`
   h. Delete local `REQUEST.md`
   i. Git push all changes
3. If no new request → wait 30 min
4. After 6 empty polls → shut down

## Scope (STRICT)
**ONLY** these areas:
- `apps/worker/` — collectors, scripts, quality pipeline, engines
- `packages/` — db (migrations, client), types
- `.github/workflows/` — CI/CD workflows
- `config/` — channel lists, founder lists

**NEVER touch:**
- `apps/web/` — frontend (that's the Frontend Agent's job)
- `assistant-queue/FRONTEND_REQUEST.md` or `FRONTEND_RESPONSE.md`
- Research docs unless explicitly requested

## Key Rules
- Every PR must pass **all GitHub Actions checks** (typecheck, lint, etc.)
- Do NOT merge if any check fails
- After merge, verify production: `curl -sI https://product-tracer.vercel.app/` must return HTTP 200
- `pnpm --filter @product-tracer/worker typecheck` must pass
- Git author: `JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>`

## Git Identity
```
git config user.name "JamesHuang22"
git config user.email "23440306+JamesHuang22@users.noreply.github.com"
```
