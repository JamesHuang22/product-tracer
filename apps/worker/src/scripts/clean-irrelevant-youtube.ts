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
// ASCII keywords are matched whole-word (lowercased); CJK keywords are matched
// by substring (Chinese has no word boundaries). (TASK-024 + TASK-027)
const TECH_KEYWORDS_ASCII = [
  'ai', 'ml', 'llm', 'gpt', 'cloud', 'startup', 'code', 'coding', 'programming',
  'developer', 'devtool', 'tech', 'software', 'engineer', 'data', 'web', 'app',
  'product', 'security', 'saas', 'open source', 'open-source', 'framework', 'api',
  'agent', 'database', 'react', 'python', 'javascript', 'typescript', 'devops',
  'kubernetes', 'docker', 'model', 'neural', 'gpu', 'compiler', 'terminal',
];
const TECH_KEYWORDS_CJK = [
  '编程', '程序员', '开发者', '人工智能', '科技', '数据', '软件', '技术',
  '初创', '模型', '框架', '创业', '开源', '代码', '算法', '芯片', '安全',
];

// Strong non-tech markers (food vlogs, daily life, gossip, wellness). A hit means
// "not relevant" instantly — no LLM call. Only consulted when NO tech keyword
// matched, so health-tech / "健康科技" style content (which carries a tech
// keyword) is never wrongly flagged. (TASK-027)
const ANTI_KEYWORDS = [
  '吃的', '好吃的', '美食', '做饭', '菜谱', '生食', 'vlog', '日常', '闲聊',
  '养生', '健康', '情感', '生活',
];

interface Row {
  id: string;
  video_title: string | null;
  key_insight: string | null;
  topics: string[] | null;
  tools_mentioned: string[] | null;
}

function haystack(row: Row): string {
  return [
    row.video_title ?? '',
    row.key_insight ?? '',
    ...(Array.isArray(row.topics) ? row.topics : []),
    ...(Array.isArray(row.tools_mentioned) ? row.tools_mentioned : []),
  ].join(' ');
}

/** Tech signal: whole-word ASCII match OR CJK substring match. */
function hasTechKeyword(row: Row): boolean {
  const hay = haystack(row).toLowerCase();
  const ascii = TECH_KEYWORDS_ASCII.some((kw) => {
    const re = new RegExp(`(^|[^a-z])${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}([^a-z]|$)`);
    return re.test(hay);
  });
  if (ascii) return true;
  const cjkHay = haystack(row); // don't lowercase CJK
  return TECH_KEYWORDS_CJK.some((kw) => cjkHay.includes(kw));
}

/** Strong non-tech marker (food/daily-life/wellness) → flag without an LLM call. */
function hasAntiKeyword(row: Row): boolean {
  const hay = haystack(row).toLowerCase();
  return ANTI_KEYWORDS.some((kw) => hay.includes(kw.toLowerCase()));
}

const CJK_RE = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/;

/** Ask the LLM whether a borderline video is relevant. Uses a Chinese prompt
 *  when the insight is CJK so the model judges Chinese content correctly.
 *  Defaults to relevant on any ambiguity/failure so we never over-prune. */
async function llmIsRelevant(row: Row): Promise<boolean> {
  const text = `${row.video_title ?? ''}\n${row.key_insight ?? ''}`;
  const isChinese = CJK_RE.test(text);
  const prompt = isChinese
    ? [
        '这个视频是否与独立开发者、人工智能、创业或科技相关？只回答：是 或 否',
        `标题：${row.video_title ?? ''}`,
        `要点：${row.key_insight ?? ''}`,
      ].join('\n')
    : [
        'Is this video relevant to indie developers, AI, startups, or tech?',
        'Respond with ONLY one word: "yes" or "no".',
        `Title: ${row.video_title ?? ''}`,
        `Key insight: ${row.key_insight ?? ''}`,
      ].join('\n');
  const res = await callLlm(prompt, { temperature: 0, maxTokens: 8 });
  if (!res) return true; // unconfigured / skipped — leave as relevant
  const answer = res.content.trim().toLowerCase();
  // "否" (no) / "不" in Chinese, "no" in English → not relevant.
  if (answer.startsWith('no') || answer.includes('否') || answer.startsWith('不')) return false;
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
  let antiHits = 0;
  let llmCalls = 0;

  for (const row of rows) {
    let keep: boolean;
    if (hasTechKeyword(row)) {
      // Tech signal wins — keeps "健康科技"-style content from anti-keyword false flags.
      keep = true;
    } else if (hasAntiKeyword(row)) {
      // Clear non-tech marker (food vlog, daily life) — flag instantly, no LLM.
      keep = false;
      antiHits += 1;
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
      `${relevant} relevant, ${flagged} flagged non-tech ` +
      `(${antiHits} via anti-keyword, ${llmCalls} LLM call(s)).`,
  );
  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error('[clean-irrelevant-youtube] failed', err);
  process.exitCode = 1;
});
