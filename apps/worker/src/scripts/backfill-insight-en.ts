/**
 * Backfill: translate Chinese `key_insight` values into English (TASK-010).
 *
 * The /youtube-insights cards render `key_insight` in EN locale and suppress it
 * when it contains CJK (the no-Chinese-in-English rule), which left some cards
 * showing only the video title or "Analysis pending". A batch of legacy rows
 * stored Chinese in the English `key_insight` column even though the matching
 * Chinese already lives in `key_insight_zh`.
 *
 * This script finds every row whose `key_insight` contains CJK, asks the LLM to
 * translate the canonical Chinese (`key_insight_zh`, falling back to the CJK
 * `key_insight`) into natural English, and overwrites `key_insight` with it.
 * `key_insight_zh` is left untouched, so ZH locale is unaffected.
 *
 * Idempotent: once a row's `key_insight` is English it no longer matches the
 * CJK filter, so re-runs are no-ops. Graceful no-op when LLM_API_KEY is unset.
 *
 * Run (secrets live in GitHub Actions):
 *   gh workflow run "Backfill Insight English" --repo JamesHuang22/product-tracer
 * Local (with env): pnpm --filter @product-tracer/worker backfill:insight-en
 */
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { createSqlClient } from '@product-tracer/db';
import { callLlm, isLlmConfigured } from '../lib/llm.js';

const sql = createSqlClient();

// CJK ideographs + Japanese kana — mirrors the web `hasCjk` test so we fix
// exactly the rows the EN UI would suppress.
const CJK = '[぀-ヿ㐀-䶿一-鿿豈-﫿]';

interface Row {
  id: string;
  key_insight: string | null;
  key_insight_zh: string | null;
}

async function main(): Promise<void> {
  if (!isLlmConfigured()) {
    console.warn('[backfill-insight-en] LLM_API_KEY not set — skipping, nothing written.');
    return;
  }

  const rows = await sql<Row[]>`
    select id::text as id, key_insight, (to_jsonb(vi) ->> 'key_insight_zh') as key_insight_zh
    from app.video_insight vi
    where key_insight ~ ${CJK}
    order by created_at desc
  `;

  console.log(`[backfill-insight-en] ${rows.length} row(s) with CJK in key_insight.`);
  let fixed = 0;
  let failed = 0;

  for (const row of rows) {
    const source = (row.key_insight_zh?.trim() || row.key_insight?.trim()) ?? '';
    if (!source) continue;

    const res = await callLlm(
      `Translate the following Chinese tech/product video insight into natural, fluent English. ` +
        `Keep it 2-4 sentences, preserve the meaning, do not add commentary or quotation marks. ` +
        `Return ONLY the English translation.\n\n${source}`,
      {
        maxTokens: 400,
        systemPrompt:
          'You are a professional zh→en translator for a tech product digest. ' +
          'Output only the English translation — no preamble, no notes.',
      },
    );

    const english = res?.content?.trim().replace(/^["']|["']$/g, '').trim();
    if (!english) {
      failed += 1;
      console.warn(`[backfill-insight-en] no translation for ${row.id} — left as-is.`);
      continue;
    }

    // Preserve the canonical Chinese in key_insight_zh (so ZH locale still has
    // it) when that field is empty — the Chinese currently in key_insight would
    // otherwise be lost once we overwrite it with English (TASK-028).
    await sql`
      update app.video_insight
      set key_insight = ${english},
          key_insight_zh = coalesce(nullif(btrim(key_insight_zh), ''), ${source})
      where id = ${row.id}::uuid
    `;
    fixed += 1;
    console.log(`[backfill-insight-en] ✓ ${row.id}: ${english.slice(0, 70)}…`);
  }

  console.log(`[backfill-insight-en] done — ${fixed} translated, ${failed} skipped.`);
}

main()
  .catch((err) => {
    console.error('[backfill-insight-en] Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
