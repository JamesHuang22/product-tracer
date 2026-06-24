/**
 * Dedup pipeline — collapse near-duplicate projects and video insights.
 *
 * The collectors pull from 5+ platforms, so the same product surfaces under
 * several slugs/names and the same story can be covered by multiple videos. This
 * daily pass finds candidate duplicate pairs cheaply (normalised URL / name /
 * title keys), asks DeepSeek to confirm each pair, and merges the confirmed ones
 * into a single keeper — re-pointing identity_links and snapshots so no
 * cross-platform evidence or engagement history is lost.
 *
 * Flow each run (daily, 03:00 UTC):
 *   1. Candidates — group active rows by normalised key, pair within each group:
 *        - projects: same normalised primary_url, or same normalised name key
 *        - insights: same normalised video_title key (different video_id)
 *   2. LLM check — one DeepSeek call per pair → {is_duplicate, confidence, reason}.
 *   3. Merge — confidence ≥ MERGE_CONFIDENCE: fold the newer/poorer row into the
 *        keeper (dedup_status='merged', merged_into_id), re-point identity_link +
 *        raw.snapshot (projects only). 0.5 ≤ confidence < MERGE_CONFIDENCE: flag
 *        as 'duplicate_candidate' for human review. Below that: leave active.
 *   4. Report — summary row to raw.collector_error (error_type='dedup_report').
 *
 * Bounded by MAX_PAIRS (LLM calls/run). Graceful no-op when LLM_API_KEY is unset
 * (mirrors the collectors' auth checks). Requires migration 0011_dedup.sql.
 *
 * Run from repo root: pnpm dedup
 * Production cron: .github/workflows/dedup.yml (daily 03:00 UTC).
 */
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { z } from 'zod';
import { createSqlClient } from '@product-tracer/db';
import { callLlm, isLlmConfigured, type LlmUsage } from '../lib/llm.js';

const sql = createSqlClient();

/** Max LLM calls (= candidate pairs) per run; override with DEDUP_MAX_PAIRS. */
const MAX_PAIRS = Math.max(1, Number(process.env.DEDUP_MAX_PAIRS) || 80);
/** Confirm + merge at/above this confidence; flag for review at/above REVIEW. */
const MERGE_CONFIDENCE = 0.8;
const REVIEW_CONFIDENCE = 0.5;
// DeepSeek deepseek-chat list price (USD per 1M tokens, cache-miss).
const PRICE_IN_PER_1M = 0.14;
const PRICE_OUT_PER_1M = 0.28;

// Generic tokens that carry no identity — dropped when building a name/title key.
const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'app',
  'ai',
  'io',
  'official',
  'for',
  'and',
  'of',
  'to',
  'in',
  'project',
  'tool',
  'tools',
  'free',
  'online',
  'best',
  'new',
  'open',
  'source',
  'github',
  'com',
  'review',
  'video',
  'tutorial',
  'how',
  'with',
  'your',
]);

/** Normalise a URL to host+path (no protocol / www / trailing slash / query). */
function normalizeUrl(url: string | null): string | null {
  if (!url) return null;
  const raw = url.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    const path = u.pathname.replace(/\/+$/, '').toLowerCase();
    return `${host}${path}` || null;
  } catch {
    return raw
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '');
  }
}

/** Normalise free text to a stable identity key, dropping generic stopwords. */
function textKey(text: string | null): string | null {
  if (!text) return null;
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, ' ')
    .split(' ')
    .filter((t) => t && !STOPWORDS.has(t));
  const key = tokens.join('');
  // Too short → too generic to be a reliable grouping signal.
  return key.length >= 4 ? key : null;
}

interface ProjectRow {
  id: string;
  slug: string;
  name: string;
  one_liner: string | null;
  primary_url: string | null;
  created_at: string;
  link_count: number;
  llm_category: string | null;
}

/**
 * Sørensen–Dice similarity on character bigrams of the normalised names
 * (0 = nothing in common, 1 = identical). Dependency-free; used to gate
 * name-only duplicate candidates so unrelated projects that merely share a
 * generic name token aren't sent to the LLM.
 */
export function nameSimilarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return 0;
  const bigrams = (s: string): Map<string, number> => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  };
  const bx = bigrams(x);
  const by = bigrams(y);
  let inter = 0;
  for (const [g, c] of bx) {
    const d = by.get(g);
    if (d) inter += Math.min(c, d);
  }
  return (2 * inter) / (x.length - 1 + (y.length - 1));
}

/**
 * Stricter gate for name-only duplicate candidates (URL matches stay trusted):
 * keep the pair only when the two share the same LLM category, or their names
 * are highly similar (Dice > 0.8). Cuts false positives from projects that
 * merely collide on a generic name key.
 */
function namePairLikelyDuplicate(a: ProjectRow, b: ProjectRow): boolean {
  if (a.llm_category && b.llm_category && a.llm_category === b.llm_category) return true;
  return nameSimilarity(a.name, b.name) > 0.8;
}

interface InsightRow {
  id: string;
  video_id: string;
  video_title: string;
  key_insight: string | null;
  channel_title: string;
  created_at: string;
}

interface Pair<T> {
  a: T;
  b: T;
}

/**
 * Build candidate pairs from a key→items grouping. Within each group we pair
 * every distinct combination (groups are normally tiny). De-duped across keys by
 * a canonical "idA|idB" signature so a pair found by two keys is checked once.
 */
function pairsFromGroups<T extends { id: string }>(
  groups: Map<string, T[]>,
  seen: Set<string>,
  out: Pair<T>[],
): void {
  for (const items of groups.values()) {
    if (items.length < 2) continue;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]!;
        const b = items[j]!;
        const sig = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
        if (seen.has(sig)) continue;
        seen.add(sig);
        out.push({ a, b });
      }
    }
  }
}

function groupBy<T>(items: T[], key: (t: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!k) continue;
    const list = map.get(k) ?? [];
    list.push(item);
    map.set(k, list);
  }
  return map;
}

// ---------------------------------------------------------------------------
// LLM duplicate check
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT =
  'You are a deduplication classifier for a product/insight catalog. Given two ' +
  'database entries, decide whether they refer to the SAME underlying product (or ' +
  'the same story/insight). Different products from the same company, or different ' +
  'videos on the same broad topic, are NOT duplicates — only true same-entity pairs ' +
  'are. Respond ONLY with a single JSON object, no prose or code fences.';

const Verdict = z.object({
  is_duplicate: z.coerce.boolean().catch(false),
  confidence: z.coerce.number().min(0).max(1).catch(0),
  reason: z.string().trim().catch('').default(''),
});
type Verdict = z.infer<typeof Verdict>;

function projectPrompt(a: ProjectRow, b: ProjectRow): string {
  const fmt = (p: ProjectRow) =>
    `name="${p.name}", url="${p.primary_url ?? ''}", description="${p.one_liner ?? ''}"`;
  return [
    'Are these two PROJECTS the same product?',
    `Entry A: ${fmt(a)}`,
    `Entry B: ${fmt(b)}`,
    'Return {"is_duplicate": boolean, "confidence": 0.0-1.0, "reason": "short"}.',
  ].join('\n');
}

function insightPrompt(a: InsightRow, b: InsightRow): string {
  const fmt = (p: InsightRow) =>
    `channel="${p.channel_title}", title="${p.video_title}", insight="${(p.key_insight ?? '').slice(0, 400)}"`;
  return [
    'Do these two VIDEO INSIGHTS cover the same specific product/story (near-duplicate)?',
    `Entry A: ${fmt(a)}`,
    `Entry B: ${fmt(b)}`,
    'Return {"is_duplicate": boolean, "confidence": 0.0-1.0, "reason": "short"}.',
  ].join('\n');
}

async function classifyPair(
  prompt: string,
): Promise<{ verdict: Verdict; usage: LlmUsage | null } | null> {
  const res = await callLlm(prompt, {
    systemPrompt: SYSTEM_PROMPT,
    json: true,
    maxTokens: 256,
    temperature: 0,
  });
  if (res === null) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(res.content);
  } catch {
    raw = JSON.parse(
      res.content
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim(),
    );
  }
  return { verdict: Verdict.parse(raw), usage: res.usage };
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

/** Keep the row with more cross-platform links; tie-break the older one. */
function chooseKeeper(a: ProjectRow, b: ProjectRow): { keeper: ProjectRow; merged: ProjectRow } {
  if (a.link_count !== b.link_count) {
    return a.link_count > b.link_count ? { keeper: a, merged: b } : { keeper: b, merged: a };
  }
  return a.created_at <= b.created_at ? { keeper: a, merged: b } : { keeper: b, merged: a };
}

/**
 * Fold `merged` project into `keeper`: re-point identity_link + snapshot, then
 * stamp the merge. The global unique(platform, external_id) on identity_link means
 * the two projects can never share a link, so re-pointing never collides.
 */
async function mergeProjects(keeper: ProjectRow, merged: ProjectRow): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`update app.identity_link set project_id = ${keeper.id} where project_id = ${merged.id}`;
    await tx`update raw.snapshot set project_id = ${keeper.id} where project_id = ${merged.id}`;
    await tx`
      update app.project
      set dedup_status = 'merged', merged_into_id = ${keeper.id}
      where id = ${merged.id}
    `;
  });
}

async function mergeInsights(keeper: InsightRow, merged: InsightRow): Promise<void> {
  await sql`
    update app.video_insight
    set dedup_status = 'merged', merged_into_id = ${keeper.id}
    where id = ${merged.id}
  `;
}

async function flagProject(id: string): Promise<void> {
  await sql`update app.project set dedup_status = 'duplicate_candidate' where id = ${id} and dedup_status = 'active'`;
}
async function flagInsight(id: string): Promise<void> {
  await sql`update app.video_insight set dedup_status = 'duplicate_candidate' where id = ${id} and dedup_status = 'active'`;
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!isLlmConfigured()) {
    console.warn('[dedup] LLM_API_KEY not set — nothing to do, exiting cleanly.');
    return;
  }

  // --- Load active rows -------------------------------------------------
  const projects = await sql<ProjectRow[]>`
    select p.id, p.slug, p.name, p.one_liner, p.primary_url, p.created_at, p.llm_category,
      (select count(*)::int from app.identity_link il where il.project_id = p.id) as link_count
    from app.project p
    where coalesce(p.dedup_status, 'active') = 'active' and p.status <> 'dead'
  `;
  const insights = await sql<InsightRow[]>`
    select id, video_id, video_title, key_insight, channel_title, created_at
    from app.video_insight
    where coalesce(dedup_status, 'active') = 'active'
  `;

  // --- Candidate pairs --------------------------------------------------
  // URL matches are trusted as-is; name-only matches go through the stricter
  // same-category / high-similarity gate to cut false positives.
  const projectPairs: Pair<ProjectRow>[] = [];
  const projSeen = new Set<string>();
  pairsFromGroups(
    groupBy(projects, (p) => normalizeUrl(p.primary_url)),
    projSeen,
    projectPairs,
  );
  const namePairs: Pair<ProjectRow>[] = [];
  pairsFromGroups(groupBy(projects, (p) => textKey(p.name)), projSeen, namePairs);
  const keptNamePairs = namePairs.filter(({ a, b }) => namePairLikelyDuplicate(a, b));
  for (const pair of keptNamePairs) projectPairs.push(pair);
  console.log(
    `[dedup] name-key pairs: ${namePairs.length} → ${keptNamePairs.length} after ` +
      `same-category / similarity>0.8 gate (-${namePairs.length - keptNamePairs.length}).`,
  );

  const insightPairs: Pair<InsightRow>[] = [];
  const insSeen = new Set<string>();
  pairsFromGroups(
    groupBy(insights, (i) => textKey(i.video_title)),
    insSeen,
    insightPairs,
  );

  const totalCandidates = projectPairs.length + insightPairs.length;
  console.log(
    `[dedup] ${projects.length} projects, ${insights.length} insights → ` +
      `${projectPairs.length} project + ${insightPairs.length} insight candidate pairs ` +
      `(cap ${MAX_PAIRS}).`,
  );
  if (totalCandidates === 0) {
    console.log('[dedup] No candidate pairs. Nothing to do.');
    return;
  }

  // --- Classify + act (projects first, then insights) -------------------
  const handled = new Set<string>(); // ids already merged/flagged — skip later pairs
  let pairsChecked = 0;
  let projectsMerged = 0;
  let insightsMerged = 0;
  let flagged = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let budget = MAX_PAIRS;

  for (const { a, b } of projectPairs) {
    if (budget <= 0) break;
    if (handled.has(a.id) || handled.has(b.id)) continue;
    budget--;
    let result: Awaited<ReturnType<typeof classifyPair>>;
    try {
      result = await classifyPair(projectPrompt(a, b));
    } catch (err) {
      console.error(`[dedup] project pair ${a.slug}/${b.slug} failed:`, err);
      continue;
    }
    if (result === null) {
      console.warn('[dedup] LLM returned null mid-run — stopping.');
      break;
    }
    pairsChecked++;
    if (result.usage) {
      promptTokens += result.usage.promptTokens;
      completionTokens += result.usage.completionTokens;
    }
    const { is_duplicate, confidence } = result.verdict;
    if (is_duplicate && confidence >= MERGE_CONFIDENCE) {
      const { keeper, merged } = chooseKeeper(a, b);
      await mergeProjects(keeper, merged);
      handled.add(merged.id);
      projectsMerged++;
    } else if (is_duplicate && confidence >= REVIEW_CONFIDENCE) {
      await flagProject(b.id);
      handled.add(b.id);
      flagged++;
    }
  }

  for (const { a, b } of insightPairs) {
    if (budget <= 0) break;
    if (handled.has(a.id) || handled.has(b.id)) continue;
    budget--;
    let result: Awaited<ReturnType<typeof classifyPair>>;
    try {
      result = await classifyPair(insightPrompt(a, b));
    } catch (err) {
      console.error(`[dedup] insight pair ${a.video_id}/${b.video_id} failed:`, err);
      continue;
    }
    if (result === null) {
      console.warn('[dedup] LLM returned null mid-run — stopping.');
      break;
    }
    pairsChecked++;
    if (result.usage) {
      promptTokens += result.usage.promptTokens;
      completionTokens += result.usage.completionTokens;
    }
    const { is_duplicate, confidence } = result.verdict;
    if (is_duplicate && confidence >= MERGE_CONFIDENCE) {
      // Keep the earlier insight as canonical.
      const keeper = a.created_at <= b.created_at ? a : b;
      const merged = keeper === a ? b : a;
      await mergeInsights(keeper, merged);
      handled.add(merged.id);
      insightsMerged++;
    } else if (is_duplicate && confidence >= REVIEW_CONFIDENCE) {
      await flagInsight(b.id);
      handled.add(b.id);
      flagged++;
    }
  }

  const totalCost =
    (promptTokens / 1_000_000) * PRICE_IN_PER_1M +
    (completionTokens / 1_000_000) * PRICE_OUT_PER_1M;

  const summary = {
    project_candidates: projectPairs.length,
    insight_candidates: insightPairs.length,
    pairs_checked: pairsChecked,
    projects_merged: projectsMerged,
    insights_merged: insightsMerged,
    flagged_for_review: flagged,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    est_cost_usd: Number(totalCost.toFixed(6)),
    max_pairs: MAX_PAIRS,
  };
  await sql`
    insert into raw.collector_error (platform, error_type, payload)
    values ('dedup', 'dedup_report', ${sql.json(summary)})
  `;

  console.log(
    `[dedup] ✓ Checked ${pairsChecked} pairs: ${projectsMerged} projects + ` +
      `${insightsMerged} insights merged, ${flagged} flagged. ` +
      `Tokens in/out ${promptTokens}/${completionTokens} ≈ $${totalCost.toFixed(4)}.`,
  );
}

main()
  .catch((err) => {
    console.error('[dedup] Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
