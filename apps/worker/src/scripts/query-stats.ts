import { createSqlClient } from '@product-tracer/db';
const sql = createSqlClient();

async function main() {
    console.log('=== Table row counts ===');
    for (const t of ['app.project','app.video_insight','app.weekly_trend','raw.snapshot','app.project_metric']) {
        try {
            const [r] = await sql.unsafe('select count(*)::int as n from ' + t);
            console.log('  ' + t + ': ' + r.n);
        } catch (e: any) {
            console.log('  ' + t + ': ERROR - ' + (e.message || '').slice(0,60));
        }
    }

    // Check project columns
    const cols = await sql.unsafe("select column_name, data_type from information_schema.columns where table_schema='app' and table_name='project' order by ordinal_position");
    console.log('\n=== app.project columns (first 20) ===');
    for (const c of cols.slice(0,20)) {
        console.log('  ' + c.column_name + ': ' + c.data_type);
    }

    // Projects with no engagement
    const noise = await sql`select count(*)::int as n from app.project`;
    console.log('\n  total projects: ' + noise[0].n);

    const [total] = await sql`select pg_size_pretty(pg_database_size(current_database())) as s`;
    console.log('  total DB size: ' + total.s);

    // Distinct schemas for size measurement
    const bigTables = await sql.unsafe(`
        select schemaname || '.' || tablename as tbl, pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size
        from pg_tables
        where schemaname in ('app','raw')
        order by pg_total_relation_size(schemaname || '.' || tablename) desc
        limit 10
    `);
    console.log('\n=== Biggest tables ===');
    for (const t of bigTables) {
        console.log('  ' + t.tbl + ': ' + t.size);
    }

    await sql.end({ timeout: 5 });
}
main().catch(e => { console.error(e); process.exit(1); });
