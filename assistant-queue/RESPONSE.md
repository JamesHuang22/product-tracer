# Response: LLM Classification Pipeline ✅

Built and committed. The DeepSeek LLM is now wired to a real feature — it re-examines
the rule classifier's uncertain "gray zone" and confirms/rescues projects.

## Files created / changed

| File | What |
|------|------|
| `apps/worker/src/scripts/llm-classify.ts` | **New.** The classification script. |
| `.github/workflows/llm-classify.yml` | **New.** Daily cron at 06:30 UTC + manual dispatch. |
| `packages/db/migrations/0007_llm_classification.sql` | **New.** Adds LLM-tracking columns (idempotent). |
| `apps/worker/package.json` | Added `llm:classify` script. |

Untouched, as instructed: `apps/web/`, existing collectors/workflows, `assistant-queue/README.md`, `FRONTEND_RESPONSE.md`.

## How it works

1. **Find candidates.** Pulls every project that isn't `dead` and hasn't been LLM-classified
   yet (`llm_classified_at is null`). Recomputes each one's quality score with the *same*
   `assessProject()` the rule pass uses, then keeps only the **gray zone: score 15–39**.
2. **Classify in batches of 20.** Each batch is one DeepSeek call (`callLlm`, JSON mode) asking
   for `{id, status, category, confidence}` per project. Response is JSON-parsed and zod-validated;
   unknown categories collapse to `other`, confidence is clamped to 1–5.
3. **Apply the verdict.** Every examined project is stamped with `llm_status`, `llm_category`,
   `llm_confidence`, `llm_classified_at` (so it's never re-sent). When the model is confident
   (`confidence >= 3`) the rule `status` is updated:
   - `noise` verdict on an `active` project → **demote** to `noise`
   - `active` verdict on a `noise` project → **rescue** back to `active`
   - Category is back-filled only when the project had none (never clobbers existing data).
4. **Report.** Logs counts + token usage and writes a summary row to
   `raw.collector_error` (`platform='llm'`, `error_type='llm_classify_report'`) — same
   observability channel the quality pass uses.

Graceful no-op if `LLM_API_KEY` is unset (mirrors the collectors' auth pattern).

## ⚠️ Two deviations from the request (and why)

The request assumed a persisted `data_quality_score` column and a `status='active'` filter.
Neither matches the real schema/pipeline, so I adapted:

1. **`data_quality_score` doesn't exist.** The rule classifier computes the 0–100 score
   *in-memory* and only persists `status`. So I recompute the score with `assessProject()`
   rather than reading a column. No behavior lost.
2. **Gray zone is `active` *or* `noise`, not just `active`.** By the time this runs (06:30,
   after data-quality at 06:00), the rule pass has already demoted the *entire* gray zone to
   `noise`. Filtering to `active` only would make the script a permanent no-op. So it considers
   both — letting the LLM **rescue** genuine products the rules wrongly demoted *and* confirm
   real noise. If you'd rather it only demote (never rescue), say so and I'll narrow it.

## How to verify

1. **Apply the migration** (Supabase → SQL Editor → paste `0007_llm_classification.sql` → Run).
   It's idempotent. *(Required before first run — the script reads/writes the new columns.)*
2. **Confirm the secret** `LLM_API_KEY` is set (it is). Optionally `LLM_MODEL` / `LLM_BASE_URL`.
3. **Trigger manually:** GitHub → Actions → *LLM Classify* → *Run workflow*. Or locally with a
   filled `.env`: `pnpm --filter @product-tracer/worker llm:classify`.
4. **Check the log line:** `✓ Classified N/M: X demoted, Y rescued, Z low-confidence. Tokens in/out …`
5. **Inspect results:**
   ```sql
   select llm_status, llm_category, llm_confidence, count(*)
   from app.project where llm_classified_at is not null
   group by 1,2,3 order by 4 desc;

   select payload from raw.collector_error
   where platform='llm' order by occurred_at desc limit 1;
   ```

`pnpm --filter @product-tracer/worker typecheck` passes. A local end-to-end run wasn't possible
here (no local DB creds; the LLM key lives only in GitHub secrets) — the workflow dispatch above
is the smoke test.

## Token cost estimate per run

DeepSeek `deepseek-chat` list price: **$0.14 / 1M input, $0.28 / 1M output** (cache-miss).

- Prompt ≈ system + instructions + 20 projects of `{id,name,description}` ≈ **~1.5–2.5K input tokens/batch**.
- Output ≈ 20 compact verdicts ≈ **~600–900 output tokens/batch**.
- Per batch ≈ `2K×0.14 + 0.8K×0.28` per 1M ≈ **~$0.0005** (~0.05¢).
- A typical gray zone of a few hundred projects (≈10–25 batches) on the **first** run ≈ **$0.005–$0.02**.
- Steady state: only *newly-collected* gray-zone projects each day → usually **a handful of batches, well under a cent**.

Real per-run usage is logged (`prompt_tokens` / `completion_tokens` / `est_cost_usd`) in the
`raw.collector_error` summary so you can track actuals.
