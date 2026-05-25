/**
 * Collect Show HN posts and store them in Supabase.
 *
 * For each Show HN story:
 *   - If URL is a github.com/owner/repo we already have → hard-link to that
 *     project (the first real cross-platform identity match)
 *   - Otherwise → create a new HN-only project record
 *   - Write app.identity_link (platform='hacker_news') + raw.snapshot +
 *     app.project_metric.hn_score
 *
 * Run from repo root: pnpm collect:hackernews
 * Production cron: .github/workflows/collect-hackernews.yml every 4h
 * (offset 30 min from GH so the runners don't compete).
 */
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { createSqlClient } from '@product-tracer/db';
import {
  fetchShowStoryIds,
  fetchStories,
  extractGithubRepo,
  cleanShowHnTitle,
  storySlug,
  type HNStory,
} from '../collectors/hackernews.js';

const sql = createSqlClient();

/**
 * If the story URL is a github.com repo we already know about, return its
 * app.project.id — enabling the first cross-platform hard match.
 */
async function findGithubProjectMatch(url: string | undefined): Promise<string | null> {
  const ownerRepo = extractGithubRepo(url);
  if (!ownerRepo) return null;
  const pattern = `https://github.com/${ownerRepo}%`;
  const rows = await sql<{ id: string }[]>`
    select id from app.project
    where lower(primary_url) like lower(${pattern})
    limit 1
  `;
  return rows[0]?.id ?? null;
}

interface StoreResult {
  matchedGithub: boolean;
}

async function storeStory(story: HNStory): Promise<StoreResult> {
  let projectId = await findGithubProjectMatch(story.url);
  const matchedGithub = projectId !== null;

  if (!projectId) {
    // No matching GH project — create a new HN-only project record.
    const slug = storySlug(story);
    const name = story.title ? cleanShowHnTitle(story.title) : `HN ${story.id}`;
    const oneLiner = story.text ? story.text.replace(/<[^>]+>/g, '').slice(0, 280) : null;
    const [row] = await sql<{ id: string }[]>`
      insert into app.project (slug, name, one_liner, category, primary_url, status)
      values (${slug}, ${name}, ${oneLiner}, null, ${story.url ?? null}, 'active')
      on conflict (slug) do update set
        name        = excluded.name,
        one_liner   = coalesce(app.project.one_liner, excluded.one_liner),
        primary_url = coalesce(excluded.primary_url, app.project.primary_url)
      returning id
    `;
    projectId = row!.id;
  }

  // Hard identity link — this HN story IS this project, by URL.
  await sql`
    insert into app.identity_link (project_id, platform, external_id, confidence, source)
    values (${projectId}, 'hacker_news', ${String(story.id)}, 1.0, 'hard')
    on conflict (platform, external_id) do nothing
  `;

  await sql`
    insert into raw.snapshot (project_id, platform, upvotes, comments, raw_data)
    values (${projectId}, 'hacker_news', ${story.score ?? 0}, ${story.descendants ?? 0}, ${sql.json(story)})
  `;

  // hn_score per day — latest run wins (overwrite). github_stars on the same
  // row is untouched because the upsert only assigns the listed column.
  const today = new Date().toISOString().slice(0, 10);
  await sql`
    insert into app.project_metric (project_id, date, hn_score)
    values (${projectId}, ${today}, ${story.score ?? 0})
    on conflict (project_id, date) do update set hn_score = excluded.hn_score
  `;

  return { matchedGithub };
}

async function main(): Promise<void> {
  console.log('→ Fetching Show HN front page…');
  const ids = await fetchShowStoryIds(100);
  console.log(`  ${ids.length} story ids`);

  console.log('→ Fetching story details…');
  const stories = await fetchStories(ids);
  console.log(`  ${stories.length} active stories (${ids.length - stories.length} skipped: deleted/non-story)`);

  let stored = 0;
  let matched = 0;
  let failed = 0;
  for (const story of stories) {
    try {
      const result = await storeStory(story);
      stored++;
      if (result.matchedGithub) matched++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ HN ${story.id}: ${message}`);
      await sql`
        insert into raw.collector_error (platform, error_type, payload)
        values ('hacker_news', 'store_story_failed', ${sql.json({ id: story.id, title: story.title, message })})
      `;
    }
  }

  console.log(
    `✓ Stored ${stored} stories (${matched} hard-matched to existing GH project, ${stored - matched} HN-only, ${failed} failed).`,
  );
}

main()
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
