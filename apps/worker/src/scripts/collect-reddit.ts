/**
 * Collect "hot" posts from indie-maker subreddits and store them in Supabase.
 *
 * For each post:
 *   - If the post links to a github.com/owner/repo we already have → hard-link
 *     to that project (cross-platform identity match, same as the HN collector)
 *   - Otherwise → create a new Reddit-only project record
 *   - Write app.identity_link (platform='reddit') + raw.snapshot +
 *     app.project_metric.reddit_score
 *
 * Subreddits are visited sequentially with a 2s gap to stay under Reddit's
 * anonymous rate limit.
 *
 * Run from repo root: pnpm collect:reddit
 * Production cron: .github/workflows/collect-reddit.yml every 4h
 * (offset 2h from GH (:00) / HN (:30) / PH (:00+1h) so runners don't compete).
 */
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { createSqlClient } from '@product-tracer/db';
import { extractGithubRepo } from '../collectors/hackernews.js';
import {
  DEFAULT_SUBREDDITS,
  fetchSubredditHot,
  isNoisePost,
  postSlug,
  type RedditPost,
} from '../collectors/reddit.js';

const sql = createSqlClient();

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * If the post links to a github.com repo we already know about, return its
 * app.project.id — enabling a cross-platform hard match.
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

async function storePost(post: RedditPost): Promise<StoreResult> {
  let projectId = await findGithubProjectMatch(post.url);
  const matchedGithub = projectId !== null;

  if (!projectId) {
    const slug = postSlug(post);
    const oneLiner = post.selftext ? post.selftext.replace(/\s+/g, ' ').trim().slice(0, 280) : null;
    // For self-posts `url` is the reddit thread; for link-posts it's the
    // external URL. Either way it's the most useful primary_url we have.
    const primaryUrl = post.url || `https://www.reddit.com${post.permalink}`;
    const [row] = await sql<{ id: string }[]>`
      insert into app.project (slug, name, one_liner, category, primary_url, status)
      values (${slug}, ${post.title}, ${oneLiner}, ${post.subreddit}, ${primaryUrl}, 'active')
      on conflict (slug) do update set
        name        = excluded.name,
        one_liner   = coalesce(app.project.one_liner, excluded.one_liner),
        primary_url = coalesce(excluded.primary_url, app.project.primary_url)
      returning id
    `;
    projectId = row!.id;
  }

  // Hard identity link — this Reddit post IS this project, by reddit id.
  await sql`
    insert into app.identity_link (project_id, platform, external_id, confidence, source)
    values (${projectId}, 'reddit', ${post.id}, 1.0, 'hard')
    on conflict (platform, external_id) do nothing
  `;

  await sql`
    insert into raw.snapshot (project_id, platform, upvotes, comments, raw_data)
    values (${projectId}, 'reddit', ${post.score}, ${post.num_comments}, ${sql.json(post)})
  `;

  // reddit_score per day — latest run wins. Other metric columns on the same
  // row are untouched because the upsert only assigns the listed column.
  const today = new Date().toISOString().slice(0, 10);
  await sql`
    insert into app.project_metric (project_id, date, reddit_score)
    values (${projectId}, ${today}, ${post.score})
    on conflict (project_id, date) do update set reddit_score = excluded.reddit_score
  `;

  return { matchedGithub };
}

async function main(): Promise<void> {
  let stored = 0;
  let matched = 0;
  let failed = 0;

  for (let i = 0; i < DEFAULT_SUBREDDITS.length; i++) {
    const subreddit = DEFAULT_SUBREDDITS[i]!;
    console.log(`→ Fetching r/${subreddit} hot…`);
    let posts: RedditPost[];
    try {
      posts = await fetchSubredditHot(subreddit, 25);
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ r/${subreddit}: ${message}`);
      await sql`
        insert into raw.collector_error (platform, error_type, payload)
        values ('reddit', 'fetch_subreddit_failed', ${sql.json({ subreddit, message })})
      `;
      continue;
    }

    const filtered = posts.filter((p) => !isNoisePost(p));
    console.log(`  ${posts.length} posts, ${filtered.length} after noise filter`);

    for (const post of filtered) {
      try {
        const result = await storePost(post);
        stored++;
        if (result.matchedGithub) matched++;
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ reddit ${post.id} (${post.title.slice(0, 40)}): ${message}`);
        await sql`
          insert into raw.collector_error (platform, error_type, payload)
          values ('reddit', 'store_post_failed', ${sql.json({ id: post.id, title: post.title, message })})
        `;
      }
    }

    // Polite gap between subreddits to stay under the anonymous rate limit.
    if (i < DEFAULT_SUBREDDITS.length - 1) await sleep(2000);
  }

  console.log(
    `✓ Stored ${stored} Reddit posts (${matched} hard-matched to existing GH project, ${stored - matched} reddit-only, ${failed} failed).`,
  );
}

main()
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
