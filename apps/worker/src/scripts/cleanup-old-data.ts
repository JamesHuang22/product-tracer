/**
 * Cleanup old raw.snapshot + app.project_metric data to reduce DB size
 * below Supabase Free Plan Fair Use Policy limits.
 *
 * root cause: raw.snapshot has 486,976 rows (521 MB = 92% of total 564 MB DB).
 * Every collector run appends a new snapshot — data from March 2026 is still present.
 *
 * Solution: delete snapshots older than N days, then VACUUM FULL to reclaim space.
 */

import { createSqlClient } from '@product-tracer/db';

interface Result {
  snapshot_before: number;
  snapshot_after: number;
  snapshot_deleted: number;
  metric_before: number;
  metric_after: number;
  metric_deleted: number;
  db_before_mb: number;
  db_after_mb: number;
  project_before_mb: number;
  project_after_mb: number;
  snapshot_before_mb: number;
  snapshot_after_mb: number;
  errors: string[];
}

async function main(): Promise<void> {
  const sql = createSqlClient();
  const errors: string[] = [];
  const retainDays = parseInt(process.env.RETAIN_DAYS || '30', 10);
  const cutoff = new Date(Date.now() - retainDays * 86400_000).toISOString();
  console.log(`\n  retain_days = ${retainDays}`);
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

  // --- Before ---
  const snapshotBefore = await getCount('raw.snapshot');
  const metricBefore = await getCount('app.project_metric');
  const dbSizeBefore = (
    await sql`select pg_size_pretty(pg_database_size(current_database())) as s`
  )[0].s;
  const snapSizeBefore = await getSize('raw.snapshot');
  const projSizeBefore = await getSize('app.project');
  console.log(`  BEFORE: DB=${dbSizeBefore}, raw.snapshot=${snapSizeBefore} rows=${snapshotBefore}`);

  // --- Phase 1: Clean raw.snapshot ---
  console.log(`\n  [1/3] Deleting raw.snapshot rows older than ${retainDays} days...`);
  try {
    const result1 = await sql.unsafe(
      `delete from raw.snapshot where collected_at < '${cutoff}'::timestamptz`,
    );
    console.log(`        Deleted ${result1.count} rows from raw.snapshot`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Phase 1 (snapshot cleanup): ${msg}`);
    console.error(`        ERROR: ${msg}`);
  }

  // --- Phase 2: Clean app.project_metric ---
  console.log(`\n  [2/3] Deleting old project_metric rows...`);
  try {
    const result2 = await sql.unsafe(
      `delete from app.project_metric where collected_at < '${cutoff}'::timestamptz`,
    );
    console.log(`        Deleted ${result2.count} rows from app.project_metric`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Phase 2 (metric cleanup): ${msg}`);
    console.error(`        ERROR: ${msg}`);
  }

  // --- Phase 3: VACUUM FULL to reclaim space ---
  console.log(`\n  [3/3] Running VACUUM FULL to reclaim space...`);
  try {
    await sql.unsafe(`vacuum full raw.snapshot`);
    console.log(`        VACUUM FULL raw.snapshot done`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Phase 3a (VACUUM snapshot): ${msg}`);
    console.error(`        ERROR: ${msg}`);
  }
  try {
    await sql.unsafe(`vacuum full app.project_metric`);
    console.log(`        VACUUM FULL app.project_metric done`);
  } catch (e: unknown) {
    // non-critical
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`        WARN (non-critical): ${msg}`);
  }
  try {
    await sql.unsafe(`analyze`);
    console.log(`        ANALYZE done`);
  } catch { /* ignore */ }

  // --- After ---
  const snapshotAfter = await getCount('raw.snapshot');
  const metricAfter = await getCount('app.project_metric');
  const dbSizeAfter = (
    await sql`select pg_size_pretty(pg_database_size(current_database())) as s`
  )[0].s;
  const snapSizeAfter = await getSize('raw.snapshot');
  const projSizeAfter = await getSize('app.project');

  console.log(`\n  ───────────────────────────`);
  console.log(`  AFTER cleanup:`);
  console.log(`    raw.snapshot:    ${snapSizeBefore} → ${snapSizeAfter}  (${snapshotBefore} → ${snapshotAfter} rows)`);
  console.log(`    app.project:     ${projSizeBefore} → ${projSizeAfter}`);
  console.log(`    app.project_metric: ${metricBefore} → ${metricAfter} rows`);
  console.log(`    Total DB:        ${dbSizeBefore} → ${dbSizeAfter}`);
  console.log(`    Errors:          ${errors.length === 0 ? 'none' : errors.join('; ')}`);
  console.log(`  ───────────────────────────\n`);

  // Set GitHub Action output
  if (process.env.GITHUB_OUTPUT) {
    const output = [
      `snapshot_deleted=${snapshotBefore - snapshotAfter}`,
      `snapshot_remaining=${snapshotAfter}`,
      `metric_deleted=${metricBefore - metricAfter}`,
      `metric_remaining=${metricAfter}`,
      `db_before=${dbSizeBefore}`,
      `db_after=${dbSizeAfter}`,
      `errors=${errors.length}`,
    ].join('\n');
    // We can't use fs in a one-liner easily, but we can just log for GHA
    // GHA uses summary instead — let the caller parse stdout
  }

  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
