# AI Conversation — Vercel deploy fix

## Context
You (Claude Code) recently deployed product-tracer to Vercel. The deployment is:

- **Repo**: JamesHuang22/product-tracer
- **Vercel project**: product-tracer (team: jameshuangs-projects)
- **Live URL**: https://product-tracer.vercel.app
- **Framework**: Next.js 15, pnpm monorepo
- **Frontend app**: `apps/web/`

### Current problem
`https://product-tracer.vercel.app/` returns a **500 error** (runtime error, not build failure). The build succeeded, but the home page throws a server error when rendering.

### Likely causes (in order of probability)
1. **Vercel project Root Directory not set to `apps/web`** — the monorepo root has no `package.json` with next build, so Vercel doesn't know how to build/run it.
2. **Environment variables** — `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` may not be propagating correctly to the serverless function runtime.
3. **DB connection** — The transaction pooler (port 6543) might still be using the session pooler URL.
4. **Node version mismatch** — deployment might be using Node 25 instead of 22.

### Required fix
Please check the **production deployment logs** in Vercel to find the actual error message, then fix it. Use:

1. `npx vercel logs product-tracer.vercel.app` — get the actual error
2. Fix the root cause (likely Root Directory config or env vars)
3. Redeploy: `npx vercel --prod`
4. Confirm the site loads at https://product-tracer.vercel.app

The previous fix you attempted (switching to transaction pooler) didn't resolve it — this is a different issue.
