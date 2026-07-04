/**
 * Batch-delete old raw.snapshot rows to reduce DB size.
 * Strategy: delete snapshots older than N days, in batches of 5k,
 * to avoid statement timeout on Supabase session pooler.
 */

import { createSqlClient } from '@product-tracer/db';

async function main(): Promise<void> {
  const sql = createSqlClient();
  const errors: string[] = [];
  const retainDays = parseInt(process.env.RETAIN_DAYS || '14', 10);
  const batchSize = 5000;
  const cutoff = new Date(Date.now() - retainDays * 86400_000).toISOString();

  console.log(`  retain_days = ${retainDays}, batch_size = ${batchSize}`);
  console.log(`  cutoff      = ${cutoff}\n`);

  // --- Before ---
  const [snapCountBefore] = await sql.unsafe(`select count(*)::int as n from raw.snapshot`);
  const [dbSizeBefore] = await sql`select pg_size_pretty(pg_database_size(current_database())) as s`;
  const [snapSizeBefore] = await sql.unsafe(`select pg_size_pretty(pg_total_relation_size('raw.snapshot')) as s`);
  console.log(`  BEFORE: DB=${dbSizeBefore.s}, raw.snapshot=${snapSizeBefore.s} rows=${snapCountBefore.n}`);

  // Check date range
  const [earliest] = await sql.unsafe(`select "timestamp" as d from raw.snapshot order by "timestamp" limit 1`);
  const [latest] = await sql.unsafe(`select "timestamp" as d from raw.snapshot order by "timestamp" desc limit 1`);
  if (earliest) console.log(`  Earliest: ${earliest.d}`);
  if (latest) console.log(`  Latest:   ${latest.d}`);

  // Count what we'll delete
  const [toDelete] = await sql.unsafe(
    `select count(*)::int as n from raw.snapshot where "timestamp"::timestamptz < '${cutoff}'::timestamptz`,
  );
  console.log(`  Rows to delete: ${toDelete.n}`);

  // --- Phase 1: Batch DELETE ---
  console.log(`\n  [1/3] Batch-deleting old snapshots...`);
  let totalDeleted = 0;
  let batches = 0;
  while (true) {
    const result: any = await sql.unsafe(
      `delete from raw.snapshot
       where id in (
         select id from raw.snapshot
         where "timestamp"::timestamptz < '${cutoff}'::timestamptz
         limit ${batchSize}
       )`,
    );
    const deleted = result.count || 0;
    totalDeleted += deleted;
    batches++;
    if (deleted < batchSize) break;
    if (batches % 5 === 0) process.stdout.write(`  batch ${batches}: ${totalDeleted} deleted so far...\n`);
  }
  console.log(`        Done: ${totalDeleted} rows in ${batches} batches`);

  // --- Phase 2: VACUUM FULL ---
  console.log(`\n  [2/3] VACUUM FULL...`);
  try {
    await sql.unsafe(`vacuum full raw.snapshot`);
    console.log(`        VACUUM FULL done`);
  } catch (e: unknown) { console.warn(`        WARN: ${e instanceof Error ? e.message : String(e)}`); }
  try { await sql.unsafe(`analyze raw.snapshot`); console.log(`        ANALYZE done`); } catch { /* ignore */ }

  // --- After ---
  const [snapCountAfter] = await sql.unsafe(`select count(*)::int as n from raw.snapshot`);
  const [dbSizeAfter] = await sql`select pg_size_pretty(pg_database_size(current_database())) as s`;
  const [snapSizeAfter] = await sql.unsafe(`select pg_size_pretty(pg_total_relation_size('raw.snapshot')) as s`;

  console.log(`\n  ───────────────────────────`);
  console.log(`  AFTER cleanup:`);
  console.log(`    raw.snapshot: ${snapSizeBefore.s} → ${snapSizeAfter.s}  (${snapCountBefore.n} → ${snapCountAfter.n} rows)`);
  console.log(`    Total DB:     ${dbSizeBefore.s} → ${dbSizeAfter.s}`);
  console.log(`    Errors:       ${errors.length === 0 ? 'none' : errors.join('; ')}`);
  console.log(`  ───────────────────────────\n`);

  await sql.end({ timeout: 5 });
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
