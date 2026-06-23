/**
 * AI project summaries — backfill a 2-3 sentence DeepSeek summary per project.
 *
 * Projects carry only a short `one_liner` (often scraped from GitHub). This
 * pass enriches each with an LLM-written summary (what it does, who it's for,
 * why it's interesting) stored in `app.project.ai_summary` (migration 0013).
 *
 * `ai_summary IS NULL` is both the work queue and the done-marker: each run
 * grabs the next batch of unsummarised projects, so the job is idempotent and
 * resumable — re-running simply continues where it left off until the whole
 * backlog (~4k projects) is covered, a batch per daily run.
 *
 * One `callLlm` per project (plain completion, not JSON — the answer is prose).
 * Graceful no-op when LLM_API_KEY is unset (mirrors the collectors / llm-classify).
 *
 * Tunables (env):
 *   SUMMARY_BATCH       — projects per run (default 50).
 *   SUMMARY_CONCURRENCY — parallel LLM calls (default 1 = the original
 *                         sequential behaviour). Raise it only for a one-off
 *                         backfill: at 1 the ~4k backlog is ~3h of serial calls.
 *
 * Run from repo root: pnpm --filter @product-tracer/worker summaries:generate
 * Production cron: .github/workflows/generate-summaries.yml — daily 04:00 UTC.
 */
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { createSqlClient } from '@product-tracer/db';
import { callLlm, isLlmConfigured } from '../lib/llm.js';

const sql = createSqlClient();

// How many projects to summarise per run. Bounded so a single run stays cheap
// and well within the workflow timeout; the daily cron chews through the backlog.
const BATCH_SIZE = Number(process.env.SUMMARY_BATCH) || 50;
// Parallel LLM calls. Default 1 keeps the daily cron's exact serial behaviour;
// a backfill dispatch raises it. Clamped to [1, 16] so a stray value can't
// fan out unbounded. The DB pool (max 2) naturally serialises the UPDATEs.
const CONCURRENCY = Math.min(16, Math.max(1, Number(process.env.SUMMARY_CONCURRENCY) || 1));
// Cap completion length — a 2-3 sentence summary needs little headroom.
const MAX_TOKENS = 150;
// DeepSeek deepseek-chat list price (USD per 1M tokens, cache-miss).
const PRICE_IN_PER_1M = 0.14;
const PRICE_OUT_PER_1M = 0.28;

interface ProjectRow {
  id: string;
  name: string;
  one_liner: string | null;
  llm_category: string | null;
}

/** Build the summary prompt for one project. */
function buildPrompt(p: ProjectRow): string {
  const liner = p.one_liner?.trim() ? `${p.one_liner.trim()}.` : '';
  const category = p.llm_category?.trim() ? p.llm_category.trim() : 'unknown';
  return (
    `Write a 2-3 sentence summary of the project "${p.name}". ${liner} ` +
    `Category: ${category}. Focus on what it does, who it's for, and why it's ` +
    `interesting. Respond with only the summary text, no preamble.`
  );
}

async function main(): Promise<void> {
  if (!isLlmConfigured()) {
    console.warn('[summaries] LLM_API_KEY not set — skipping, nothing written.');
    return;
  }

  const remainingRows = await sql<{ remaining: number }[]>`
    select count(*)::int as remaining from app.project where ai_summary is null
  `;
  const remaining = remainingRows[0]?.remaining ?? 0;
  if (remaining === 0) {
    console.log('[summaries] No projects need summaries — all caught up.');
    return;
  }

  const projects = await sql<ProjectRow[]>`
    select id, name, one_liner, llm_category
    from app.project
    where ai_summary is null
    order by created_at desc
    limit ${BATCH_SIZE}
  `;

  console.log(
    `[summaries] ${remaining} projects pending; summarising ${projects.length} this run` +
      `${CONCURRENCY > 1 ? ` (concurrency ${CONCURRENCY})` : ''}.`,
  );

  let done = 0;
  let failed = 0;
  let promptTokens = 0;
  let completionTokens = 0;

  // Summarise one project. Counter mutations are safe to interleave: JS is
  // single-threaded, so `+=` between awaits never races.
  async function summarise(p: ProjectRow): Promise<void> {
    try {
      const res = await callLlm(buildPrompt(p), { maxTokens: MAX_TOKENS });
      if (res === null) return; // unconfigured — guarded above, treat as no-op
      const summary = res.content.trim();
      if (!summary) {
        failed++;
        console.warn(`[summaries] empty summary for ${p.id} (${p.name}) — skipping.`);
        return;
      }
      promptTokens += res.usage?.promptTokens ?? 0;
      completionTokens += res.usage?.completionTokens ?? 0;

      await sql`update app.project set ai_summary = ${summary} where id = ${p.id}`;
      done++;
      console.log(`[summaries] Generated ${done}/${projects.length} (${remaining} total pending).`);
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[summaries] failed for ${p.id} (${p.name}): ${message}`);
    }
  }

  // Worker-pool over a shared cursor: CONCURRENCY workers each pull the next
  // project until the batch is drained. At CONCURRENCY=1 this is exactly the
  // original serial loop.
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, projects.length) }, async () => {
      while (cursor < projects.length) {
        const p = projects[cursor++];
        if (p) await summarise(p);
      }
    }),
  );

  const cost =
    (promptTokens / 1_000_000) * PRICE_IN_PER_1M +
    (completionTokens / 1_000_000) * PRICE_OUT_PER_1M;

  console.log(
    `[summaries] ✓ ${done} summarised, ${failed} failed, ${remaining - done} still pending. ` +
      `Tokens in/out ${promptTokens}/${completionTokens} ≈ $${cost.toFixed(4)}.`,
  );
}

main()
  .catch((err) => {
    console.error('[summaries] Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
