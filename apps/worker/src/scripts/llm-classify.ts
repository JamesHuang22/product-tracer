/**
 * LLM Classification pipeline — resolve the rule classifier's "gray zone".
 *
 * The rule-based data-quality pass (run-quality-check.ts) scores every project
 * 0–100 and demotes anything below KEEP_THRESHOLD (40) to status='noise'. The
 * band just below that line — score 15–39 — is where the rules are least sure:
 * genuine-but-low-signal products and outright spam look alike. This script
 * hands that band to an LLM (DeepSeek by default) for a second opinion, then:
 *
 *   - LLM says 'noise'  → demote to status='noise'   (confirm)
 *   - LLM says 'active' → restore to status='active' (rescue a wrongly-demoted product)
 *
 * Every examined project is stamped with the model's verdict (llm_status,
 * llm_category, llm_confidence, llm_classified_at) so the pass is idempotent —
 * a project is never sent to the LLM twice. Status is only changed when the
 * model is reasonably sure (confidence >= ACT_CONFIDENCE).
 *
 * NOTE ON SCOPE vs. the request: the request asked to query a persisted
 * `data_quality_score` column and restrict to status='active'. That column
 * doesn't exist — the rule classifier computes the score in-memory and only
 * persists `status`. So we recompute the score here with the same
 * assessProject() the rule pass uses, and we consider the *whole* gray zone
 * (active OR noise), not just active. Restricting to active would make this a
 * permanent no-op, because the rule pass has already demoted the entire gray
 * zone to noise by the time this runs. See RESPONSE.md for the rationale.
 *
 * Graceful no-op when LLM_API_KEY is unset (mirrors the collectors' auth checks).
 *
 * Run from repo root: pnpm --filter @product-tracer/worker llm:classify
 * Production cron: .github/workflows/llm-classify.yml daily at UTC 06:30
 * (after data-quality.yml at 06:00).
 */
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { z } from 'zod';
import { createSqlClient } from '@product-tracer/db';
import { callLlm, isLlmConfigured, type LlmUsage } from '../lib/llm.js';
import {
  assessProject,
  type AssessIdentityLink,
  type AssessSnapshot,
} from '../quality/classifier.js';

const sql = createSqlClient();

// Gray zone: the score band where the rule classifier is least confident.
const GRAY_ZONE_MIN = 15;
const GRAY_ZONE_MAX = 39;
// How many projects to classify in a single LLM call.
const BATCH_SIZE = 20;
// Only act on (change status of) a project when the model is at least this sure.
const ACT_CONFIDENCE = 3;
// DeepSeek deepseek-chat list price (USD per 1M tokens, cache-miss).
const PRICE_IN_PER_1M = 0.14;
const PRICE_OUT_PER_1M = 0.28;

const CATEGORIES = [
  'ai/ml',
  'devtool',
  'saas',
  'open-source',
  'design',
  'data',
  'security',
  'productivity',
  'other',
] as const;

interface ProjectRow {
  id: string;
  name: string;
  one_liner: string | null;
  category: string | null;
  status: string;
}

// The model returns a JSON object (DeepSeek JSON mode forbids a top-level
// array), so we wrap the verdicts in a `results` key. Unknown categories are
// coerced to 'other'; out-of-range confidence is clamped on read.
const Verdict = z.object({
  id: z.string(),
  status: z.enum(['active', 'noise']),
  category: z
    .string()
    .transform((c) => c.trim().toLowerCase())
    .pipe(z.enum(CATEGORIES).catch('other')),
  confidence: z.coerce.number().int().min(1).max(5).catch(3),
});
const ClassifyResponse = z.object({ results: z.array(Verdict) });

const SYSTEM_PROMPT =
  'You are a precise product-catalog curator. You classify software projects ' +
  'scraped from GitHub, Product Hunt, Hacker News, Reddit, X and YouTube. ' +
  'Distinguish genuine products / developer tools from spam, placeholders, ' +
  'tutorials, dotfiles and duplicates.';

function buildPrompt(batch: ProjectRow[]): string {
  const input = batch.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.one_liner ?? '',
  }));
  return [
    'Classify each project below. For every input item return one result with:',
    '- status: "active" (genuine product / dev tool) or "noise" (spam / placeholder / tutorial / duplicate)',
    `- category: exactly one of [${CATEGORIES.join(', ')}]`,
    '- confidence: integer 1-5 (5 = very confident)',
    '',
    'Return ONLY a JSON object of the form {"results": [{"id","status","category","confidence"}, ...]}.',
    'Echo each id back exactly. Include every input id once.',
    '',
    `Input: ${JSON.stringify(input)}`,
  ].join('\n');
}

const JSON_INSTRUCTION =
  'Respond ONLY with a single valid JSON object. No prose, no markdown code fences.';

/**
 * Classify one batch. We call the raw callLlm (not callLlmJson) so we can read
 * back token `usage` for the cost estimate, then parse + validate the JSON
 * ourselves — same fence-tolerant logic callLlmJson uses internally.
 */
async function classifyBatch(
  batch: ProjectRow[],
): Promise<{ results: z.infer<typeof ClassifyResponse>['results']; usage: LlmUsage | null } | null> {
  const res = await callLlm(buildPrompt(batch), {
    systemPrompt: `${SYSTEM_PROMPT}\n\n${JSON_INSTRUCTION}`,
    json: true,
    maxTokens: 2048,
    temperature: 0.1,
  });
  if (res === null) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(res.content);
  } catch {
    const stripped = res.content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    raw = JSON.parse(stripped);
  }
  return { results: ClassifyResponse.parse(raw).results, usage: res.usage };
}

async function main(): Promise<void> {
  if (!isLlmConfigured()) {
    console.warn('[llm-classify] LLM_API_KEY not set — nothing to do, exiting cleanly.');
    return;
  }

  // Pull every not-yet-LLM-classified project that the rules haven't killed
  // ('dead'), plus the snapshots and links needed to recompute its score. One
  // query each, grouped in memory — avoids an N+1 storm (same shape as the
  // rule pass).
  const projects = await sql<ProjectRow[]>`
    select id, name, one_liner, category, status
    from app.project
    where status <> 'dead'
      and llm_classified_at is null
  `;

  if (projects.length === 0) {
    console.log('[llm-classify] No unclassified projects. Nothing to do.');
    return;
  }

  const projectIds = projects.map((p) => p.id);
  const snapshotRows = await sql<({ project_id: string } & AssessSnapshot)[]>`
    select project_id, platform, upvotes, comments, stars, forks
    from raw.snapshot
    where project_id = any(${projectIds})
  `;
  const linkRows = await sql<({ project_id: string } & AssessIdentityLink)[]>`
    select project_id, platform from app.identity_link
    where project_id = any(${projectIds})
  `;

  const snapshotsByProject = new Map<string, AssessSnapshot[]>();
  for (const row of snapshotRows) {
    const list = snapshotsByProject.get(row.project_id) ?? [];
    list.push(row);
    snapshotsByProject.set(row.project_id, list);
  }
  const linksByProject = new Map<string, AssessIdentityLink[]>();
  for (const row of linkRows) {
    const list = linksByProject.get(row.project_id) ?? [];
    list.push(row);
    linksByProject.set(row.project_id, list);
  }

  // Default: only the gray zone — the score band where the rule classifier is
  // least confident — so the cheap daily run spends LLM budget where it helps.
  //
  // LLM_CLASSIFY_ALL=1: a one-off backfill mode that classifies *every* active
  // unclassified project, not just the gray zone. This exists because the rules
  // never assign `llm_category` to confidently-scored projects, so ~97% of the
  // catalogue has no category — which starves related-projects, the trends
  // category chart, and search ranking. The pass still only demotes a project
  // when the model is confident it's noise (so it doubles as a quality prune),
  // and `llm_category` is written for every project it touches.
  const classifyAll = ['1', 'true'].includes((process.env.LLM_CLASSIFY_ALL ?? '').toLowerCase());
  const candidates = classifyAll
    ? projects.filter((p) => p.status === 'active')
    : projects.filter((p) => {
        const { score } = assessProject(
          p,
          snapshotsByProject.get(p.id) ?? [],
          linksByProject.get(p.id) ?? [],
        );
        return score >= GRAY_ZONE_MIN && score <= GRAY_ZONE_MAX;
      });

  console.log(
    classifyAll
      ? `[llm-classify] ALL-mode backfill: ${candidates.length} active unclassified ` +
          `projects (of ${projects.length} total).`
      : `[llm-classify] ${projects.length} unclassified projects; ` +
          `${candidates.length} in the gray zone (score ${GRAY_ZONE_MIN}–${GRAY_ZONE_MAX}).`,
  );
  if (candidates.length === 0) {
    console.log('[llm-classify] No projects to classify.');
    return;
  }

  const byId = new Map(candidates.map((p) => [p.id, p]));
  let classified = 0;
  let demoted = 0;
  let rescued = 0;
  let lowConfidence = 0;
  let promptTokens = 0;
  let completionTokens = 0;

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const batchNo = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(candidates.length / BATCH_SIZE);

    let batchResult: Awaited<ReturnType<typeof classifyBatch>>;
    try {
      batchResult = await classifyBatch(batch);
    } catch (err) {
      // One bad batch shouldn't sink the whole run — log and move on. These
      // projects stay unclassified and get retried next run.
      console.error(`[llm-classify] batch ${batchNo}/${totalBatches} failed:`, err);
      continue;
    }
    if (batchResult === null) {
      console.warn('[llm-classify] LLM returned null mid-run — stopping.');
      break;
    }

    if (batchResult.usage) {
      promptTokens += batchResult.usage.promptTokens;
      completionTokens += batchResult.usage.completionTokens;
    }

    for (const verdict of batchResult.results) {
      const project = byId.get(verdict.id);
      // The model can hallucinate an id or echo one back twice — ignore anything
      // that isn't a project we actually asked about and haven't handled yet.
      if (!project) continue;
      byId.delete(verdict.id);

      const act = verdict.confidence >= ACT_CONFIDENCE;
      let newStatus = project.status;
      if (act) {
        if (verdict.status === 'noise' && project.status === 'active') {
          newStatus = 'noise';
          demoted++;
        } else if (verdict.status === 'active' && project.status === 'noise') {
          newStatus = 'active';
          rescued++;
        }
      } else {
        lowConfidence++;
      }

      // Stamp the verdict (always) and the possibly-updated status in one write.
      // Backfill category only when the project has none — never clobber an
      // existing rule/collector category.
      await sql`
        update app.project set
          status            = ${newStatus},
          llm_status        = ${verdict.status},
          llm_category      = ${verdict.category},
          llm_confidence    = ${verdict.confidence},
          llm_classified_at = now(),
          category          = coalesce(category, ${verdict.category})
        where id = ${verdict.id}
      `;
      classified++;
    }
  }

  const inputCost = (promptTokens / 1_000_000) * PRICE_IN_PER_1M;
  const outputCost = (completionTokens / 1_000_000) * PRICE_OUT_PER_1M;
  const totalCost = inputCost + outputCost;

  const summary = {
    mode: classifyAll ? 'all' : 'gray_zone',
    candidates: candidates.length,
    classified,
    demoted_to_noise: demoted,
    rescued_to_active: rescued,
    skipped_low_confidence: lowConfidence,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    est_cost_usd: Number(totalCost.toFixed(6)),
    batch_size: BATCH_SIZE,
  };

  await sql`
    insert into raw.collector_error (platform, error_type, payload)
    values ('llm', 'llm_classify_report', ${sql.json(summary)})
  `;

  console.log(
    `[llm-classify] ✓ Classified ${classified}/${candidates.length}: ` +
      `${demoted} demoted, ${rescued} rescued, ${lowConfidence} low-confidence. ` +
      `Tokens in/out ${promptTokens}/${completionTokens} ≈ $${totalCost.toFixed(4)}.`,
  );
}

main()
  .catch((err) => {
    console.error('[llm-classify] Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
