# Task: LLM Classification Pipeline — activate AI features

## Context
James added `LLM_API_KEY` (DeepSeek) to GitHub secrets. The LLM client (`apps/worker/src/lib/llm.ts`) is already built and tested — it's plumbing-only, no features write to it yet.

## What to do

### 1. Create LLM classification script
Write `apps/worker/src/scripts/llm-classify.ts`:
- Query `app.project` for projects where:
  - `data_quality_score` is between 15–39 (the "gray zone" — rule classifier marked as uncertain)
  - `status = 'active'` (not already noise)
  - Not yet classified by LLM (add a column or use a tracking table)
- Batch up to 20 projects per LLM call
- Call `callLlm()` from the existing client with a prompt like:
  ```
  Given these project names and descriptions, classify each as:
  - status: "active" (genuine product/dev tool) or "noise" (spam/placeholder/duplicate)
  - category: one of [ai/ml, devtool, saas, open-source, design, data, security, productivity, other]
  - confidence: 1-5 (5 = very confident)
  
  Input: JSON array of {id, name, description}
  Output: JSON array of {id, status, category, confidence}
  ```
- Update `app.project` table: set `data_quality_score` override or `status` to noise
- Log to console: count classified, noise found, cost estimate (token usage)

### 2. Create LLM classification workflow
Write `.github/workflows/llm-classify.yml`:
- Schedule: daily at 06:30 UTC (after `data-quality.yml` at 06:00)
- Trigger: manual too (`workflow_dispatch`)
- Environment: `LLM_API_KEY` from GitHub secrets
- Job: run the script via pnpm

### 3. DO NOT touch
- `apps/web/` — frontend is off-limits
- `assistant-queue/` — those files are for me
- Any existing collectors or workflows

### 4. After completion
Write RESPONSE.md summarizing what was created:
- File list
- How it works
- How to verify
- Token cost estimate per run

---

Execute. Write RESPONSE.md when done.
