/**
 * AI granular tags — backfill 3–5 short topical tags per project.
 *
 * On top of the single coarse `llm_category`, each project gets a handful of
 * specific tags (technologies / domains / use-cases, e.g. "cli", "rust",
 * "self-hosted", "llm") stored in `app.project.tags text[]` (migration 0015).
 * They render as clickable chips on cards / the detail page and drive
 * tag-based search & filtering.
 *
 * `tags IS NULL` is both the work queue and the done-marker: each run grabs the
 * next batch of un-tagged active projects, so the job is idempotent and
 * resumable. One JSON `callLlm` per project.
 *
 * Graceful no-op when LLM_API_KEY is unset (mirrors the other LLM scripts).
 *
 * Tunables (env):
 *   TAGS_BATCH       — projects per run (default 50).
 *   TAGS_CONCURRENCY — parallel LLM calls (default 1). Raise for a one-off backfill.
 *
 * Run from repo root: pnpm --filter @product-tracer/worker tags:generate
 * Production cron: .github/workflows/generate-tags.yml — daily 02:00 UTC.
 */
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { z } from 'zod';
import { createSqlClient } from '@product-tracer/db';
import { callLlm, isLlmConfigured } from '../lib/llm.js';

const sql = createSqlClient();

const BATCH_SIZE = Number(process.env.TAGS_BATCH) || 50;
// Parallel LLM calls. Default 1 = serial (daily-cron behaviour). Clamped [1,16].
const CONCURRENCY = Math.min(16, Math.max(1, Number(process.env.TAGS_CONCURRENCY) || 1));
const MAX_TOKENS = 80;
// How many tags we keep per project (model is asked for 3–5).
const MAX_TAGS = 5;
// DeepSeek deepseek-chat list price (USD per 1M tokens, cache-miss).
const PRICE_IN_PER_1M = 0.14;
const PRICE_OUT_PER_1M = 0.28;

interface ProjectRow {
  id: string;
  name: string;
  one_liner: string | null;
  llm_category: string | null;
}

const SYSTEM_PROMPT =
  'You are a precise software-project tagger. You label projects with short, ' +
  'specific topical tags a developer would filter by.';

// DeepSeek JSON mode forbids a top-level array, so wrap the tags in an object.
const TagsResponse = z.object({ tags: z.array(z.string()).default([]) });

function buildPrompt(p: ProjectRow): string {
  const liner = p.one_liner?.trim() ? `Description: ${p.one_liner.trim()}.` : '';
  const category = p.llm_category?.trim() ? p.llm_category.trim() : 'unknown';
  return [
    `Generate 3-5 short tags for the project "${p.name}".`,
    liner,
    `Category: ${category}.`,
    'Tags must be specific technologies, domains, languages, or use-cases',
    '(e.g. "cli", "rust", "self-hosted", "llm", "kubernetes", "real-time") —',
    'never generic words like "software", "tool", "app", or "project".',
    'Use lowercase single words or short hyphenated phrases.',
    'Respond ONLY as JSON: {"tags": ["tag1","tag2",...]}.',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Lowercase, trim, dedupe, drop junk, cap length — keep at most MAX_TAGS. */
function normalizeTags(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const tag = t
      .toLowerCase()
      .trim()
      .replace(/^[#"']+|["']+$/g, '') // strip stray leading # / quotes
      .replace(/\s+/g, '-');
    if (!tag || tag.length > 30 || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

async function main(): Promise<void> {
  if (!isLlmConfigured()) {
    console.warn('[tags] LLM_API_KEY not set — skipping, nothing written.');
    return;
  }

  const remainingRows = await sql<{ remaining: number }[]>`
    select count(*)::int as remaining
    from app.project
    where tags is null and status = 'active' and merged_into_id is null
  `;
  const remaining = remainingRows[0]?.remaining ?? 0;
  if (remaining === 0) {
    console.log('[tags] No projects need tags — all caught up.');
    return;
  }

  const projects = await sql<ProjectRow[]>`
    select id, name, one_liner, llm_category
    from app.project
    where tags is null and status = 'active' and merged_into_id is null
    order by created_at desc
    limit ${BATCH_SIZE}
  `;

  console.log(
    `[tags] ${remaining} projects pending; tagging ${projects.length} this run` +
      `${CONCURRENCY > 1 ? ` (concurrency ${CONCURRENCY})` : ''}.`,
  );

  let done = 0;
  let failed = 0;
  let empty = 0;
  let promptTokens = 0;
  let completionTokens = 0;

  async function tagOne(p: ProjectRow): Promise<void> {
    try {
      const res = await callLlm(buildPrompt(p), {
        systemPrompt: SYSTEM_PROMPT,
        json: true,
        maxTokens: MAX_TOKENS,
      });
      if (res === null) return; // unconfigured — guarded above
      promptTokens += res.usage?.promptTokens ?? 0;
      completionTokens += res.usage?.completionTokens ?? 0;

      let parsed: { tags: string[] };
      try {
        const stripped = res.content
          .trim()
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/, '');
        parsed = TagsResponse.parse(JSON.parse(stripped));
      } catch {
        failed++;
        console.warn(`[tags] unparseable tags for ${p.id} (${p.name}) — skipping.`);
        return;
      }

      const tags = normalizeTags(parsed.tags);
      if (tags.length === 0) empty++;

      // Store even an empty array so the project is marked done (tags IS NOT
      // NULL) and not retried forever.
      await sql`update app.project set tags = ${tags} where id = ${p.id}`;
      done++;
      console.log(
        `[tags] ${done}/${projects.length} (${remaining} pending) ${p.name}: [${tags.join(', ')}]`,
      );
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[tags] failed for ${p.id} (${p.name}): ${message}`);
    }
  }

  // Worker-pool over a shared cursor (CONCURRENCY=1 ⇒ original serial loop).
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, projects.length) }, async () => {
      while (cursor < projects.length) {
        const p = projects[cursor++];
        if (p) await tagOne(p);
      }
    }),
  );

  const cost =
    (promptTokens / 1_000_000) * PRICE_IN_PER_1M +
    (completionTokens / 1_000_000) * PRICE_OUT_PER_1M;

  console.log(
    `[tags] ✓ ${done} tagged (${empty} empty), ${failed} failed, ${remaining - done} still pending. ` +
      `Tokens in/out ${promptTokens}/${completionTokens} ≈ $${cost.toFixed(4)}.`,
  );
}

main()
  .catch((err) => {
    console.error('[tags] Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
