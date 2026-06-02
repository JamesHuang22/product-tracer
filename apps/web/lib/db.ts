import { createSqlClient, type SqlClient } from '@product-tracer/db';

// One Postgres connection per process; HMR-safe via globalThis.
const g = globalThis as unknown as { _ptSql?: SqlClient };
export const sql: SqlClient = g._ptSql ?? (g._ptSql = createSqlClient());

export interface ProjectListItem {
  id: string;
  slug: string;
  name: string;
  one_liner: string | null;
  category: string | null;
  primary_url: string | null;
  github_stars: number | null;
  github_forks: number | null;
  created_at: string;
}

export async function getAllProjects(): Promise<ProjectListItem[]> {
  return await sql<ProjectListItem[]>`
    select
      p.id,
      p.slug,
      p.name,
      p.one_liner,
      p.category,
      p.primary_url,
      latest.stars as github_stars,
      latest.forks as github_forks,
      p.created_at
    from app.project p
    left join lateral (
      select s.stars, s.forks
      from raw.snapshot s
      where s.project_id = p.id and s.platform = 'github'
      order by s.timestamp desc
      limit 1
    ) latest on true
    order by latest.stars desc nulls last, p.created_at desc
  `;
}

export async function getTopProjects(limit: number): Promise<ProjectListItem[]> {
  const rows = await getAllProjects();
  return rows.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Platform-segmented queries (home page sections)
// ---------------------------------------------------------------------------

export type LivePlatform = 'github' | 'hacker_news' | 'product_hunt';

export interface PlatformTopItem {
  id: string;
  slug: string;
  name: string;
  one_liner: string | null;
  primary_url: string | null;
  /** Stars for GitHub, score for HN, upvotes for Product Hunt. Null if no snapshot recorded yet. */
  metric: number | null;
  /** Human label for the metric. */
  metric_label: 'stars' | 'score' | 'upvotes';
}

/**
 * Top N projects on a given platform, ordered by that platform's primary
 * engagement metric. Scopes to projects with an identity_link on the platform.
 */
export async function getPlatformTop(
  platform: LivePlatform,
  limit: number,
): Promise<PlatformTopItem[]> {
  if (platform === 'github') {
    return await sql<PlatformTopItem[]>`
      select
        p.id, p.slug, p.name, p.one_liner, p.primary_url,
        latest.stars as metric,
        'stars'::text as metric_label
      from app.project p
      join app.identity_link il on il.project_id = p.id and il.platform = 'github'
      left join lateral (
        select s.stars from raw.snapshot s
        where s.project_id = p.id and s.platform = 'github'
        order by s.timestamp desc limit 1
      ) latest on true
      order by latest.stars desc nulls last, p.created_at desc
      limit ${limit}
    `;
  }
  if (platform === 'product_hunt') {
    return await sql<PlatformTopItem[]>`
      select
        p.id, p.slug, p.name, p.one_liner, p.primary_url,
        latest.ph_upvotes as metric,
        'upvotes'::text as metric_label
      from app.project p
      join app.identity_link il on il.project_id = p.id and il.platform = 'product_hunt'
      left join lateral (
        select pm.ph_upvotes from app.project_metric pm
        where pm.project_id = p.id
        order by pm.date desc limit 1
      ) latest on true
      order by latest.ph_upvotes desc nulls last, p.created_at desc
      limit ${limit}
    `;
  }
  return await sql<PlatformTopItem[]>`
    select
      p.id, p.slug, p.name, p.one_liner, p.primary_url,
      latest.upvotes as metric,
      'score'::text as metric_label
    from app.project p
    join app.identity_link il on il.project_id = p.id and il.platform = 'hacker_news'
    left join lateral (
      select s.upvotes from raw.snapshot s
      where s.project_id = p.id and s.platform = 'hacker_news'
      order by s.timestamp desc limit 1
    ) latest on true
    order by latest.upvotes desc nulls last, p.created_at desc
    limit ${limit}
  `;
}

/** Count of distinct projects with at least one identity_link on this platform. */
export async function getPlatformProjectCount(platform: LivePlatform): Promise<number> {
  const [row] = await sql<{ n: number }[]>`
    select count(distinct project_id)::int as n
    from app.identity_link
    where platform = ${platform}
  `;
  return row?.n ?? 0;
}
