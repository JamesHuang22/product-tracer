/**
 * YouTube Insights pipeline — watch subscriptions, analyse each NEW video with
 * an LLM, and store structured insight as a first-class entity (app.video_insight).
 *
 * This is a sibling to the YouTube *collector* (collect-youtube.ts). The collector
 * mines video descriptions for GitHub repos → app.project. This pipeline goes
 * wider: for every video we haven't seen before, it asks DeepSeek (callLlm, JSON
 * mode) to extract the trends, topics, AI tools/products mentioned, overall
 * sentiment, a one-line key insight, and an indie-dev/AI relevance score — the
 * kind of content signal the frontend can surface directly.
 *
 * Flow each run (daily, 05:00 UTC — before data-quality at 06:00):
 *   1. Resolve auth + channel list (same as the collector):
 *        - OAuth (GOOGLE_OAUTH_TOKEN): the authenticated user's subscriptions
 *        - API key fallback: config/youtube-channels.json (∪ DEFAULT_CHANNELS)
 *   2. Pull the latest N videos per channel (sequential, polite delay).
 *   3. Dedupe against app.video_insight.video_id — only analyse NEW videos.
 *   4. Per new video: one LLM call → validated insight → insert one row.
 *   5. Log + write a summary to raw.collector_error for observability.
 *
 * `video_id` is unique, so each video is analysed (and billed) exactly once.
 * MAX_INSIGHTS_PER_RUN caps LLM calls per run so a large first-run backlog can't
 * blow up cost; the rest are picked up on subsequent runs (newest first).
 *
 * Graceful no-op when neither auth nor LLM_API_KEY is configured (mirrors the
 * collectors' isAuthConfigured() / isLlmConfigured() checks), so the workflow and
 * local typecheck never hard-fail just because nothing's wired up.
 *
 * Requires migration 0008_video_insight.sql to be applied first.
 *
 * Run from repo root: pnpm youtube:insights
 * Production cron: .github/workflows/youtube-insights.yml (daily 05:00 UTC)
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { z } from 'zod';
import { createSqlClient } from '@product-tracer/db';
import { callLlm, isLlmConfigured, type LlmUsage } from '../lib/llm.js';
import {
  DEFAULT_CHANNELS,
  YoutubeChannelList,
  getChannelVideos,
  getSubscribedChannels,
  isAuthConfigured,
  type YtAuth,
  type YoutubeChannel,
  type YoutubeVideo,
} from '../collectors/youtube.js';

const sql = createSqlClient();

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_VIDEOS_PER_CHANNEL = 10;
const DELAY_BETWEEN_CHANNELS_MS = 1000;
/** Cap on subscriptions swept per run (override with YOUTUBE_MAX_CHANNELS). */
const MAX_CHANNELS = Math.max(1, Number(process.env.YOUTUBE_MAX_CHANNELS) || 100);
/** Cap on LLM calls (= new videos analysed) per run. Override YOUTUBE_MAX_INSIGHTS. */
const MAX_INSIGHTS_PER_RUN = Math.max(1, Number(process.env.YOUTUBE_MAX_INSIGHTS) || 40);
// DeepSeek deepseek-chat list price (USD per 1M tokens, cache-miss).
const PRICE_IN_PER_1M = 0.14;
const PRICE_OUT_PER_1M = 0.28;

/** Read config/youtube-channels.json (relative to this script); fall back to defaults. */
function loadChannels(): YoutubeChannel[] {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const file = path.resolve(here, '../../config/youtube-channels.json');
  if (!existsSync(file)) return DEFAULT_CHANNELS;
  try {
    const parsed = YoutubeChannelList.parse(JSON.parse(readFileSync(file, 'utf8')));
    return parsed.length > 0 ? parsed : DEFAULT_CHANNELS;
  } catch (err) {
    console.warn(
      `  ⚠ could not parse youtube-channels.json: ${err instanceof Error ? err.message : err}`,
    );
    return DEFAULT_CHANNELS;
  }
}

/**
 * Resolve auth + channel list — same precedence as the collector. OAuth
 * (GOOGLE_OAUTH_TOKEN) reads the user's live subscriptions; if that's
 * unavailable or empty we fall back to the static list (and to the API key for
 * fetching, when one is set).
 */
async function resolveSource(): Promise<{ auth: YtAuth; channels: YoutubeChannel[] } | null> {
  const oauthToken = process.env.GOOGLE_OAUTH_TOKEN;
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (oauthToken) {
    let channels: YoutubeChannel[] = [];
    try {
      channels = await getSubscribedChannels(oauthToken, MAX_CHANNELS);
      console.log(`→ ${channels.length} subscribed channels (via OAuth).`);
    } catch (err) {
      console.error(
        `  ✗ could not read subscriptions: ${err instanceof Error ? err.message : err}`,
      );
    }
    if (channels.length > 0) return { auth: { kind: 'oauth', accessToken: oauthToken }, channels };
    const channelsFallback = loadChannels();
    console.log(`→ falling back to ${channelsFallback.length} static channels.`);
    return {
      auth: apiKey ? { kind: 'apiKey', apiKey } : { kind: 'oauth', accessToken: oauthToken },
      channels: channelsFallback,
    };
  }

  if (apiKey) {
    const channels = loadChannels();
    console.log(`→ ${channels.length} static channels (via API key).`);
    return { auth: { kind: 'apiKey', apiKey }, channels };
  }

  return null;
}

// ---------------------------------------------------------------------------
// LLM insight extraction
// ---------------------------------------------------------------------------

const SENTIMENTS = ['positive', 'neutral', 'negative'] as const;

/**
 * The shape we ask DeepSeek for, made tolerant of the model's natural sloppiness:
 * missing arrays default to [], unknown sentiment collapses to 'neutral',
 * out-of-range relevance is clamped to 1–10. We do NOT trust the model to echo
 * video_id (we already know it), so it isn't part of the schema.
 */
const Insight = z.object({
  trends: z.array(z.string().trim()).catch([]).default([]),
  topics: z.array(z.string().trim()).catch([]).default([]),
  tools_mentioned: z.array(z.string().trim()).catch([]).default([]),
  sentiment: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(z.enum(SENTIMENTS).catch('neutral'))
    .catch('neutral')
    .default('neutral'),
  key_insight: z.string().trim().catch('').default(''),
  relevance_score: z.coerce.number().int().min(1).max(10).catch(5).default(5),
});
type Insight = z.infer<typeof Insight>;

const SYSTEM_PROMPT =
  'You are a sharp tech-trend analyst tracking the indie-developer and AI tooling space. ' +
  'You watch videos from creators who review AI tools, demo new products, and discuss ' +
  "developer trends. From a single video's metadata you extract the signal: what trends " +
  'and topics it covers, which concrete tools/products it names, its overall tone toward ' +
  'those tools, the one key takeaway, and how relevant it is to an indie dev / AI-builder ' +
  'audience.';

const JSON_INSTRUCTION =
  'Respond ONLY with a single valid JSON object. No prose, no markdown code fences.';

function buildPrompt(video: YoutubeVideo): string {
  // Cap description length — descriptions can be huge (chapters, link dumps); the
  // first ~2k chars carry the substance and keeps token cost predictable.
  const description = video.description.replace(/\s+/g, ' ').trim().slice(0, 2000);
  return [
    'Analyse this YouTube video and extract structured insight. Return ONLY a JSON object:',
    '{',
    '  "trends": [string],            // broad trends the video discusses (0-5)',
    '  "topics": [string],            // specific topics covered (0-6)',
    '  "tools_mentioned": [string],   // concrete AI tools / products / libraries named (0-10)',
    '  "sentiment": "positive" | "neutral" | "negative",  // overall tone toward the tools/AI',
    '  "key_insight": string,         // 1-2 sentence summary of the main takeaway',
    '  "relevance_score": integer     // 1-10, how relevant to an indie-dev / AI-builder audience',
    '}',
    'Use [] for arrays with nothing to report. Be concise; do not invent tools that are not implied.',
    '',
    `Channel: ${video.channelTitle}`,
    `Title: ${video.title}`,
    `Description: ${description || '(none)'}`,
  ].join('\n');
}

/**
 * One LLM call per video. We use the raw callLlm (not callLlmJson) so we can read
 * back token `usage` for the cost estimate and persist the raw response, then
 * parse + validate ourselves — same fence-tolerant logic callLlmJson uses.
 */
async function analyseVideo(
  video: YoutubeVideo,
): Promise<{ insight: Insight; raw: unknown; usage: LlmUsage | null } | null> {
  const res = await callLlm(buildPrompt(video), {
    systemPrompt: `${SYSTEM_PROMPT}\n\n${JSON_INSTRUCTION}`,
    json: true,
    maxTokens: 512,
    temperature: 0.2,
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
  return { insight: Insight.parse(raw), raw, usage: res.usage };
}

/** Persist one analysed video. on conflict (video_id) do nothing → idempotent. */
async function storeInsight(
  video: YoutubeVideo,
  insight: Insight,
  raw: unknown,
  usage: LlmUsage | null,
): Promise<void> {
  await sql`
    insert into app.video_insight (
      video_id, channel_id, channel_title, video_title, video_url, thumbnail_url,
      published_at, trends, topics, tools_mentioned, sentiment, key_insight,
      relevance_score, raw_llm_response, llm_prompt_tokens, llm_completion_tokens
    ) values (
      ${video.id}, ${video.channelId}, ${video.channelTitle}, ${video.title},
      ${video.videoUrl}, ${video.thumbnailUrl}, ${video.publishedAt || null},
      ${sql.json(insight.trends)}, ${sql.json(insight.topics)}, ${sql.json(insight.tools_mentioned)},
      ${insight.sentiment}, ${insight.key_insight || null}, ${insight.relevance_score},
      ${sql.json(raw as never)}, ${usage?.promptTokens ?? 0}, ${usage?.completionTokens ?? 0}
    )
    on conflict (video_id) do nothing
  `;
}

/** Of the given video ids, which already have an insight row (so we skip them). */
async function seenVideoIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await sql<{ video_id: string }[]>`
    select video_id from app.video_insight where video_id = any(${ids})
  `;
  return new Set(rows.map((r) => r.video_id));
}

async function main(): Promise<void> {
  if (!isAuthConfigured()) {
    console.log(
      'No GOOGLE_OAUTH_TOKEN or YOUTUBE_API_KEY configured. Skipping — nothing analysed.',
    );
    return;
  }
  if (!isLlmConfigured()) {
    console.warn('[youtube-insights] LLM_API_KEY not set — nothing to analyse, exiting cleanly.');
    return;
  }

  const source = await resolveSource();
  if (!source || source.channels.length === 0) {
    console.log('No channels resolved. Nothing analysed.');
    return;
  }
  const { auth, channels } = source;

  // 1) Gather candidate videos across channels.
  const candidates: YoutubeVideo[] = [];
  let failedChannels = 0;
  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i]!;
    const label = channel.name ?? channel.id;
    try {
      const videos = await getChannelVideos(channel.id, auth, MAX_VIDEOS_PER_CHANNEL);
      candidates.push(...videos);
    } catch (err) {
      failedChannels++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${label}: ${message}`);
      await sql`
        insert into raw.collector_error (platform, error_type, payload)
        values ('youtube', 'insights_fetch_channel_failed', ${sql.json({ channelId: channel.id, message })})
      `;
    }
    if (i < channels.length - 1) await sleep(DELAY_BETWEEN_CHANNELS_MS);
  }

  // 2) Dedupe: drop videos we've already analysed, newest first, cap the run.
  const seen = await seenVideoIds(candidates.map((v) => v.id));
  const fresh = candidates
    .filter((v) => !seen.has(v.id))
    .sort((a, b) => (b.publishedAt > a.publishedAt ? 1 : b.publishedAt < a.publishedAt ? -1 : 0));
  const toAnalyse = fresh.slice(0, MAX_INSIGHTS_PER_RUN);

  console.log(
    `[youtube-insights] ${candidates.length} videos seen, ${fresh.length} new ` +
      `(${candidates.length - fresh.length} already analysed); ` +
      `analysing ${toAnalyse.length} this run (cap ${MAX_INSIGHTS_PER_RUN}).`,
  );

  // 3) Analyse + store, one LLM call per video.
  let analysed = 0;
  let failedVideos = 0;
  let promptTokens = 0;
  let completionTokens = 0;

  for (const video of toAnalyse) {
    try {
      const result = await analyseVideo(video);
      if (result === null) {
        console.warn('[youtube-insights] LLM returned null mid-run — stopping.');
        break;
      }
      if (result.usage) {
        promptTokens += result.usage.promptTokens;
        completionTokens += result.usage.completionTokens;
      }
      await storeInsight(video, result.insight, result.raw, result.usage);
      analysed++;
    } catch (err) {
      // One bad video shouldn't sink the run — log and move on. It stays "new"
      // and gets retried next run.
      failedVideos++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`    ✗ ${video.id} (${video.title.slice(0, 60)}): ${message}`);
      await sql`
        insert into raw.collector_error (platform, error_type, payload)
        values ('youtube', 'insights_analyse_failed', ${sql.json({ videoId: video.id, message })})
      `;
    }
  }

  const inputCost = (promptTokens / 1_000_000) * PRICE_IN_PER_1M;
  const outputCost = (completionTokens / 1_000_000) * PRICE_OUT_PER_1M;
  const totalCost = inputCost + outputCost;

  const summary = {
    videos_seen: candidates.length,
    new_videos: fresh.length,
    analysed,
    failed_videos: failedVideos,
    failed_channels: failedChannels,
    capped_at: MAX_INSIGHTS_PER_RUN,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    est_cost_usd: Number(totalCost.toFixed(6)),
  };

  await sql`
    insert into raw.collector_error (platform, error_type, payload)
    values ('youtube', 'youtube_insights_report', ${sql.json(summary)})
  `;

  console.log(
    `[youtube-insights] ✓ Analysed ${analysed}/${toAnalyse.length} videos ` +
      `(${failedVideos} failed, ${failedChannels} channels failed). ` +
      `Tokens in/out ${promptTokens}/${completionTokens} ≈ $${totalCost.toFixed(4)}.`,
  );
}

main()
  .catch((err) => {
    console.error('[youtube-insights] Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
