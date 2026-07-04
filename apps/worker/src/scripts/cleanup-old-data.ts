/**
 * Cleanup old raw.snapshot + app.project_metric data to reduce DB size
 * below Supabase Free Plan Fair Use Policy limits.
 */

import { createSqlClient } from '@product-tracer/db';

async function main(): Promise<void> {
  const sql = createSqlClient();
  const errors: string[] = [];
  const retainDays = parseInt(process.env.RETAIN_DAYS || '30', 10);
  const cutoff = new Date(Date.now() - retainDays * 86400_000).toISOString();
  console.log(`  retain_days = ${retainDays}`);
  console.log(`  cutoff      = ${cutoff}\n`);

  async function getCount(tbl: string): Promise<number> {
    const [r] = await sql.unsafe(`select count(*)::int as n from ${tbl}`);
    return r.n;
  }

  async function getSize(tbl: string): Promise<string> {
    const [r] = await sql.unsafe(
      `select pg_size_pretty(pg_total_relation_size('${tbl}')) as s`,
    );
    return r.s;
  }

  // --- Discover columns ---
  const snapCols = await sql.unsafe(
    "select column_name from information_schema.columns where table_schema='raw' and table_name='snapshot' order by ordinal_position",
  );
  console.log('  raw.snapshot columns:', snapCols.map((c: any) => c.column_name).join(', '));

  const metricCols = await sql.unsafe(
    "select column_name from information_schema.columns where table_schema='app' and table_name='project_metric' order by ordinal_position",
  );
  console.log('  app.project_metric columns:', metricCols.map((c: any) => c.column_name).join(', '));

  // Find timestamp column
  const snapTimeCol = snapCols.find((c: any) =>
    ['collected_at', 'created_at', 'snapshot_at', 'timestamp', 'collected', 'created', 'scraped_at'].includes(c.column_name),
  )?.column_name || 'created_at';
  console.log(`  → using "${snapTimeCol}" for raw.snapshot`);
  
  const metricTimeCol = metricCols.find((c: any) =>
    ['collected_at', 'created_at', 'snapshot_at', 'timestamp', 'collected', 'created'].includes(c.column_name),
  )?.column_name || 'created_at';
  console.log(`  → using "${metricTimeCol}" for app.project_metric`);

  // Look at a sample row to see date range
  try {
    const sampleDate = await sql.unsafe(
      `select ${snapTimeCol} as d from raw.snapshot order by ${snapTimeCol} limit 1`,
    );
    if (sampleDate.length > 0) {
      console.log(`  Earliest snapshot: ${sampleDate[0].d}`);
    }
    const latestDate = await sql.unsafe(
      `select ${snapTimeCol} as d from raw.snapshot order by ${snapTimeCol} desc limit 1`,
    );
    if (latestDate.length > 0) {
      console.log(`  Latest snapshot:   ${latestDate[0].d}`);
    }
  } catch (e: any) {
    console.log(`  (sample query error: ${e.message.slice(0,80)})`);
  }

  // --- Before ---
  const snapshotBefore = await getCount('raw.snapshot');
  const metricBefore = await getCount('app.project_metric');
  const dbSizeBefore = (
    await sql`select pg_size_pretty(pg_database_size(current_database())) as s`
  )[0].s;
  const snapSizeBefore = await getSize('raw.snapshot');
  const projSizeBefore = await getSize('app.project');
  console.log(`\n  BEFORE: DB=${dbSizeBefore}, raw.snapshot=${snapSizeBefore} rows=${snapshotBefore}`);

  // --- Phase 1: Clean raw.snapshot ---
  console.log(`\n  [1/3] Deleting raw.snapshot rows where ${snapTimeCol} < '${cutoff}'...`);
  try {
    const result1 = await sql.unsafe(
      `delete from raw.snapshot where "${snapTimeCol}"::timestamptz < '${cutoff}'::timestamptz`,
    );
    console.log(`        Deleted ${result1.count} rows from raw.snapshot`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Phase 1 (snapshot cleanup): ${msg}`);
    console.error(`        ERROR: ${msg}`);
  }

  // --- Phase 2: Clean app.project_metric ---
  console.log(`\n  [2/3] Deleting old project_metric rows where ${metricTimeCol} < '${cutoff}'...`);
  try {
    const result2 = await sql.unsafe(
      `delete from app.project_metric where "${metricTimeCol}"::timestamptz < '${cutoff}'::timestamptz`,
    );
    console.log(`        Deleted ${result2.count} rows from app.project_metric`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Phase 2 (metric cleanup): ${msg}`);
    console.error(`        ERROR: ${msg}`);
  }

  // --- Phase 3: VACUUM FULL ---
  console.log(`\n  [3/3] VACUUM FULL...`);
  for (const tbl of ['raw.snapshot', 'app.project_metric']) {
    try {
      await sql.unsafe(`vacuum full ${tbl}`);
      console.log(`        VACUUM FULL ${tbl} done`);
    } catch (e: unknown) {
      console.warn(`        WARN ${tbl}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  try { await sql.unsafe(`analyze`); console.log(`        ANALYZE done`); } catch { /* ignore */ }

  // --- After ---
  const snapshotAfter = await getCount('raw.snapshot');
  const metricAfter  = await getCount('app.project_metric');
  const dbSizeAfter = (
    await sql`select pg_size_pretty(pg_database_size(current_database())) as s`
  )[0].s;
  const snapSizeAfter = await getSize('raw.snapshot');
  const projSizeAfter = await getSize('app.project');

  console.log(`\n  ───────────────────────────`);
  console.log(`  AFTER cleanup:`);
  console.log(`    raw.snapshot:       ${snapSizeBefore} → ${snapSizeAfter}  (${snapshotBefore} → ${snapshotAfter} rows)`);
  console.log(`    app.project:        ${projSizeBefore} → ${projSizeAfter}`);
  console.log(`    app.project_metric: ${metricBefore} → ${metricAfter} rows`);
  console.log(`    Total DB:           ${dbSizeBefore} → ${dbSizeAfter}`);
  console.log(`    Errors:             ${errors.length === 0 ? 'none' : errors.join('; ')}`);
  console.log(`  ───────────────────────────\n`);

  await sql.end({ timeout: 10 });
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
