import { createSqlClient } from '@product-tracer/db';
const sql = createSqlClient();

async function main() {
    console.log('=== Table row counts ===');
    for (const t of ['app.project','app.raw_snapshot','app.video_insight','app.weekly_trend','app.signals','app.ai_summary']) {
        const [r] = await sql.unsafe('select count(*)::int as n from ' + t);
        console.log('  ' + t + ': ' + r.n);
    }
    const noise = await sql`select count(*)::int as n from app.project where (github_stars is null or github_stars = 0) and (github_forks is null or github_forks = 0) and (upvotes is null or upvotes = 0)`;
    console.log('  noise(0/0/0): ' + noise[0].n);
    
    // Top 5 oldest projects with no engagement
    const oldest = await sql`select name, slug, platforms, github_stars, created_at from app.project where (github_stars is null or github_stars = 0) order by created_at asc limit 10`;
    console.log('\n=== Oldest 0-star projects (candidates for cleanup) ===');
    for (const p of oldest) {
        const ageDays = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000);
        console.log(`  ${p.name || '?'} (${p.slug}) — stars:${p.github_stars ?? 'null'} — ${ageDays}d old`);
    }
    
    const [snap] = await sql`select pg_size_pretty(pg_total_relation_size('app.raw_snapshot')) as s`;
    const [proj] = await sql`select pg_size_pretty(pg_total_relation_size('app.project')) as s`;
    const [total] = await sql`select pg_size_pretty(pg_database_size(current_database())) as s`;
    console.log('  raw_snapshot size: ' + snap.s);
    console.log('  app.project size: ' + proj.s);
    console.log('  total DB: ' + total.s);
    await sql.end({ timeout: 5 });
}
main().catch(e => { console.error(e); process.exit(1); });
