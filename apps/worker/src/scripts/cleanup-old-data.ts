/**
 * Aggressive cleanup of raw.snapshot to reduce DB size below Free Plan limits.
 * 
 * Strategy: raw.snapshot is 92%+ of DB size (~448 MB out of 488 MB).
 * The UI only uses the LATEST snapshot per project. Historical snapshots
 * are stored in app.project_metric (aggregated time-series).
 * 
 * Fix: Delete ALL raw.snapshot rows except the most recent K per project,
 * plus VACUUM FULL to reclaim space.
 * 
 * For app.project_metric: keep latest N days.
 */

import { createSqlClient } from '@product-tracer/db';

async function main(): Promise<void> {
  const sql = createSqlClient();
  const errors: string[] = [];
  const snapshotsPerProject = parseInt(process.env.SNAPSHOTS_PER_PROJECT || '3', 10); // keep newest 3 per project

  async function getCount(tbl: string): Promise<number> {
    const [r] = await sql.unsafe(`select count(*)::int as n from ${tbl}`);
    return r.n;
  }

  async function getSize(tbl: string): Promise<string> {
    const [r] = await sql.unsafe(`select pg_size_pretty(pg_total_relation_size('${tbl}')) as s`);
    return r.s;
  }

  // --- Discover columns ---
  const snapCols = await sql.unsafe(
    "select column_name from information_schema.columns where table_schema='raw' and table_name='snapshot' order by ordinal_position",
  );
  console.log('  raw.snapshot columns:', snapCols.map((c: any) => c.column_name).join(', '));
  const snapTimeCol = 'timestamp'; // confirmed from previous run

  // --- Before ---
  const snapshotBefore = await getCount('raw.snapshot');
  const dbSizeBefore = (await sql`select pg_size_pretty(pg_database_size(current_database())) as s`)[0].s;
  const snapSizeBefore = await getSize('raw.snapshot');
  console.log(`\n  BEFORE: DB=${dbSizeBefore}, raw.snapshot=${snapSizeBefore} rows=${snapshotBefore}`);

  // --- Phase 1: Delete all but newest N snapshots per project ---
  console.log(`\n  [1/3] Deleting old snapshots (keeping newest ${snapshotsPerProject} per project)...`);
  try {
    const result = await sql.unsafe(`
      delete from raw.snapshot s
      using (
        select id
        from (
          select id,
                 row_number() over (
                   partition by project_id, platform
                   order by "${snapTimeCol}" desc
                 ) as rn
          from raw.snapshot
        ) ranked
        where ranked.rn > ${snapshotsPerProject}
      ) to_delete
      where s.id = to_delete.id
    `);
    console.log(`        Deleted ${result.count} rows`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Phase 1: ${msg}`);
    console.error(`        ERROR: ${msg}`);
  }

  // --- Phase 2: Clean app.project_metric (keep 60 days since it's small) ---
  console.log(`\n  [2/3] Deleting old project_metric...`);
  try {
    const cutoff = new Date(Date.now() - 60 * 86400_000).toISOString();
    const result = await sql.unsafe(
      `delete from app.project_metric where date::timestamptz < '${cutoff}'::timestamptz`,
    );
    console.log(`        Deleted ${result.count} rows`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Phase 2: ${msg}`);
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
  const dbSizeAfter = (await sql`select pg_size_pretty(pg_database_size(current_database())) as s`)[0].s;
  const snapSizeAfter = await getSize('raw.snapshot');

  console.log(`\n  ───────────────────────────`);
  console.log(`  AFTER cleanup:`);
  console.log(`    raw.snapshot:       ${snapSizeBefore} → ${snapSizeAfter}  (${snapshotBefore} → ${snapshotAfter} rows)`);
  console.log(`    Total DB:           ${dbSizeBefore} → ${dbSizeAfter}`);
  console.log(`    Errors:             ${errors.length === 0 ? 'none' : errors.join('; ')}`);
  console.log(`  ───────────────────────────\n`);

  await sql.end({ timeout: 10 });
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
