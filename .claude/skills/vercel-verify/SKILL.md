---
name: vercel-verify
description: "Mandatory verification step after every code change. Use AFTER merging any PR into main — verify the Vercel deployment succeeded and the site returns HTTP 200. Also use after any git push to main to confirm the deployment is healthy."
---

# Vercel Deployment Verification

**Do this after EVERY merge to main, every git push, every feature/bugfix deployment.** Never skip.

## Step 1: Verify the Vercel deployment

The Vercel project is connected to the `main` branch via Git integration. After a push to main, Vercel automatically builds and deploys.

Check that the latest deployment succeeded:

```bash
curl -sI https://product-tracer.vercel.app/
```

**Expected:** `HTTP/2 200`

Wait up to 3 minutes and retry if you get a 502 or 504 (Vercel cold start).

## Step 2: Verify critical pages

After confirming the homepage works, check key routes:

```bash
# Homepage renders
curl -s -o /dev/null -w "HOME: %{http_code}\n" https://product-tracer.vercel.app/

# Projects page renders
curl -s -o /dev/null -w "PROJECTS: %{http_code}\n" https://product-tracer.vercel.app/projects

# YouTube insights page renders (if applicable)
curl -s -o /dev/null -w "INSIGHTS: %{http_code}\n" https://product-tracer.vercel.app/youtube-insights

# Trends page renders (if applicable)
curl -s -o /dev/null -w "TRENDS: %{http_code}\n" https://product-tracer.vercel.app/trends

# RSS feed (if applicable)
curl -s -o /dev/null -w "RSS: %{http_code}\n" https://product-tracer.vercel.app/feed/projects.xml
```

**Expected:** All return `200`.

## Step 3: Check response body is not empty

A 200 with an empty body is still broken:

```bash
# Check that the response has reasonable content length
curl -sI https://product-tracer.vercel.app/ | grep -i "content-length\|transfer-encoding"

# Check the page has real content
curl -s https://product-tracer.vercel.app/ | head -c 200
```

**Expected:** Content length > 1000 bytes, or `transfer-encoding: chunked` with meaningful HTML.

## Step 4: If deployment fails

1. Wait 60s and retry (Vercel build queue can lag)
2. If still failing after 3 retries:
   - Check if the last merge had a migration that wasn't applied
   - Check if there's a build error in Vercel dashboard
   - Check if the main branch has uncommitted migrations
   - Apply any pending migrations via Supabase MCP

## Step 5: Report result

If all checks pass, continue with the normal flow (clean up queue files, update CHANGELOG).

If any check fails, **DO NOT** mark the task as complete. Fix the issue first.
