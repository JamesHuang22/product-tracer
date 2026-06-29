/**
 * Weekly Hot Trends pipeline — aggregate the past 7 days, then summarise with an LLM.
 *
 * The /trends page (PR #29) renders the latest row of app.weekly_trend, but the
 * data pipeline that fills it didn't exist. This script is that pipeline: every
 * Monday (or on demand) it scans everything collected in the trailing 7 days —
 * new projects, signal activity per project, and high-relevance video insights —
 * formats a compact corpus, and asks DeepSeek to distil a structured report:
 *
 *   summary_en / summary_zh — 3-4 sentence bilingual overview of the week
 *   emerging_themes         — keyword themes describing this week's hot topics
 *   video_highlights        — 1-2 sentence note on notable video coverage
 *
 * The result is upserted keyed on week_start (date_trunc('week', now())), so a
 * re-run for the same week overwrites in place rather than duplicating. Token
 * usage is captured (we use the raw callLlm, not callLlmJson, so we can read
 * `usage`) and stored alongside the raw model JSON for audit.
 *
 * Graceful no-op when LLM_API_KEY is unset (mirrors the collectors' auth checks
 * and llm-classify.ts) — nothing is written, exit 0.
 *
 * Run from repo root: pnpm --filter @product-tracer/worker weekly:trend
 * Production cron: .github/workflows/weekly-trend.yml — Mondays at UTC 04:00.
 */
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { z } from 'zod';
import { createSqlClient } from '@product-tracer/db';
import { callLlm, isLlmConfigured } from '../lib/llm.js';

const sql = createSqlClient();

// DeepSeek deepseek-chat list price (USD per 1M tokens, cache-miss).
const PRICE_IN_PER_1M = 0.14;
const PRICE_OUT_PER_1M = 0.28;

// How many rows to feed the LLM from each corpus — keeps the prompt compact.
const TOP_PRODUCTS = 10;
const TOP_VIDEOS = 20;
// Minimum relevance for a video insight to count as "notable".
const MIN_VIDEO_RELEVANCE = 6;
// Truncate each video insight in the prompt to keep token use bounded.
const INSIGHT_CHARS = 200;

interface ProjectRow {
  slug: string;
  name: string;
  one_liner: string | null;
  category: string | null;
  primary_url: string | null;
  created_at: string;
}

interface TopProductRow {
  slug: string;
  name: string;
  one_liner: string | null;
  primary_url: string | null;
  signal_count: number;
}

interface VideoRow {
  video_title: string;
  channel_title: string;
  key_insight: string | null;
  key_insight_zh: string | null;
  relevance_score: number | null;
  sentiment: string | null;
}

// What the model must return. emerging_themes / video_highlights are optional in
// the model's eyes but defaulted here so the insert always has a concrete value.
const TrendResult = z.object({
  summary_en: z.string().min(1),
  summary_zh: z.string().min(1),
  emerging_themes: z.array(z.string()).default([]),
  video_highlights: z.string().default(''),
});
type TrendResult = z.infer<typeof TrendResult>;

/** Best-effort source label from a project URL (for prompt colour only). */
function platformOf(url: string | null): string {
  if (!url) return 'unknown';
  try {
    const host = new URL(url.includes('://') ? url : `https://${url}`).hostname
      .replace(/^www\./, '')
      .toLowerCase();
    if (host.includes('github.com')) return 'GitHub';
    if (host.includes('producthunt.com')) return 'Product Hunt';
    if (host.includes('news.ycombinator') || host.includes('ycombinator')) return 'Hacker News';
    if (host.includes('reddit.com')) return 'Reddit';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'YouTube';
    if (host.includes('twitter.com') || host.includes('x.com')) return 'X';
    return host;
  } catch {
    return 'unknown';
  }
}

/**
 * Snake_case platform key matching the /trends PlatformBadge map
 * (github / hacker_news / product_hunt / youtube / reddit / x). The frontend
 * indexes its badge colours by this exact key, so top_products must carry it —
 * an unrecognised value still renders (badge falls back to the first 2 chars).
 */
function platformKey(url: string | null): string {
  if (!url) return 'unknown';
  try {
    const host = new URL(url.includes('://') ? url : `https://${url}`).hostname
      .replace(/^www\./, '')
      .toLowerCase();
    if (host.includes('github.com')) return 'github';
    if (host.includes('producthunt.com')) return 'product_hunt';
    if (host.includes('news.ycombinator') || host.includes('ycombinator')) return 'hacker_news';
    if (host.includes('reddit.com')) return 'reddit';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('twitter.com') || host.includes('x.com')) return 'x';
    return host;
  } catch {
    return 'unknown';
  }
}

/** Format this week's bounded corpus into a single LLM prompt. */
function buildPrompt(
  weekStart: string,
  weekEndIncl: string,
  projectCount: number,
  topProducts: TopProductRow[],
  videos: VideoRow[],
): string {
  const productLines = topProducts.length
    ? topProducts
        .map((p, i) => {
          const liner = p.one_liner ? ` — ${p.one_liner}` : '';
          return `${i + 1}. ${p.name}${liner} (${p.slug}, ${p.signal_count} signals, platform: ${platformOf(p.primary_url)})`;
        })
        .join('\n')
    : '(no projects with signal activity this week)';

  const videoLines = videos.length
    ? videos
        .map((v) => {
          const insight = (v.key_insight ?? '').slice(0, INSIGHT_CHARS);
          return `- "${v.video_title}" by ${v.channel_title}: ${insight}`;
        })
        .join('\n')
    : `(no video insights with relevance >= ${MIN_VIDEO_RELEVANCE} this week)`;

  return [
    `Trends for the week of ${weekStart} to ${weekEndIncl} ONLY, for a tech / indie product radar.`,
    'Every item below was collected DURING this week. Base the report solely on it.',
    '',
    `New projects tracked this week: ${projectCount}`,
    '',
    'Top projects by signal activity this week:',
    productLines,
    '',
    `Top video insights this week (relevance >= ${MIN_VIDEO_RELEVANCE}):`,
    videoLines,
    '',
    'Generate a JSON object with exactly these keys:',
    `- summary_en: a 3-4 sentence English overview of THIS week's (${weekStart}–${weekEndIncl}) trends.`,
    '- summary_zh: a 3-4 sentence Chinese translation (natural Mandarin, not translationese).',
    '- emerging_themes: an array of short keyword strings describing this week\'s hot topics.',
    '- video_highlights: 1-2 sentences describing notable video coverage.',
    '',
    'IMPORTANT: Analyze ONLY the data above — it is exclusively from this week. Do NOT carry',
    'over, restate, or recycle themes, products, or phrasing from any previous week. Each',
    'weekly report must stand on its own and reflect only what is listed here.',
  ].join('\n');
}

async function main(): Promise<void> {
  if (!isLlmConfigured()) {
    console.warn('[weekly-trend] LLM_API_KEY not set — skipping, nothing written.');
    return;
  }

  // Resolve the target ISO week. By default this is the current week; pass
  // `--week=YYYY-MM-DD` to (re)generate any historical week from its OWN data
  // (e.g. backfilling after this fix). The date is snapped to the Monday via
  // date_trunc, so any day within the week works.
  const weekArg = process.argv.find((a) => a.startsWith('--week='))?.split('=')[1] ?? null;
  if (weekArg && !/^\d{4}-\d{2}-\d{2}$/.test(weekArg)) {
    throw new Error(`[weekly-trend] --week must be YYYY-MM-DD, got "${weekArg}"`);
  }

  // Step 0 — resolve the week window. CRITICAL: the corpus is bounded to this
  // exact ISO week [week_start, week_end_excl), NOT a trailing `now() - 7 days`
  // span. The old trailing window meant every run captured roughly the same
  // recent rows, so consecutive weeks came out near-identical (TASK-007). Bounding
  // to the week makes each report contain ONLY that week's freshly-collected data.
  const [bounds] = await sql<{ week_start: string; week_end_excl: string; week_end_incl: string }[]>`
    select
      to_char(date_trunc('week', coalesce(${weekArg}::timestamptz, now())), 'YYYY-MM-DD') as week_start,
      to_char(date_trunc('week', coalesce(${weekArg}::timestamptz, now())) + interval '7 days', 'YYYY-MM-DD') as week_end_excl,
      to_char(date_trunc('week', coalesce(${weekArg}::timestamptz, now())) + interval '6 days', 'YYYY-MM-DD') as week_end_incl
  `;
  const weekStart = bounds!.week_start;
  const weekEndExcl = bounds!.week_end_excl; // next Monday (exclusive upper bound)
  const weekEndIncl = bounds!.week_end_incl; // Sunday (stored as week_end)

  // Step 1 — gather the corpus collected DURING this week only.
  const projects = await sql<ProjectRow[]>`
    select slug, name, one_liner, category, primary_url, created_at
    from app.project
    where created_at >= ${weekStart} and created_at < ${weekEndExcl}
  `;

  const topProducts = await sql<TopProductRow[]>`
    select p.slug, p.name, p.one_liner, p.primary_url, count(s.id)::int as signal_count
    from app.signal s
    join app.project p on p.id = s.project_id
    where s.created_at >= ${weekStart} and s.created_at < ${weekEndExcl}
    group by p.slug, p.name, p.one_liner, p.primary_url
    order by signal_count desc
    limit ${TOP_PRODUCTS}
  `;

  const videos = await sql<VideoRow[]>`
    select video_title, channel_title, key_insight, key_insight_zh, relevance_score, sentiment
    from app.video_insight
    where created_at >= ${weekStart} and created_at < ${weekEndExcl}
      and relevance_score >= ${MIN_VIDEO_RELEVANCE}
    order by relevance_score desc
    limit ${TOP_VIDEOS}
  `;

  // Accurate corpus totals (independent of the LIMITed prompt slices above),
  // bounded to the same week window.
  const projectCountRows = await sql<{ count: number }[]>`
    select count(*)::int as count
    from app.project
    where created_at >= ${weekStart} and created_at < ${weekEndExcl}
  `;
  const signalCountRows = await sql<{ count: number }[]>`
    select count(*)::int as count
    from app.signal
    where created_at >= ${weekStart} and created_at < ${weekEndExcl}
  `;
  const insightCountRows = await sql<{ count: number }[]>`
    select count(*)::int as count
    from app.video_insight
    where created_at >= ${weekStart} and created_at < ${weekEndExcl}
  `;
  const project_count = projectCountRows[0]?.count ?? 0;
  const signal_count = signalCountRows[0]?.count ?? 0;
  const insight_count = insightCountRows[0]?.count ?? 0;

  console.log(
    `[weekly-trend] Week ${weekStart}–${weekEndIncl} corpus: ${project_count} new projects, ` +
      `${signal_count} signals, ${insight_count} insights ` +
      `(${topProducts.length} active products, ${videos.length} notable videos).`,
  );

  // Step 2 + 3 — build the prompt and call DeepSeek. Raw callLlm (not
  // callLlmJson) so we can read token usage; we parse + validate ourselves.
  const prompt = buildPrompt(weekStart, weekEndIncl, project_count, topProducts, videos);
  const res = await callLlm(prompt, {
    json: true,
    maxTokens: 1200,
    systemPrompt:
      'You are a tech-trends analyst. Respond ONLY with a single valid JSON object — ' +
      'no prose, no markdown code fences.',
  });
  if (res === null) {
    console.warn('[weekly-trend] LLM returned null (unconfigured) — nothing written.');
    return;
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(res.content);
  } catch {
    const stripped = res.content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    rawJson = JSON.parse(stripped);
  }
  const parsed: TrendResult = TrendResult.parse(rawJson);

  const promptTokens = res.usage?.promptTokens ?? 0;
  const completionTokens = res.usage?.completionTokens ?? 0;

  // top_products: the signal-active leaderboard. Shape MUST match the /trends
  // page contract (apps/web/lib/db.ts WeeklyTrendProduct): name, slug, platform,
  // description, score. The page reads product.platform/score directly, so a
  // mismatched shape 500s it (PlatformBadge calls platform.slice).
  const topProductsJson = topProducts.map((p) => ({
    name: p.name,
    slug: p.slug,
    platform: platformKey(p.primary_url),
    description: p.one_liner ?? '',
    score: p.signal_count,
  }));

  // Step 4 — upsert keyed on the ISO-week start (Monday).
  await sql`
    insert into app.weekly_trend (
      week_start, week_end,
      summary_en, summary_zh,
      top_products, emerging_themes, video_highlights,
      total_projects_scanned, total_signals_generated, total_insights_collected,
      raw_llm_response, llm_prompt_tokens, llm_completion_tokens
    )
    values (
      ${weekStart},
      ${weekEndIncl},
      ${parsed.summary_en},
      ${parsed.summary_zh},
      ${sql.json(topProductsJson)},
      ${parsed.emerging_themes},
      ${parsed.video_highlights},
      ${project_count},
      ${signal_count},
      ${insight_count},
      ${sql.json(rawJson as never)},
      ${promptTokens},
      ${completionTokens}
    )
    on conflict (week_start) do update set
      week_end = excluded.week_end,
      summary_en = excluded.summary_en,
      summary_zh = excluded.summary_zh,
      top_products = excluded.top_products,
      emerging_themes = excluded.emerging_themes,
      video_highlights = excluded.video_highlights,
      total_projects_scanned = excluded.total_projects_scanned,
      total_signals_generated = excluded.total_signals_generated,
      total_insights_collected = excluded.total_insights_collected,
      raw_llm_response = excluded.raw_llm_response,
      llm_prompt_tokens = excluded.llm_prompt_tokens,
      llm_completion_tokens = excluded.llm_completion_tokens,
      created_at = now()
  `;

  const cost =
    (promptTokens / 1_000_000) * PRICE_IN_PER_1M +
    (completionTokens / 1_000_000) * PRICE_OUT_PER_1M;

  console.log(
    `[weekly-trend] ✓ Report stored: ${parsed.emerging_themes.length} themes. ` +
      `Tokens in/out ${promptTokens}/${completionTokens} ≈ $${cost.toFixed(4)}.`,
  );
}

main()
  .catch((err) => {
    console.error('[weekly-trend] Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
