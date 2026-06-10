/**
 * Growth-signal / trending engine — turn raw collector data into a small set of
 * "what's worth attention" signals in `app.signal`. Pure rule-based, no LLM,
 * zero external cost. Runs daily after every collector has populated
 * raw.snapshot / app.project_metric.
 *
 * Each run:
 *   1. Delete stale signals (created_at older than 3 days).
 *   2. Evaluate seven rules (one SQL query each, set-based — no N+1).
 *   3. Upsert results by (project_id, signal_type) so a project keeps at most one
 *      live signal of each type; re-running refreshes severity/title/created_at.
 *   4. Log a summary broken down by signal type.
 *
 * Rules (severity 1–5):
 *   github_star_burst   — stars grew >50% in 24h AND Δ>50            (3–5)
 *   rising_trend        — positive daily star growth 3 consecutive days (3–4)
 *   hn_wave             — HN score >50 within last 48h               (3–5)
 *   ph_launch_hot       — PH upvotes >100 AND project <7d old        (3–5)
 *   youtube_spike       — YouTube views grew >50% in 24h AND Δ>1000  (3–5)
 *   cross_platform_heat — on ≥3 platforms AND ≥1 high-engagement     (4–5)
 *   new_discovery       — created <48h ago AND on ≥2 platforms       (2)
 *
 * Safe on empty data (every rule simply returns no rows).
 *
 * Run from repo root: pnpm --filter @product-tracer/worker exec tsx src/scripts/run-signals.ts
 * Production cron: .github/workflows/signal-trending.yml daily at UTC 07:00.
 */
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { createSqlClient } from '@product-tracer/db';

const sql = createSqlClient();

/** Signals expire 3 days out — matches the stale-cleanup window. */
const EXPIRY_DAYS = 3;

type SignalType =
  | 'github_star_burst'
  | 'hn_wave'
  | 'ph_launch_hot'
  | 'youtube_spike'
  | 'cross_platform_heat'
  | 'new_discovery'
  | 'rising_trend';

/** JSON-serialisable value — keeps `metadata` assignable to sql.json(). */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface SignalInsert {
  project_id: string;
  signal_type: SignalType;
  severity: number;
  title: string;
  description: string | null;
  metadata: { [key: string]: JsonValue };
}

const clampSeverity = (n: number): number => Math.max(1, Math.min(5, Math.round(n)));

// ---------------------------------------------------------------------------
// Rules — each returns candidate SignalInserts from a single set-based query.
// ---------------------------------------------------------------------------

/** GitHub stars grew >50% in 24h AND delta >50. Uses precomputed metric delta. */
async function githubStarBurst(): Promise<SignalInsert[]> {
  const rows = await sql<{ project_id: string; stars: number; delta: number }[]>`
    with latest as (
      select distinct on (project_id)
        project_id, github_stars as stars, github_stars_delta_24h as delta
      from app.project_metric
      where github_stars is not null and github_stars_delta_24h is not null
      order by project_id, date desc
    )
    select project_id, stars, delta from latest
    where delta > 50
      and (stars - delta) > 0
      and delta::numeric / (stars - delta) > 0.5
  `;
  return rows.map((r) => ({
    project_id: r.project_id,
    signal_type: 'github_star_burst',
    severity: clampSeverity(r.delta > 500 ? 5 : r.delta > 200 ? 4 : 3),
    title: `⭐ ${r.delta} stars in 24h`,
    description: `GitHub stars jumped from ${r.stars - r.delta} to ${r.stars} in a day.`,
    metadata: { delta: r.delta, stars: r.stars, timeframe_hours: 24 },
  }));
}

/** Positive daily star growth across the latest 3 consecutive metric days. */
async function risingTrend(): Promise<SignalInsert[]> {
  const rows = await sql<{ project_id: string; name: string; total: number; streak: number }[]>`
    with recent as (
      select project_id, date, github_stars_delta_24h as delta,
             row_number() over (partition by project_id order by date desc) as rn
      from app.project_metric
      where github_stars_delta_24h is not null
    ),
    top3 as (select * from recent where rn <= 3)
    select t.project_id, p.name,
           sum(t.delta)::int as total,
           count(*)::int as streak
    from top3 t
    join app.project p on p.id = t.project_id
    group by t.project_id, p.name
    having count(*) = 3
       and bool_and(t.delta > 0)
       and (max(t.date) - min(t.date)) = 2
  `;
  return rows.map((r) => ({
    project_id: r.project_id,
    signal_type: 'rising_trend',
    severity: clampSeverity(r.total > 100 ? 4 : 3),
    title: `📈 Rising: ${r.total} stars over 3 days`,
    description: `${r.name} gained stars every day for ${r.streak} days running.`,
    metadata: { total_delta: r.total, streak_days: r.streak },
  }));
}

/** HN score >50 within the last 48h. */
async function hnWave(): Promise<SignalInsert[]> {
  const rows = await sql<{ project_id: string; score: number }[]>`
    with latest as (
      select distinct on (project_id) project_id, upvotes as score, timestamp
      from raw.snapshot
      where platform = 'hacker_news' and project_id is not null and upvotes is not null
      order by project_id, timestamp desc
    )
    select project_id, score from latest
    where score > 50 and timestamp > now() - interval '48 hours'
  `;
  return rows.map((r) => ({
    project_id: r.project_id,
    signal_type: 'hn_wave',
    severity: clampSeverity(r.score > 300 ? 5 : r.score > 150 ? 4 : 3),
    title: `🔥 Hacker News: ${r.score} points`,
    description: `Trending on Hacker News in the last 48h.`,
    metadata: { score: r.score, timeframe_hours: 48 },
  }));
}

/** PH upvotes >100 AND the project was created within 7 days (proxy for launch). */
async function phLaunchHot(): Promise<SignalInsert[]> {
  const rows = await sql<{ project_id: string; upvotes: number }[]>`
    with latest as (
      select distinct on (project_id) project_id, upvotes, timestamp
      from raw.snapshot
      where platform = 'product_hunt' and project_id is not null and upvotes is not null
      order by project_id, timestamp desc
    )
    select l.project_id, l.upvotes from latest l
    join app.project p on p.id = l.project_id
    where l.upvotes > 100 and p.created_at > now() - interval '7 days'
  `;
  return rows.map((r) => ({
    project_id: r.project_id,
    signal_type: 'ph_launch_hot',
    severity: clampSeverity(r.upvotes > 600 ? 5 : r.upvotes > 300 ? 4 : 3),
    title: `🚀 Product Hunt: ${r.upvotes} upvotes`,
    description: `Hot launch on Product Hunt this week.`,
    metadata: { upvotes: r.upvotes },
  }));
}

/** YouTube views grew >50% in 24h AND delta >1000 (latest two snapshots). */
async function youtubeSpike(): Promise<SignalInsert[]> {
  const rows = await sql<{ project_id: string; views: number; delta: number }[]>`
    with yt as (
      select project_id, upvotes as views, timestamp,
             lead(upvotes) over (partition by project_id order by timestamp desc) as prev_views
      from raw.snapshot
      where platform = 'youtube' and project_id is not null and upvotes is not null
    ),
    latest as (
      select distinct on (project_id) project_id, views, prev_views
      from yt order by project_id, timestamp desc
    )
    select project_id, views, (views - prev_views) as delta from latest
    where prev_views is not null and prev_views > 0
      and (views - prev_views) > 1000
      and (views - prev_views)::numeric / prev_views > 0.5
  `;
  return rows.map((r) => ({
    project_id: r.project_id,
    signal_type: 'youtube_spike',
    severity: clampSeverity(r.delta > 100000 ? 5 : r.delta > 10000 ? 4 : 3),
    title: `📺 ${r.delta.toLocaleString()} new views`,
    description: `YouTube views surged in the last day.`,
    metadata: { delta: r.delta, views: r.views, timeframe_hours: 24 },
  }));
}

/** Active on ≥3 platforms AND at least one shows high engagement. */
async function crossPlatformHeat(): Promise<SignalInsert[]> {
  const rows = await sql<
    { project_id: string; platform_count: number; max_stars: number; max_upvotes: number }[]
  >`
    with plat as (
      select project_id, count(distinct platform) as platform_count
      from app.identity_link group by project_id
    ),
    eng as (
      select project_id,
             max(coalesce(stars, 0)) as max_stars,
             max(coalesce(upvotes, 0)) as max_upvotes
      from raw.snapshot where project_id is not null group by project_id
    )
    select p.project_id, p.platform_count, e.max_stars, e.max_upvotes
    from plat p join eng e on e.project_id = p.project_id
    where p.platform_count >= 3 and (e.max_stars > 200 or e.max_upvotes > 100)
  `;
  return rows.map((r) => ({
    project_id: r.project_id,
    signal_type: 'cross_platform_heat',
    severity: clampSeverity(r.platform_count >= 4 ? 5 : 4),
    title: `🌐 Trending on ${r.platform_count} platforms`,
    description: `Active across ${r.platform_count} platforms with strong engagement.`,
    metadata: {
      platform_count: r.platform_count,
      max_stars: r.max_stars,
      max_upvotes: r.max_upvotes,
    },
  }));
}

/** New project created in the last 48h AND already on ≥2 platforms. */
async function newDiscovery(): Promise<SignalInsert[]> {
  const rows = await sql<{ project_id: string; name: string; platform_count: number }[]>`
    with plat as (
      select project_id, count(distinct platform) as platform_count
      from app.identity_link group by project_id
    )
    select p.id as project_id, p.name, pl.platform_count
    from app.project p
    join plat pl on pl.project_id = p.id
    where p.created_at > now() - interval '48 hours' and pl.platform_count >= 2
  `;
  return rows.map((r) => ({
    project_id: r.project_id,
    signal_type: 'new_discovery',
    severity: 2,
    title: `✨ New discovery: ${r.name}`,
    description: `Freshly discovered and already seen on ${r.platform_count} platforms.`,
    metadata: { platform_count: r.platform_count },
  }));
}

const RULES: Array<() => Promise<SignalInsert[]>> = [
  githubStarBurst,
  risingTrend,
  hnWave,
  phLaunchHot,
  youtubeSpike,
  crossPlatformHeat,
  newDiscovery,
];

async function main(): Promise<void> {
  // 1. Clear stale signals so the table reflects the current window.
  const deleted = await sql`
    delete from app.signal where created_at < now() - make_interval(days => ${EXPIRY_DAYS})
  `;
  console.log(`→ Cleared ${deleted.count} stale signal(s) (>${EXPIRY_DAYS} days old).`);

  // 2. Evaluate every rule.
  const all: SignalInsert[] = [];
  for (const rule of RULES) {
    try {
      all.push(...(await rule()));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ rule ${rule.name} failed: ${message}`);
      await sql`
        insert into raw.collector_error (platform, error_type, payload)
        values ('signals', 'rule_failed', ${sql.json({ rule: rule.name, message })})
      `;
    }
  }

  // 3. Upsert each signal (one live signal per project+type).
  const byType: Record<string, number> = {};
  let upserted = 0;
  for (const s of all) {
    try {
      await sql`
        insert into app.signal
          (project_id, signal_type, severity, title, description, metadata, expires_at)
        values (
          ${s.project_id}, ${s.signal_type}, ${s.severity}, ${s.title},
          ${s.description}, ${sql.json(s.metadata)},
          now() + make_interval(days => ${EXPIRY_DAYS})
        )
        on conflict (project_id, signal_type) do update set
          severity    = excluded.severity,
          title       = excluded.title,
          description = excluded.description,
          metadata    = excluded.metadata,
          expires_at  = excluded.expires_at,
          created_at  = now()
      `;
      upserted++;
      byType[s.signal_type] = (byType[s.signal_type] ?? 0) + 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ upsert ${s.signal_type} for ${s.project_id}: ${message}`);
    }
  }

  const breakdown =
    Object.entries(byType)
      .map(([t, n]) => `${n} ${t}`)
      .join(', ') || 'none';
  console.log(`✓ Generated ${upserted} signals (${breakdown}).`);
}

main()
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
