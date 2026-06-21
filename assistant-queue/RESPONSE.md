# Response: AI-Powered Project Summaries — DONE ✅

Date: 2026-06-21
Agent: backend

## Summary
Shipped the AI project-summaries pipeline. **PR #40** merged to main; migration 0013 applied to prod; first batch of 50 summaries generated and verified. Production `/` is HTTP 200.

## What was built (3 files)
1. **`packages/db/migrations/0013_ai_summary.sql`** — `alter table app.project add column if not exists ai_summary text` (additive, nullable, idempotent). Applied to prod via Supabase MCP.
2. **`apps/worker/src/scripts/generate-summaries.ts`** — selects `where ai_summary is null limit 50` (`SUMMARY_BATCH` overridable), one `callLlm` per project (`maxTokens: 150`, plain prose), updates each row, prints `Generated X/N` progress, logs token cost. Graceful no-op when `LLM_API_KEY` is unset.
3. **`.github/workflows/generate-summaries.yml`** — daily `0 4 * * *` + `workflow_dispatch`.

Also: `summaries:generate` script in `apps/worker/package.json`; CHANGELOG + DECISIONS entries.

## Design decision — NULL column as work queue
`ai_summary IS NULL` is both the work queue and the done-marker, so the daily job is idempotent and resumable with zero extra bookkeeping. The ~4k backlog clears in batches of 50; new projects are picked up automatically once collected.

## Convention divergence from the request
The requested workflow used `npm i -g pnpm` / `pnpm build` / `pnpm worker generate-summaries`. There is no root `pnpm worker` command and `tsx` needs no build step, so I followed the repo's established workflow pattern (`pnpm/action-setup` + `pnpm --filter @product-tracer/worker summaries:generate`), matching `weekly-trend.yml` / `llm-classify.yml`.

## Verification
- `pnpm --filter @product-tracer/worker typecheck` ✅
- Migration 0013 applied to prod (Supabase MCP) — `ai_summary` column confirmed
- Backlog at start: **4176 projects, all NULL**
- Workflow `Generate AI Summaries` run on `main` → success → **50 summarised, 4126 pending** (exactly one batch, as designed)
- Sample output (coherent, on-spec 2-3 sentence summaries):
  - *Mira Gold's Writing Forge™* — "…a generative AI fiction tool that maintains narrative continuity across multiple formats—from novels to scripts to interactive dialogue… designed for writers, storytellers, and transmedia…"
- `curl -sI https://product-tracer.vercel.app/` → **200**

## Notes
- The remaining 4126 projects will be summarised automatically by the daily 04:00 UTC cron (50/day). To accelerate, bump `SUMMARY_BATCH` (GitHub secret/env) or run `gh workflow run generate-summaries.yml` repeatedly.
- Heads-up for the **frontend agent**: `app.project.ai_summary` is now populated (and growing daily) — ready to surface on project pages. NULL = not yet summarised; fall back to `one_liner`.
