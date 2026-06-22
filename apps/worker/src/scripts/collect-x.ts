/**
 * Collect recent tweets from a curated founder list and store product-relevant
 * ones in Supabase. Built on the open-source `agent-twitter-client` library —
 * no official X API, no paid tier (see research/x-twitter-collector.md).
 *
 * Flow each run:
 *   1. Build the founder list: config/founders.json ∪ X handles extracted from
 *      existing projects' primary_url (twitter.com / x.com profile links)
 *   2. For each founder (sequential, polite delay): pull recent original tweets
 *   3. Keep product-relevant tweets (external link or launch language)
 *   4. Match each to an existing project (GitHub repo / host match) or create a
 *      new X-only project
 *   5. Write app.identity_link (x) + raw.snapshot (x) + app.project_metric.x_likes
 *
 * Auth comes from env / GitHub secrets (X_COOKIES preferred). When no creds are
 * configured the script logs and exits 0 — so the workflow and local typecheck
 * never hard-fail just because secrets are absent.
 *
 * Run from repo root: pnpm --filter @product-tracer/worker exec tsx src/scripts/collect-x.ts
 * Production cron: .github/workflows/collect-x.yml
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { createSqlClient } from '@product-tracer/db';
import { normalizeText, NAME_MAX_LEN } from '../lib/normalize.js';
import { extractGithubRepo } from '../collectors/hackernews.js';
import {
  FounderList,
  createAuthenticatedScraper,
  fetchUserTweets,
  handleFromUrl,
  isAuthConfigured,
  isProductTweet,
  xPostSlug,
  type FounderEntry,
  type XPost,
} from '../collectors/x.js';

const sql = createSqlClient();

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_TWEETS_PER_USER = 20;
const DELAY_BETWEEN_USERS_MS = 3000;

/** Read config/founders.json (relative to this script), tolerate absence. */
function loadFoundersConfig(): FounderEntry[] {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const file = path.resolve(here, '../../config/founders.json');
  if (!existsSync(file)) return [];
  try {
    return FounderList.parse(JSON.parse(readFileSync(file, 'utf8')));
  } catch (err) {
    console.warn(`  ⚠ could not parse founders.json: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

/** Extract X handles from existing projects' twitter/x.com primary_urls. */
async function handlesFromProjects(): Promise<string[]> {
  const rows = await sql<{ primary_url: string }[]>`
    select primary_url from app.project
    where primary_url ilike '%twitter.com/%' or primary_url ilike '%x.com/%'
  `;
  const handles: string[] = [];
  for (const row of rows) {
    const h = handleFromUrl(row.primary_url);
    if (h) handles.push(h);
  }
  return handles;
}

/** Merge config + DB-derived handles, dedupe case-insensitively. */
async function buildFounderList(): Promise<FounderEntry[]> {
  const config = loadFoundersConfig();
  const fromDb = await handlesFromProjects();
  const seen = new Set<string>();
  const merged: FounderEntry[] = [];
  for (const entry of config) {
    const key = entry.handle.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(entry);
    }
  }
  for (const handle of fromDb) {
    const key = handle.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({ handle });
    }
  }
  return merged;
}

/**
 * Find an existing project a tweet's links point at — by GitHub repo first,
 * then by hostname match against a known primary_url. Returns null if none.
 */
async function findProjectByUrls(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    const ownerRepo = extractGithubRepo(url);
    if (ownerRepo) {
      const rows = await sql<{ id: string }[]>`
        select id from app.project
        where lower(primary_url) like lower(${`https://github.com/${ownerRepo}%`})
        limit 1
      `;
      if (rows[0]) return rows[0].id;
    }
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      if (!host) continue;
      const rows = await sql<{ id: string }[]>`
        select id from app.project
        where primary_url ilike ${`%${host}%`}
        order by created_at asc
        limit 1
      `;
      if (rows[0]) return rows[0].id;
    } catch {
      // unparseable URL — skip
    }
  }
  return null;
}

interface StoreResult {
  matched: boolean;
}

/** Persist one product-relevant tweet, matching or creating a project. */
async function storePost(post: XPost): Promise<StoreResult | null> {
  let projectId = await findProjectByUrls(post.urls);
  const matched = projectId !== null;

  if (!projectId) {
    // Only mint a new project when the tweet actually links somewhere — a bare
    // "I shipped!" with no URL isn't enough to create a project record.
    if (post.urls.length === 0) return null;

    const primaryUrl = post.urls[0]!;
    let name: string;
    try {
      name = new URL(primaryUrl).hostname.replace(/^www\./, '');
    } catch {
      name = `@${post.username}`;
    }
    const oneLiner = normalizeText(post.text);
    const slug = xPostSlug(post);
    const [row] = await sql<{ id: string }[]>`
      insert into app.project (slug, name, one_liner, category, primary_url, status)
      values (${slug}, ${normalizeText(name, NAME_MAX_LEN)}, ${oneLiner}, ${'x'}, ${primaryUrl}, 'active')
      on conflict (slug) do update set
        name        = excluded.name,
        one_liner   = coalesce(app.project.one_liner, excluded.one_liner),
        primary_url = coalesce(excluded.primary_url, app.project.primary_url)
      returning id
    `;
    projectId = row!.id;
  }

  // The tweet is the evidence linking this project to X.
  await sql`
    insert into app.identity_link (project_id, platform, external_id, confidence, source)
    values (${projectId}, 'x', ${post.id}, ${matched ? 0.7 : 1.0}, ${matched ? 'soft' : 'hard'})
    on conflict (platform, external_id) do nothing
  `;

  await sql`
    insert into raw.snapshot (project_id, platform, upvotes, comments, raw_data)
    values (${projectId}, 'x', ${post.likes}, ${post.replies}, ${sql.json(post)})
  `;

  // x_likes per project per day — latest run wins (mirrors reddit_score).
  const today = new Date().toISOString().slice(0, 10);
  await sql`
    insert into app.project_metric (project_id, date, x_likes, x_retweets, x_replies)
    values (${projectId}, ${today}, ${post.likes}, ${post.retweets}, ${post.replies})
    on conflict (project_id, date) do update set
      x_likes    = excluded.x_likes,
      x_retweets = excluded.x_retweets,
      x_replies  = excluded.x_replies
  `;

  return { matched };
}

async function main(): Promise<void> {
  const founders = await buildFounderList();
  console.log(`→ ${founders.length} founders to check.`);

  if (!isAuthConfigured()) {
    console.log(
      'No X credentials configured (set X_COOKIES or X_USERNAME/X_PASSWORD). Skipping — nothing collected.',
    );
    return;
  }
  if (founders.length === 0) {
    console.log('No founders to check. Done.');
    return;
  }

  let scraper;
  try {
    scraper = await createAuthenticatedScraper();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`✗ X auth failed: ${message}`);
    await sql`
      insert into raw.collector_error (platform, error_type, payload)
      values ('x', 'auth_failed', ${sql.json({ message })})
    `;
    process.exitCode = 1;
    return;
  }

  let stored = 0;
  let matched = 0;
  let failedUsers = 0;

  for (let i = 0; i < founders.length; i++) {
    const { handle } = founders[i]!;
    try {
      const posts = await fetchUserTweets(scraper, handle, MAX_TWEETS_PER_USER);
      const relevant = posts.filter(isProductTweet);
      console.log(`  @${handle}: ${posts.length} tweets, ${relevant.length} product-relevant`);
      for (const post of relevant) {
        try {
          const result = await storePost(post);
          if (result) {
            stored++;
            if (result.matched) matched++;
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`    ✗ tweet ${post.id}: ${message}`);
          await sql`
            insert into raw.collector_error (platform, error_type, payload)
            values ('x', 'store_post_failed', ${sql.json({ id: post.id, handle, message })})
          `;
        }
      }
    } catch (err) {
      failedUsers++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ @${handle}: ${message}`);
      await sql`
        insert into raw.collector_error (platform, error_type, payload)
        values ('x', 'fetch_user_failed', ${sql.json({ handle, message })})
      `;
    }
    if (i < founders.length - 1) await sleep(DELAY_BETWEEN_USERS_MS);
  }

  console.log(
    `✓ Stored ${stored} X posts (${matched} matched to existing project, ${stored - matched} new X-only, ${failedUsers} users failed).`,
  );
}

main()
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
