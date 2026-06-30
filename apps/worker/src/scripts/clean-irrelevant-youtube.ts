/**
 * Audit YouTube insights and DELETE non-tech content (TASK-028-REV).
 *
 * LLM-only review — NO hardcoded keyword lists. Keyword allow/deny lists are a
 * whack-a-mole game ("美食" blocked, "烹饪教程" slips through), so every row is
 * judged solely by the model with a strict bilingual yes/no prompt. Rows judged
 * "no" (food vlogs, lifestyle, daily chat, anything non-tech) are DELETED, not
 * flagged — the product carries zero non-tech content.
 *
 * Safety: aborts without deleting if the model would remove an implausibly large
 * share of rows (guards against a prompt/model failure wiping the table).
 *
 * Runs weekly (Sunday) and on demand — secrets live in GitHub Actions:
 *   gh workflow run "Clean Irrelevant YouTube" --repo JamesHuang22/product-tracer
 * Graceful no-op when LLM_API_KEY is unset.
 */
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { createSqlClient } from '@product-tracer/db';
import { isLlmConfigured } from '../lib/llm.js';
import { isVideoRelevant } from '../lib/youtube-relevance.js';

const sql = createSqlClient();

// Refuse to delete more than this fraction of audited rows in one run — a
// circuit breaker against the LLM erroneously rejecting everything.
const MAX_DELETE_FRACTION = 0.5;

interface Row {
  id: string;
  video_title: string | null;
  key_insight: string | null;
  key_insight_zh: string | null;
}

async function main() {
  if (!isLlmConfigured()) {
    console.warn('[clean-irrelevant-youtube] LLM_API_KEY not set — no-op.');
    await sql.end({ timeout: 5 });
    return;
  }

  // Optional window: AUDIT_DAYS limits to recently-created rows (weekly cron
  // passes 7); unset/0 audits the whole table.
  const auditDays = Number.parseInt(process.env.AUDIT_DAYS ?? '0', 10);
  const rows =
    auditDays > 0
      ? await sql<Row[]>`
          select id::text as id, video_title, key_insight,
                 (to_jsonb(vi) ->> 'key_insight_zh') as key_insight_zh
          from app.video_insight vi
          where created_at > now() - (${auditDays} || ' days')::interval
          order by created_at desc
        `
      : await sql<Row[]>`
          select id::text as id, video_title, key_insight,
                 (to_jsonb(vi) ->> 'key_insight_zh') as key_insight_zh
          from app.video_insight vi
          order by created_at desc
        `;

  const toDelete: string[] = [];
  for (const row of rows) {
    const summary = row.key_insight ?? row.key_insight_zh ?? '';
    const relevant = await isVideoRelevant(row.video_title ?? '', summary);
    if (relevant === false) toDelete.push(row.id); // null (LLM unavailable) → keep
  }

  if (rows.length > 0 && toDelete.length / rows.length > MAX_DELETE_FRACTION) {
    console.error(
      `[clean-irrelevant-youtube] ABORT — ${toDelete.length}/${rows.length} rows flagged ` +
        `(> ${MAX_DELETE_FRACTION * 100}% cap). Refusing to delete; check LLM/prompt.`,
    );
    await sql.end({ timeout: 5 });
    process.exitCode = 1;
    return;
  }

  if (toDelete.length > 0) {
    await sql`delete from app.video_insight where id::text = any(${toDelete})`;
  }

  console.log(
    `[clean-irrelevant-youtube] audited ${rows.length} row(s)` +
      `${auditDays > 0 ? ` (last ${auditDays}d)` : ''}: deleted ${toDelete.length} non-tech.`,
  );
  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error('[clean-irrelevant-youtube] failed', err);
  process.exitCode = 1;
});
