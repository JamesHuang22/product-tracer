/**
 * Flag non-tech YouTube content so it drops out of /youtube-insights (TASK-024).
 *
 * The analysed-video table is `app.video_insight`. This pass classifies every
 * row with a key_insight as relevant or not to an indie-dev / AI / startup /
 * tech audience and writes `is_relevant` (migration 0021). A keyword fast-path
 * keeps obviously-technical rows relevant without an LLM call; only ambiguous
 * rows hit the model. Nothing is deleted — flagged rows are simply hidden by the
 * web queries (which filter `is_relevant`).
 *
 * Run on demand — secrets live in GitHub Actions:
 *   gh workflow run "Clean Irrelevant YouTube" --repo JamesHuang22/product-tracer
 * Graceful no-op when LLM_API_KEY is unset (leaves rows untouched).
 */
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { createSqlClient } from '@product-tracer/db';
import { callLlm, isLlmConfigured } from '../lib/llm.js';

const sql = createSqlClient();

// Obvious tech/indie-dev signals — a hit on any means "relevant", no LLM needed.
const TECH_KEYWORDS = [
  'ai', 'ml', 'llm', 'gpt', 'cloud', 'startup', 'code', 'coding', 'programming',
  'developer', 'devtool', 'tech', 'software', 'engineer', 'data', 'web', 'app',
  'product', 'security', 'saas', 'open source', 'open-source', 'framework', 'api',
  'agent', 'database', 'react', 'python', 'javascript', 'typescript', 'devops',
  'kubernetes', 'docker', 'model', 'neural', 'gpu', 'compiler', 'terminal',
];

interface Row {
  id: string;
  video_title: string | null;
  key_insight: string | null;
  topics: string[] | null;
  tools_mentioned: string[] | null;
}

/** Whole-word-ish keyword check over the row's text + json arrays. */
function hasTechKeyword(row: Row): boolean {
  const hay = [
    row.video_title ?? '',
    row.key_insight ?? '',
    ...(Array.isArray(row.topics) ? row.topics : []),
    ...(Array.isArray(row.tools_mentioned) ? row.tools_mentioned : []),
  ]
    .join(' ')
    .toLowerCase();
  return TECH_KEYWORDS.some((kw) => {
    const re = new RegExp(`(^|[^a-z])${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}([^a-z]|$)`);
    return re.test(hay);
  });
}

/** Ask the LLM whether a borderline video is relevant. Defaults to relevant on
 *  any ambiguity/failure so we never over-prune. */
async function llmIsRelevant(row: Row): Promise<boolean> {
  const prompt = [
    'Is this video relevant to indie developers, AI, startups, or tech?',
    'Respond with ONLY one word: "yes" or "no".',
    `Title: ${row.video_title ?? ''}`,
    `Key insight: ${row.key_insight ?? ''}`,
  ].join('\n');
  const res = await callLlm(prompt, { temperature: 0, maxTokens: 4 });
  if (!res) return true; // unconfigured / skipped — leave as relevant
  const answer = res.content.trim().toLowerCase();
  if (answer.startsWith('no')) return false;
  return true;
}

async function main() {
  if (!isLlmConfigured()) {
    console.warn('[clean-irrelevant-youtube] LLM_API_KEY not set — no-op.');
    await sql.end({ timeout: 5 });
    return;
  }

  const rows = await sql<Row[]>`
    select id, video_title, key_insight,
           coalesce(topics, '[]'::jsonb) as topics,
           coalesce(tools_mentioned, '[]'::jsonb) as tools_mentioned
    from app.video_insight
    where nullif(btrim(key_insight), '') is not null
    order by created_at desc
  `;

  let relevant = 0;
  let flagged = 0;
  let llmCalls = 0;

  for (const row of rows) {
    let keep = true;
    if (hasTechKeyword(row)) {
      keep = true;
    } else {
      llmCalls += 1;
      keep = await llmIsRelevant(row);
    }
    await sql`update app.video_insight set is_relevant = ${keep} where id = ${row.id}`;
    if (keep) relevant += 1;
    else flagged += 1;
  }

  console.log(
    `[clean-irrelevant-youtube] processed ${rows.length} row(s): ` +
      `${relevant} relevant, ${flagged} flagged non-tech (${llmCalls} LLM call(s)).`,
  );
  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error('[clean-irrelevant-youtube] failed', err);
  process.exitCode = 1;
});
