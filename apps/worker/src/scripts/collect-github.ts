/**
 * Collect trending GitHub repos and store them in Supabase.
 *
 * For each repo this writes the full pipeline slice:
 *   app.project        — upserted by slug
 *   app.identity_link  — github → project (hard match, the anchor platform)
 *   raw.snapshot       — append-only raw collector output
 *   app.project_metric — today's github_stars row
 *
 * Run from repo root: pnpm collect:github
 * In production this script is invoked by a platform cron (Railway/Fly).
 */
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { createSqlClient } from '@product-tracer/db';
import { fetchTrendingRepos, repoSlug, type GithubRepo } from '../collectors/github.js';

const sql = createSqlClient();

async function storeRepo(repo: GithubRepo): Promise<void> {
  const slug = repoSlug(repo.full_name);
  const category = repo.language ?? repo.topics[0] ?? null;
  const today = new Date().toISOString().slice(0, 10);

  const [project] = await sql<{ id: string }[]>`
    insert into app.project (slug, name, one_liner, category, primary_url, status)
    values (${slug}, ${repo.name}, ${repo.description}, ${category}, ${repo.html_url}, 'active')
    on conflict (slug) do update set
      name        = excluded.name,
      one_liner   = excluded.one_liner,
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
  console.log('→ Fetching trending repos from GitHub…');
  const repos = await fetchTrendingRepos({ minStars: 50, createdWithinDays: 30, limit: 30 });
  console.log(`  got ${repos.length} repos`);

  let stored = 0;
  let failed = 0;
  for (const repo of repos) {
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

  console.log(`✓ Stored ${stored} projects, ${failed} failed.`);
}

main()
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
