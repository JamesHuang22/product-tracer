import { createSqlClient, type SqlClient } from '@product-tracer/db';

// One Postgres connection per process; HMR-safe via globalThis.
const g = globalThis as unknown as { _ptSql?: SqlClient };

function getSql(): SqlClient {
  return g._ptSql ?? (g._ptSql = createSqlClient());
}

// Lazy client. Every page is `force-dynamic`, so the DB is only needed at
// request time — never at build. Constructing the connection eagerly here made
// `next build` "collect page data" import this module and throw whenever
// DATABASE_URL was absent (e.g. Vercel Preview envs). This proxy defers
// createSqlClient() until the first tagged-template call or property access.
export const sql: SqlClient = new Proxy(function () {} as unknown as SqlClient, {
  apply(_target, thisArg, args: unknown[]) {
    return (getSql() as unknown as (...a: unknown[]) => unknown).apply(thisArg, args);
  },
  get(_target, prop, receiver) {
    const client = getSql();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
}) as SqlClient;

// Re-exported for convenience; defined in a DB-free module so client
// components can import the values without bundling the postgres driver.
export { LLM_CATEGORIES, type LlmCategory } from './categories';

export interface ProjectListItem {
  id: string;
  slug: string;
  name: string;
  one_liner: string | null;
  category: string | null;
  /** AI-classified category (app.project.llm_category); null until classified. */
  llm_category: string | null;
  primary_url: string | null;
  github_stars: number | null;
  github_forks: number | null;
  created_at: string;
  /** Distinct platforms this project has an identity_link on (github, hacker_news, …). */
  platforms: string[];
}

export async function getAllProjects(): Promise<ProjectListItem[]> {
  return await sql<ProjectListItem[]>`
    select
      p.id,
      p.slug,
      p.name,
      p.one_liner,
      p.category,
      p.llm_category,
      p.primary_url,
      latest.stars as github_stars,
      latest.forks as github_forks,
      p.created_at,
      coalesce(
        (select array_agg(distinct il.platform)
         from app.identity_link il where il.project_id = p.id),
        '{}'
      ) as platforms
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

/**
 * Projects in a single LLM category, in the same shape and order as
 * getAllProjects. Optional limit/offset for server-side pagination; omitted by
 * default since the /projects table paginates client-side.
 */
export async function getProjectsByCategory(
  category: string,
  limit?: number,
  offset?: number,
): Promise<ProjectListItem[]> {
  return await sql<ProjectListItem[]>`
    select
      p.id,
      p.slug,
      p.name,
      p.one_liner,
      p.category,
      p.llm_category,
      p.primary_url,
      latest.stars as github_stars,
      latest.forks as github_forks,
      p.created_at,
      coalesce(
        (select array_agg(distinct il.platform)
         from app.identity_link il where il.project_id = p.id),
        '{}'
      ) as platforms
    from app.project p
    left join lateral (
      select s.stars, s.forks
      from raw.snapshot s
      where s.project_id = p.id and s.platform = 'github'
      order by s.timestamp desc
      limit 1
    ) latest on true
    where p.llm_category = ${category}
    order by latest.stars desc nulls last, p.created_at desc
    limit ${limit ?? null}
    offset ${offset ?? 0}
  `;
}

export async function getTopProjects(limit: number): Promise<ProjectListItem[]> {
  const rows = await getAllProjects();
  return rows.slice(0, limit);
}

/** Total number of tracked projects (home stats bar). */
export async function getTotalProjectCount(): Promise<number> {
  const [row] = await sql<{ n: number }[]>`select count(*)::int as n from app.project`;
  return row?.n ?? 0;
}

/** Projects created in the last 7 days (home stats bar). */
export async function getNewThisWeek(): Promise<number> {
  const [row] = await sql<{ n: number }[]>`
    select count(*)::int as n
    from app.project
    where created_at > now() - interval '7 days'
  `;
  return row?.n ?? 0;
}

/** Count of surfaced signals (home stats bar "Hot Signals"); 0 when none. */
export async function getActiveSignalCount(): Promise<number> {
  const [row] = await sql<{ n: number }[]>`select count(*)::int as n from app.signal`;
  return row?.n ?? 0;
}

/** Most recently created projects, any platform (home "Latest Activity" feed). */
export async function getLatestProjects(limit: number): Promise<ProjectListItem[]> {
  return await sql<ProjectListItem[]>`
    select
      p.id,
      p.slug,
      p.name,
      p.one_liner,
      p.category,
      p.llm_category,
      p.primary_url,
      latest.stars as github_stars,
      latest.forks as github_forks,
      p.created_at,
      coalesce(
        (select array_agg(distinct il.platform)
         from app.identity_link il where il.project_id = p.id),
        '{}'
      ) as platforms
    from app.project p
    left join lateral (
      select s.stars, s.forks
      from raw.snapshot s
      where s.project_id = p.id and s.platform = 'github'
      order by s.timestamp desc
      limit 1
    ) latest on true
    order by p.created_at desc
    limit ${limit}
  `;
}

// ---------------------------------------------------------------------------
// Platform-segmented queries (home page sections)
// ---------------------------------------------------------------------------

export type LivePlatform = 'github' | 'hacker_news' | 'product_hunt' | 'youtube';

export interface PlatformTopItem {
  id: string;
  slug: string;
  name: string;
  one_liner: string | null;
  primary_url: string | null;
  /** Stars for GitHub, score for HN, upvotes for PH, views for YouTube. Null if no snapshot recorded yet. */
  metric: number | null;
  /** Human label for the metric. */
  metric_label: 'stars' | 'score' | 'upvotes' | 'views';
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
      left join lateral (
        select s.stars from raw.snapshot s
        where s.project_id = p.id and s.platform = 'github'
        order by s.timestamp desc limit 1
      ) latest on true
      where exists (
        select 1 from app.identity_link il
        where il.project_id = p.id and il.platform = 'github'
      )
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
      left join lateral (
        select pm.ph_upvotes from app.project_metric pm
        where pm.project_id = p.id
        order by pm.date desc limit 1
      ) latest on true
      where exists (
        select 1 from app.identity_link il
        where il.project_id = p.id and il.platform = 'product_hunt'
      )
      order by latest.ph_upvotes desc nulls last, p.created_at desc
      limit ${limit}
    `;
  }
  if (platform === 'youtube') {
    // YouTube engagement is stored in raw.snapshot (upvotes=views). A project
    // can be linked from several videos; take its highest recorded view count.
    return await sql<PlatformTopItem[]>`
      select
        p.id, p.slug, p.name, p.one_liner, p.primary_url,
        latest.views as metric,
        'views'::text as metric_label
      from app.project p
      left join lateral (
        select max(s.upvotes) as views from raw.snapshot s
        where s.project_id = p.id and s.platform = 'youtube'
      ) latest on true
      where exists (
        select 1 from app.identity_link il
        where il.project_id = p.id and il.platform = 'youtube'
      )
      order by latest.views desc nulls last, p.created_at desc
      limit ${limit}
    `;
  }
  return await sql<PlatformTopItem[]>`
    select
      p.id, p.slug, p.name, p.one_liner, p.primary_url,
      latest.upvotes as metric,
      'score'::text as metric_label
    from app.project p
    left join lateral (
      select s.upvotes from raw.snapshot s
      where s.project_id = p.id and s.platform = 'hacker_news'
      order by s.timestamp desc limit 1
    ) latest on true
    where exists (
      select 1 from app.identity_link il
      where il.project_id = p.id and il.platform = 'hacker_news'
    )
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

/**
 * All projects with an identity_link on `platform`, in the same shape as the
 * /projects list so they render in the shared <ProjectsTable>. Ordered by that
 * platform's primary engagement metric (GitHub stars / latest snapshot upvotes /
 * Product Hunt upvotes), then recency.
 */
export async function getPlatformProjects(platform: string): Promise<ProjectListItem[]> {
  return await sql<ProjectListItem[]>`
    select
      p.id,
      p.slug,
      p.name,
      p.one_liner,
      p.category,
      p.llm_category,
      p.primary_url,
      gh.stars as github_stars,
      gh.forks as github_forks,
      p.created_at,
      coalesce(
        (select array_agg(distinct il2.platform)
         from app.identity_link il2 where il2.project_id = p.id),
        '{}'
      ) as platforms
    from app.project p
    left join lateral (
      select s.stars, s.forks
      from raw.snapshot s
      where s.project_id = p.id and s.platform = 'github'
      order by s.timestamp desc limit 1
    ) gh on true
    left join lateral (
      select
        case
          when ${platform} = 'github' then gh.stars
          when ${platform} = 'product_hunt' then (
            select pm.ph_upvotes from app.project_metric pm
            where pm.project_id = p.id order by pm.date desc limit 1
          )
          else (
            select s.upvotes from raw.snapshot s
            where s.project_id = p.id and s.platform = ${platform}
            order by s.timestamp desc limit 1
          )
        end as sort_metric
    ) ord on true
    where exists (
      select 1 from app.identity_link il
      where il.project_id = p.id and il.platform = ${platform}
    )
    order by ord.sort_metric desc nulls last, p.created_at desc
  `;
}

// ---------------------------------------------------------------------------
// Project detail page (/projects/[slug])
// ---------------------------------------------------------------------------

/** Latest snapshot for one platform a project lives on. */
export interface ProjectPlatformSnapshot {
  platform: string; // github | hacker_news | product_hunt | reddit | x
  external_id: string;
  stars: number | null;
  forks: number | null;
  upvotes: number | null; // PH upvotes / HN points / Reddit score
  comments: number | null;
  rank: number | null;
  updated_at: string | null; // latest snapshot timestamp (YYYY-MM-DD)
}

/**
 * One day of aggregated metrics. Mirrors the columns that exist on
 * app.project_metric — note there is no github_forks / hn_comments column
 * there, so per-platform forks/comments come from ProjectPlatformSnapshot.
 */
export interface ProjectMetricPoint {
  date: string; // YYYY-MM-DD
  github_stars: number | null;
  ph_upvotes: number | null;
  hn_score: number | null;
  reddit_score: number | null;
}

export interface ProjectDetail {
  id: string;
  slug: string;
  name: string;
  one_liner: string | null;
  category: string | null;
  llm_category: string | null;
  primary_url: string | null;
  created_at: string; // YYYY-MM-DD
  platforms: ProjectPlatformSnapshot[];
  metrics: ProjectMetricPoint[]; // ascending by date
}

/**
 * Full cross-platform detail for one project. Joins app.project with its
 * identity_links (one row per platform, enriched with the latest raw.snapshot)
 * and its daily app.project_metric series. Returns null when the slug is
 * unknown.
 */
export async function getProjectBySlug(slug: string): Promise<ProjectDetail | null> {
  const [project] = await sql<
    {
      id: string;
      slug: string;
      name: string;
      one_liner: string | null;
      category: string | null;
      llm_category: string | null;
      primary_url: string | null;
      created_at: string;
    }[]
  >`
    select
      p.id, p.slug, p.name, p.one_liner, p.category, p.llm_category, p.primary_url,
      to_char(p.created_at, 'YYYY-MM-DD') as created_at
    from app.project p
    where p.slug = ${slug}
    limit 1
  `;
  if (!project) return null;

  // A project can carry several identity_links for the same platform — notably
  // YouTube, which writes one link per (video, repo) pair. Collapse to a single
  // row per platform (the one whose latest snapshot is newest) so the detail
  // page renders one card per platform instead of duplicate cards with
  // duplicate React keys.
  const platforms = await sql<ProjectPlatformSnapshot[]>`
    select distinct on (il.platform)
      il.platform,
      il.external_id,
      latest.stars,
      latest.forks,
      latest.upvotes,
      latest.comments,
      latest.rank,
      to_char(latest.timestamp, 'YYYY-MM-DD') as updated_at
    from app.identity_link il
    left join lateral (
      select s.stars, s.forks, s.upvotes, s.comments, s.rank, s.timestamp
      from raw.snapshot s
      where s.project_id = il.project_id and s.platform = il.platform
      order by s.timestamp desc
      limit 1
    ) latest on true
    where il.project_id = ${project.id}
    order by il.platform, latest.timestamp desc nulls last
  `;

  const metrics = await sql<ProjectMetricPoint[]>`
    select
      to_char(pm.date, 'YYYY-MM-DD') as date,
      pm.github_stars,
      pm.ph_upvotes,
      pm.hn_score,
      pm.reddit_score
    from app.project_metric pm
    where pm.project_id = ${project.id}
    order by pm.date asc
  `;

  return { ...project, platforms, metrics };
}

// ---------------------------------------------------------------------------
// YouTube video insights (/youtube-insights)
// ---------------------------------------------------------------------------

/**
 * One LLM-analysed YouTube video (app.video_insight). The jsonb array columns
 * (`trends`, `topics`, `tools_mentioned`) come back already parsed as string
 * arrays from the postgres driver. `published_at` is rendered to a YYYY-MM-DD
 * string for stable SSR.
 */
export interface VideoInsight {
  id: string;
  video_id: string;
  channel_title: string;
  video_title: string;
  video_url: string;
  thumbnail_url: string | null;
  published_at: string | null; // YYYY-MM-DD
  trends: string[];
  topics: string[];
  tools_mentioned: string[];
  sentiment: string | null; // positive | neutral | negative
  key_insight: string | null; // English summary paragraph (2–4 sentences)
  key_insight_zh: string | null; // Chinese summary paragraph (migration 0009)
  relevance_score: number | null; // 1–10
  category: string | null; // ai_ml | developer_tools | … (migration 0010)
}

/**
 * Video insights, newest first. The /youtube-insights digest pulls the whole
 * set in one request (no pagination); `limit`/`offset` stay available for
 * bounded callers. Videos without a published date sort last so the freshest
 * analysed content leads.
 */
export async function getVideoInsights(limit: number, offset = 0): Promise<VideoInsight[]> {
  return await sql<VideoInsight[]>`
    select
      vi.id,
      vi.video_id,
      vi.channel_title,
      vi.video_title,
      vi.video_url,
      vi.thumbnail_url,
      to_char(vi.published_at, 'YYYY-MM-DD') as published_at,
      coalesce(vi.trends, '[]'::jsonb) as trends,
      coalesce(vi.topics, '[]'::jsonb) as topics,
      coalesce(vi.tools_mentioned, '[]'::jsonb) as tools_mentioned,
      vi.sentiment,
      vi.key_insight,
      -- Read via to_jsonb so the query is resilient to migration 0009 not yet
      -- being applied: a missing column yields NULL instead of erroring (which
      -- would otherwise 500 the home page, since getTopVideoInsights runs there).
      (to_jsonb(vi) ->> 'key_insight_zh') as key_insight_zh,
      vi.relevance_score,
      -- category column likewise read defensively (migration 0010): NULL until applied.
      (to_jsonb(vi) ->> 'category') as category
    from app.video_insight vi
    order by vi.published_at desc nulls last, vi.created_at desc
    limit ${limit}
    offset ${offset}
  `;
}

/**
 * The most recent high-relevance insights (relevance_score >= 7) for the home
 * "Latest video insights" strip.
 */
export async function getTopVideoInsights(limit: number): Promise<VideoInsight[]> {
  return await sql<VideoInsight[]>`
    select
      vi.id,
      vi.video_id,
      vi.channel_title,
      vi.video_title,
      vi.video_url,
      vi.thumbnail_url,
      to_char(vi.published_at, 'YYYY-MM-DD') as published_at,
      coalesce(vi.trends, '[]'::jsonb) as trends,
      coalesce(vi.topics, '[]'::jsonb) as topics,
      coalesce(vi.tools_mentioned, '[]'::jsonb) as tools_mentioned,
      vi.sentiment,
      vi.key_insight,
      -- Read via to_jsonb so the query is resilient to migration 0009 not yet
      -- being applied: a missing column yields NULL instead of erroring (which
      -- would otherwise 500 the home page, since getTopVideoInsights runs there).
      (to_jsonb(vi) ->> 'key_insight_zh') as key_insight_zh,
      vi.relevance_score,
      -- category column likewise read defensively (migration 0010): NULL until applied.
      (to_jsonb(vi) ->> 'category') as category
    from app.video_insight vi
    where vi.relevance_score >= 7
    order by vi.published_at desc nulls last, vi.created_at desc
    limit ${limit}
  `;
}

/**
 * A page of video insights restricted to one `category`, newest first. Like
 * getVideoInsights but with a category filter. The filter is applied through
 * to_jsonb so it can't error if migration 0010 isn't applied yet (it simply
 * matches nothing — the `category` json key is absent — until the column lands).
 */
export async function getVideoInsightsByCategory(
  category: string,
  limit: number,
  offset = 0,
): Promise<VideoInsight[]> {
  return await sql<VideoInsight[]>`
    select
      vi.id,
      vi.video_id,
      vi.channel_title,
      vi.video_title,
      vi.video_url,
      vi.thumbnail_url,
      to_char(vi.published_at, 'YYYY-MM-DD') as published_at,
      coalesce(vi.trends, '[]'::jsonb) as trends,
      coalesce(vi.topics, '[]'::jsonb) as topics,
      coalesce(vi.tools_mentioned, '[]'::jsonb) as tools_mentioned,
      vi.sentiment,
      vi.key_insight,
      (to_jsonb(vi) ->> 'key_insight_zh') as key_insight_zh,
      vi.relevance_score,
      (to_jsonb(vi) ->> 'category') as category
    from app.video_insight vi
    where (to_jsonb(vi) ->> 'category') = ${category}
    order by vi.published_at desc nulls last, vi.created_at desc
    limit ${limit}
    offset ${offset}
  `;
}

/**
 * Total number of analysed videos, optionally restricted to one `category`
 * (drives the /youtube-insights pager). Category filter is to_jsonb-based for
 * migration-0010 resilience.
 */
export async function getVideoInsightCount(category?: string): Promise<number> {
  const [row] = category
    ? await sql<{ n: number }[]>`
        select count(*)::int as n
        from app.video_insight vi
        where (to_jsonb(vi) ->> 'category') = ${category}
      `
    : await sql<{ n: number }[]>`select count(*)::int as n from app.video_insight`;
  return row?.n ?? 0;
}

/**
 * Distinct insight categories with their counts, busiest first. Read via
 * to_jsonb so it returns a single NULL-category bucket (instead of erroring)
 * until migration 0010 adds the column.
 */
export async function getVideoInsightCategories(): Promise<
  { category: string | null; cnt: number }[]
> {
  return await sql<{ category: string | null; cnt: number }[]>`
    select (to_jsonb(vi) ->> 'category') as category, count(*)::int as cnt
    from app.video_insight vi
    group by 1
    order by cnt desc
  `;
}

// ---------------------------------------------------------------------------
// Weekly hot trends (/trends)
// ---------------------------------------------------------------------------

export interface WeeklyTrendProduct {
  name: string;
  slug: string;
  platform: string;
  description: string;
  score: number;
}

/** One weekly trend report (app.weekly_trend, migration 0012). */
export interface WeeklyTrend {
  id: string;
  week_start: string; // YYYY-MM-DD
  week_end: string; // YYYY-MM-DD
  summary_en: string;
  summary_zh: string;
  top_products: WeeklyTrendProduct[];
  emerging_themes: string[];
  video_highlights: string;
  total_projects_scanned: number;
  total_signals_generated: number;
  total_insights_collected: number;
  created_at: string; // YYYY-MM-DD
}

/**
 * The most recent weekly trend report, or null when none exists yet. Wrapped in
 * a try/catch so the /trends page degrades to its empty state (instead of
 * 500-ing) before migration 0012 creates app.weekly_trend — 42P01 is
 * "undefined_table", 42703 "undefined_column" during a partial rollout.
 */
export async function getLatestWeeklyTrend(): Promise<WeeklyTrend | null> {
  try {
    const rows = await sql<WeeklyTrend[]>`
      select
        id::text,
        to_char(week_start, 'YYYY-MM-DD') as week_start,
        to_char(week_end, 'YYYY-MM-DD') as week_end,
        summary_en,
        summary_zh,
        coalesce(top_products, '[]'::jsonb) as top_products,
        coalesce(emerging_themes, '{}') as emerging_themes,
        video_highlights,
        total_projects_scanned,
        total_signals_generated,
        total_insights_collected,
        to_char(created_at, 'YYYY-MM-DD') as created_at
      from app.weekly_trend
      order by created_at desc
      limit 1
    `;
    return rows[0] ?? null;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42P01' || code === '42703') return null;
    throw err;
  }
}
