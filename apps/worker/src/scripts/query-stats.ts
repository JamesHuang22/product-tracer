import { createSqlClient } from '@product-tracer/db';
const sql = createSqlClient();

async function main() {
    console.log('=== Table row counts ===');
    const tables = ['app.project', 'app.video_insight', 'app.weekly_trend'];
    for (const t of tables) {
        try {
            const [r] = await sql.unsafe('select count(*)::int as n from ' + t);
            console.log('  ' + t + ': ' + r.n);
        } catch (e) {
            console.log('  ' + t + ': ERROR - ' + (e as Error).message.slice(0,80));
        }
    }
    
    // raw_snapshot might be in a different schema
    try {
        const [r] = await sql.unsafe("select count(*)::int as n from raw_snapshot");
        console.log('  raw_snapshot: ' + r.n);
    } catch {
        try {
            // Check schemas
            const schemas = await sql.unsafe("select schemaname, tablename from pg_tables where tablename ~ 'snapshot|project|metric'");
            for (const s of schemas) {
                console.log('  found table: ' + s.schemaname + '.' + s.tablename);
            }
        } catch (e2) {
            console.log('  schema query error: ' + (e2 as Error).message.slice(0,80));
        }
    }

    const noise = await sql`select count(*)::int as n from app.project where (github_stars is null or github_stars = 0) and (github_forks is null or github_forks = 0)`;
    console.log('  noise(0/0): ' + noise[0].n);
    
    const [total] = await sql`select pg_size_pretty(pg_database_size(current_database())) as s`;
    console.log('  total DB: ' + total.s);

    await sql.end({ timeout: 5 });
}
main().catch(e => { console.error(e); process.exit(1); });
