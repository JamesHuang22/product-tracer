/**
 * Weekly newsletter send (TASK-017, Part 4 — OUTLINE ONLY).
 *
 * This is the scaffold for the weekly digest mailer. It already pulls the live
 * recipient list and the latest finished weekly trend; the actual Gmail send is
 * left as a TODO so we don't wire delivery before the copy/template is signed
 * off. Nothing here mutates state, so it is safe to run as a dry run.
 *
 * Intended schedule (once delivery is wired): GitHub Actions cron, Mondays —
 *   gh workflow run "Send Newsletter" --repo JamesHuang22/product-tracer
 * Gmail OAuth creds already exist for the YouTube collector / token refresh
 * (see scripts/refresh-google-token.mjs); reuse those for the send.
 */
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { createSqlClient } from '@product-tracer/db';

const sql = createSqlClient();

interface Subscriber {
  email: string;
}

interface TrendProduct {
  name: string;
  slug: string;
}

async function main() {
  // 1. Active recipients.
  const subscribers = await sql<Subscriber[]>`
    select email
    from app.newsletter_subscriber
    where unsubscribed_at is null
    order by created_at asc
  `;

  // 2. Latest *finished* weekly trend + its top products (mirrors /trends).
  const [trend] = await sql<{ week_start: string; week_end: string }[]>`
    select to_char(week_start, 'YYYY-MM-DD') as week_start,
           to_char(week_end, 'YYYY-MM-DD')   as week_end
    from app.weekly_trend
    where week_end < now()
    order by week_start desc
    limit 1
  `;

  let topProducts: TrendProduct[] = [];
  if (trend) {
    topProducts = await sql<TrendProduct[]>`
      select p.name, p.slug
      from app.project p
      order by (to_jsonb(p) ->> 'upvotes')::int desc nulls last, p.created_at desc
      limit 10
    `;
  }

  console.log(
    `[send-newsletter] dry run — ${subscribers.length} subscriber(s); ` +
      `week ${trend?.week_start ?? 'n/a'}–${trend?.week_end ?? 'n/a'}; ` +
      `${topProducts.length} product(s) in digest.`,
  );

  // 3. TODO: render the HTML digest from `trend` + `topProducts` and send via
  //    the Gmail API (reuse the YouTube collector's OAuth credentials). Honour
  //    an `unsubscribed_at` link per recipient before going live.

  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error('[send-newsletter] failed', err);
  process.exitCode = 1;
});
