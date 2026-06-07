/**
 * Collect recent videos from a curated YouTube channel list, mine their
 * descriptions for the projects they showcase, and store them in Supabase.
 * Built on the official YouTube Data API v3 (read-only).
 *
 * Flow each run (weekly):
 *   1. Build the channel list: config/youtube-channels.json (∪ DEFAULT_CHANNELS)
 *   2. For each channel (sequential, polite delay): pull the latest N videos
 *   3. For each video: extract GitHub repo URLs from the description
 *   4. Match each repo to an existing project (by github primary_url) or create a
 *      new project keyed on the repo's slug (so the GitHub collector later
 *      adopts it on the same slug)
 *   5. Write app.identity_link (youtube) + raw.snapshot (youtube, upvotes=views,
 *      comments=likes) — one snapshot per (video, repo) pair, raw_data carries
 *      the full video + which repo it linked
 *
 * Auth comes from env / GitHub secrets (YOUTUBE_API_KEY). When the key is absent
 * the script logs and exits 0 — so the workflow and local typecheck never
 * hard-fail just because the secret is missing.
 *
 * Run from repo root: pnpm collect:youtube
 * Production cron: .github/workflows/collect-youtube.yml (weekly)
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { createSqlClient } from '@product-tracer/db';
import { extractGithubRepo } from '../collectors/hackernews.js';
import { repoSlug } from '../collectors/github.js';
import {
  DEFAULT_CHANNELS,
  YoutubeChannelList,
  getChannelVideos,
  isAuthConfigured,
  type YoutubeChannel,
  type YoutubeVideo,
} from '../collectors/youtube.js';

const sql = createSqlClient();

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_VIDEOS_PER_CHANNEL = 10;
const DELAY_BETWEEN_CHANNELS_MS = 1000;

/** Read config/youtube-channels.json (relative to this script); fall back to defaults. */
function loadChannels(): YoutubeChannel[] {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const file = path.resolve(here, '../../config/youtube-channels.json');
  if (!existsSync(file)) return DEFAULT_CHANNELS;
  try {
    const parsed = YoutubeChannelList.parse(JSON.parse(readFileSync(file, 'utf8')));
    return parsed.length > 0 ? parsed : DEFAULT_CHANNELS;
  } catch (err) {
    console.warn(
      `  ⚠ could not parse youtube-channels.json: ${err instanceof Error ? err.message : err}`,
    );
    return DEFAULT_CHANNELS;
  }
}

/** Find an existing project whose github primary_url is this repo, else null. */
async function findProjectByRepo(ownerRepo: string): Promise<string | null> {
  const rows = await sql<{ id: string }[]>`
    select id from app.project
    where lower(primary_url) like lower(${`https://github.com/${ownerRepo}%`})
    limit 1
  `;
  return rows[0]?.id ?? null;
}

interface StoreResult {
  matched: boolean;
}

/**
 * Persist the link between one video and one GitHub repo it mentions, matching
 * an existing project or creating a new one keyed on the repo slug.
 */
async function storeVideoRepo(video: YoutubeVideo, ownerRepo: string): Promise<StoreResult> {
  let projectId = await findProjectByRepo(ownerRepo);
  const matched = projectId !== null;

  if (!projectId) {
    const primaryUrl = `https://github.com/${ownerRepo}`;
    const name = ownerRepo.split('/')[1] ?? ownerRepo;
    const slug = repoSlug(ownerRepo);
    // The video title is the best one-liner we have for a YouTube-discovered repo.
    const oneLiner = video.title.replace(/\s+/g, ' ').trim().slice(0, 280) || null;
    const [row] = await sql<{ id: string }[]>`
      insert into app.project (slug, name, one_liner, category, primary_url, status)
      values (${slug}, ${name}, ${oneLiner}, ${'youtube'}, ${primaryUrl}, 'active')
      on conflict (slug) do update set
        name        = excluded.name,
        one_liner   = coalesce(app.project.one_liner, excluded.one_liner),
        primary_url = coalesce(excluded.primary_url, app.project.primary_url)
      returning id
    `;
    projectId = row!.id;
  }

  // One video can showcase several repos, so key the identity_link on the
  // (video, repo) pair — external_id is unique per (platform, external_id).
  const externalId = `${video.id}:${ownerRepo}`;
  await sql`
    insert into app.identity_link (project_id, platform, external_id, confidence, source)
    values (${projectId}, 'youtube', ${externalId}, ${matched ? 0.6 : 1.0}, ${matched ? 'soft' : 'hard'})
    on conflict (platform, external_id) do nothing
  `;

  // Engagement: YouTube views → upvotes, likes → comments slot (no dedicated
  // youtube metric columns; raw_data keeps the full picture).
  await sql`
    insert into raw.snapshot (project_id, platform, upvotes, comments, raw_data)
    values (${projectId}, 'youtube', ${video.views}, ${video.likes}, ${sql.json({ ...video, matchedRepo: ownerRepo })})
  `;

  return { matched };
}

async function main(): Promise<void> {
  const channels = loadChannels();
  console.log(`→ ${channels.length} YouTube channels to check.`);

  if (!isAuthConfigured()) {
    console.log('No YOUTUBE_API_KEY configured. Skipping — nothing collected.');
    return;
  }
  const apiKey = process.env.YOUTUBE_API_KEY!;

  let videosSeen = 0;
  let stored = 0;
  let matched = 0;
  let videosWithRepos = 0;
  let failedChannels = 0;

  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i]!;
    const label = channel.name ?? channel.id;
    try {
      const videos = await getChannelVideos(channel.id, apiKey, MAX_VIDEOS_PER_CHANNEL);
      videosSeen += videos.length;

      let channelStored = 0;
      for (const video of videos) {
        // Prefer canonical owner/repo from the extracted github URLs; dedupe.
        const repos = new Set<string>();
        for (const url of video.githubUrls) {
          const ownerRepo = extractGithubRepo(url);
          if (ownerRepo) repos.add(ownerRepo);
        }
        if (repos.size > 0) videosWithRepos++;

        for (const ownerRepo of repos) {
          try {
            const result = await storeVideoRepo(video, ownerRepo);
            stored++;
            channelStored++;
            if (result.matched) matched++;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`    ✗ ${video.id} → ${ownerRepo}: ${message}`);
            await sql`
              insert into raw.collector_error (platform, error_type, payload)
              values ('youtube', 'store_video_failed', ${sql.json({ videoId: video.id, ownerRepo, message })})
            `;
          }
        }
      }
      console.log(`  ${label}: ${videos.length} videos, ${channelStored} project links stored`);
    } catch (err) {
      failedChannels++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${label}: ${message}`);
      await sql`
        insert into raw.collector_error (platform, error_type, payload)
        values ('youtube', 'fetch_channel_failed', ${sql.json({ channelId: channel.id, message })})
      `;
    }
    if (i < channels.length - 1) await sleep(DELAY_BETWEEN_CHANNELS_MS);
  }

  console.log(
    `✓ Stored ${stored} YouTube project links (${matched} matched existing, ${stored - matched} new) ` +
      `from ${videosWithRepos}/${videosSeen} videos with repos; ${failedChannels} channels failed.`,
  );
}

main()
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
