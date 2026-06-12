# CRITICAL: Fix Vercel deployment — site is completely down

## Context
The product-tracer Vercel deployment at https://product-tracer.vercel.app is DOWN.
- Serverless functions timeout (HTTP 000 / 10s+ hang)
- Vercel project: product-tracer (team: jameshuangs-projects)
- Working deployment: commit `5a12625` (23h ago, manually deployed via Vercel UI)
- Blocked deployments: 3+ newer commits stuck as "Blocked" in Vercel
- Root cause: Git Integration not properly connected. Vercel shows "1/5 Connect Git Repository" — GitHub auto-deploy is broken.
- Second problem: DB connection exhaustion (postgres connection pool in serverless)

## What you must do

### 1. Install and use Vercel MCP
Claude Code needs the Vercel MCP tool to deploy:
```
npx @anthropic/mcp-vercel
```
Or if not available, use Vercel CLI:
```
npm install -g vercel
```

### 2. Fix Git Integration
Connect Vercel to GitHub repo `JamesHuang22/product-tracer`:
- Use `vercel git connect` or Vercel API to link the repo
- Author: jameshuang22 / ZhiyuHuang23
- Make sure new pushes to `main` trigger auto-deployment

### 3. Check Environment Variables
Verify in Vercel Dashboard (or via CLI `vercel env ls`):
- `DATABASE_URL` — MUST be Supabase transaction pooler (port 6543), NOT session pooler (port 5432)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Redeploy Latest Code
The latest main commit (`ca3f9b1`) has the postgres connection fix already merged.
Deploy it:
```
vercel --prod --confirm
```

### 5. Verify Site Works
After deployment:
```
curl -sI https://product-tracer.vercel.app
curl -sI https://product-tracer.vercel.app/projects
```
Both should return HTTP 200 within 3 seconds.

### 6. If Still Broken — Check Logs
```
vercel logs product-tracer.vercel.app
```
Look for the actual error causing 500/timout.

### CRITICAL: Do NOT modify any source code
This is purely a deployment/infrastructure issue. The code is fine.
Do NOT change `apps/web/`, `apps/worker/`, `packages/`, or any `.ts`/`.tsx` files.
Only use Vercel CLI/MCP to configure and deploy.

### DO NOT touch my assistant-queue/ files — those are for me.

---

Execute. Write RESPONSE.md when done.
