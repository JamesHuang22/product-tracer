/**
 * Collect GitHub trending repos and store them in Supabase.
 *
 * Flow each run:
 *   1. Discover via multiple focused queries (dedupe by repo id)
 *   2. Filter out obvious noise (awesome-lists, tutorials, books)
 *   3. Re-snapshot known repos that discovery didn't already cover
 *   4. Write everything to: app.project (upsert) + app.identity_link +
 *      raw.snapshot + app.project_metric
 *
 * Run from repo root: pnpm collect:github
 * In production (GH Actions cron) this runs every 4h via
 * .github/workflows/collect-github.yml.
 */
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { createSqlClient } from '@product-tracer/db';
import {
  discoverRepos,
  fetchKnownReposByIds,
  isNoiseRepo,
  repoSlug,
  type GithubRepo,
} from '../collectors/github.js';

const sql = createSqlClient();

async function storeRepo(repo: GithubRepo): Promise<void> {
  const slug = repoSlug(repo.full_name);
  const category = repo.language ?? repo.topics[0] ?? null;
  const today = new Date().toISOString().slice(0, 10);

  // Upsert project. `coalesce` on one_liner preserves anything T1 / a human
  // wrote — only fills it from GH description if it's still null.
  const [project] = await sql<{ id: string }[]>`
    insert into app.project (slug, name, one_liner, category, primary_url, status)
    values (${slug}, ${repo.name}, ${repo.description}, ${category}, ${repo.html_url}, 'active')
    on conflict (slug) do update set
      name        = excluded.name,
      one_liner   = coalesce(app.project.one_liner, excluded.one_liner),
      category    = excluded.category,
      primary_url = excluded.primary_url
    returning id
  `;
  const projectId = project!.id;

  await sql`
    insert into app.identity_link (project_id, platform, external_id, confidence, source)
    values (${projectId}, 'github', ${String(repo.id)}, 1.0, 'hard')
    on conflict (platform, external_id) do nothing
  `;

  await sql`
    insert into raw.snapshot (project_id, platform, stars, forks, raw_data)
    values (${projectId}, 'github', ${repo.stargazers_count}, ${repo.forks_count}, ${sql.json(repo)})
  `;

  await sql`
    insert into app.project_metric (project_id, date, github_stars)
    values (${projectId}, ${today}, ${repo.stargazers_count})
    on conflict (project_id, date) do update set github_stars = excluded.github_stars
  `;
}

async function main(): Promise<void> {
  // 1. Discover
  console.log('→ Discovering trending repos…');
  const { repos: discovered, perQuery } = await discoverRepos();
  const queryBreakdown = Object.entries(perQuery)
    .map(([label, n]) => `${label}=${n}`)
    .join(' ');
  console.log(`  per query: ${queryBreakdown}`);
  console.log(`  ${discovered.length} unique after dedupe`);

  // 2. Noise filter
  const filtered = discovered.filter((r) => !isNoiseRepo(r));
  console.log(`  ${filtered.length} after noise filter (-${discovered.length - filtered.length})`);

  // 3. Refresh known repos discovery didn't already cover
  console.log('→ Loading known repos for re-snapshot…');
  const known = await sql<{ external_id: string }[]>`
    select external_id from app.identity_link where platform = 'github'
  `;
  const knownIds = known.map((r) => Number(r.external_id));
  const coveredByDiscovery = new Set(filtered.map((r) => r.id));
  const idsToRefresh = knownIds.filter((id) => !coveredByDiscovery.has(id));
  console.log(
    `  ${knownIds.length} known, ${idsToRefresh.length} need refresh (${knownIds.length - idsToRefresh.length} already in discovery)`,
  );

  const { repos: refreshed, missing } = await fetchKnownReposByIds(idsToRefresh);
  if (missing.length > 0) {
    console.log(`  ${missing.length} known repos no longer accessible (deleted/private)`);
  }

  // 4. Store everything
  const all = [...filtered, ...refreshed];
  console.log(`→ Storing ${all.length} repos (${filtered.length} discovered + ${refreshed.length} refreshed)…`);
  let stored = 0;
  let failed = 0;
  for (const repo of all) {
    try {
      await storeRepo(repo);
      stored++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${repo.full_name}: ${message}`);
      await sql`
        insert into raw.collector_error (platform, error_type, payload)
        values ('github', 'store_repo_failed', ${sql.json({ repo: repo.full_name, message })})
      `;
    }
  }

  console.log(`✓ Stored ${stored} repos (${failed} failed).`);
}

main()
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
