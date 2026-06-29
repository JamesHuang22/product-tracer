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
  /** AI-generated project summary (app.project.ai_summary, migration 0013); null until generated. */
  ai_summary: string | null;
  category: string | null;
  /** AI-classified category (app.project.llm_category); null until classified. */
  llm_category: string | null;
  primary_url: string | null;
  github_stars: number | null;
  github_forks: number | null;
  created_at: string;
  /** Distinct platforms this project has an identity_link on (github, hacker_news, …). */
  platforms: string[];
  /** AI-generated granular tags (app.project.tags, migration 0015); [] until generated. */
  tags: string[];
  /** Upvote/downvote tallies (app.project.upvotes/downvotes, migration 0019); 0 until voted. */
  upvotes: number;
  downvotes: number;
}

export async function getAllProjects(): Promise<ProjectListItem[]> {
  return await sql<ProjectListItem[]>`
    select
      p.id,
      p.slug,
      p.name,
      p.one_liner,
      -- Defensive read via to_jsonb: resilient if the column is ever absent.
      (to_jsonb(p) ->> 'ai_summary') as ai_summary,
      p.category,
      p.llm_category,
      p.primary_url,
      latest.stars as github_stars,
      latest.forks as github_forks,
      p.created_at,
      coalesce(p.tags, '{}') as tags,
      coalesce((to_jsonb(p) ->> 'upvotes')::int, 0) as upvotes,
      coalesce((to_jsonb(p) ->> 'downvotes')::int, 0) as downvotes,
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
      -- Defensive read via to_jsonb: resilient if the column is ever absent.
      (to_jsonb(p) ->> 'ai_summary') as ai_summary,
      p.category,
      p.llm_category,
      p.primary_url,
      latest.stars as github_stars,
      latest.forks as github_forks,
      p.created_at,
      coalesce(p.tags, '{}') as tags,
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

/**
 * Projects matching the given slugs, in the same shape as getAllProjects.
 * Backs the /bookmarks page (slugs come from the visitor's localStorage).
 * Empty input → empty list (skips the round-trip). Result order is by stars,
 * not input order — the page is a small set, not a ranked feed.
 */
export async function getProjectsBySlugs(slugs: string[]): Promise<ProjectListItem[]> {
  if (slugs.length === 0) return [];
  return await sql<ProjectListItem[]>`
    select
      p.id,
      p.slug,
      p.name,
      p.one_liner,
      -- Defensive read via to_jsonb: resilient if the column is ever absent.
      (to_jsonb(p) ->> 'ai_summary') as ai_summary,
      p.category,
      p.llm_category,
      p.primary_url,
      latest.stars as github_stars,
      latest.forks as github_forks,
      p.created_at,
      coalesce(p.tags, '{}') as tags,
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
    where p.slug = any(${slugs})
    order by latest.stars desc nulls last, p.created_at desc
  `;
}

/** Total number of tracked projects (home stats bar). */
export async function getTotalProjectCount(): Promise<number> {
  const [row] = await sql<{ n: number }[]>`select count(*)::int as n from app.project`;
  return row?.n ?? 0;
}

/** Projects with a generated AI summary (landing stats strip). Read via to_jsonb
 * so it returns 0 (not an error) until migration 0013 adds `ai_summary`. */
export async function getAiSummaryCount(): Promise<number> {
  const [row] = await sql<{ n: number }[]>`
    select count(*)::int as n
    from app.project p
    where nullif(btrim(to_jsonb(p) ->> 'ai_summary'), '') is not null
  `.catch(() => [{ n: 0 }] as { n: number }[]);
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
      -- Defensive read via to_jsonb: resilient if the column is ever absent.
      (to_jsonb(p) ->> 'ai_summary') as ai_summary,
      p.category,
      p.llm_category,
      p.primary_url,
      latest.stars as github_stars,
      latest.forks as github_forks,
      p.created_at,
      coalesce(p.tags, '{}') as tags,
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
      -- Defensive read via to_jsonb: resilient if the column is ever absent.
      (to_jsonb(p) ->> 'ai_summary') as ai_summary,
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
  /** AI-generated project summary (app.project.ai_summary, migration 0013); null until generated. */
  ai_summary: string | null;
  category: string | null;
  llm_category: string | null;
  primary_url: string | null;
  created_at: string; // YYYY-MM-DD
  /** AI-generated granular tags (app.project.tags, migration 0015); [] until generated. */
  tags: string[];
  /** Upvote/downvote tallies (app.project, migration 0019); 0 until voted. */
  upvotes: number;
  downvotes: number;
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
      ai_summary: string | null;
      category: string | null;
      llm_category: string | null;
      primary_url: string | null;
      created_at: string;
      tags: string[];
      upvotes: number;
      downvotes: number;
    }[]
  >`
    select
      p.id, p.slug, p.name, p.one_liner,
      (to_jsonb(p) ->> 'ai_summary') as ai_summary,
      p.category, p.llm_category, p.primary_url,
      to_char(p.created_at, 'YYYY-MM-DD') as created_at,
      coalesce(p.tags, '{}') as tags,
      coalesce((to_jsonb(p) ->> 'upvotes')::int, 0) as upvotes,
      coalesce((to_jsonb(p) ->> 'downvotes')::int, 0) as downvotes
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

/** A mini-card entry for the "You might also like" row on the detail page. */
export interface RelatedProject {
  id: string;
  slug: string;
  name: string;
  one_liner: string | null;
  /** Latest GitHub stars (raw.snapshot); null when the project has no GH snapshot. */
  stars: number | null;
}

/**
 * Up to `limit` other projects in the same `llm_category`, for the detail-page
 * recommendation row ("You might also like"). Excludes the current slug and any
 * project merged away by dedup.
 *
 * Ordering: the spec asks for `stars * 0.7 + quality_score * 0.3`, but
 * app.project has no quality_score column (and no stars column — stars live in
 * raw.snapshot). With quality unavailable the weighted score collapses to its
 * dominant term, so we order by latest GitHub stars desc, recency as tiebreak.
 * Returns [] when the project has no category (nothing meaningful to relate on).
 */
export async function getRelatedProjects(
  slug: string,
  category: string | null,
  limit = 4,
): Promise<RelatedProject[]> {
  if (!category) return [];
  return await sql<RelatedProject[]>`
    select
      p.id, p.slug, p.name, p.one_liner,
      latest.stars as stars
    from app.project p
    left join lateral (
      select s.stars
      from raw.snapshot s
      where s.project_id = p.id and s.platform = 'github'
      order by s.timestamp desc
      limit 1
    ) latest on true
    where p.llm_category = ${category}
      and p.slug <> ${slug}
      and p.merged_into_id is null
    order by latest.stars desc nulls last, p.created_at desc
    limit ${limit}
  `;
}

/** One hit from the fuzzy project search (/api/search). */
export interface ProjectSearchResult {
  slug: string;
  name: string;
  one_liner: string | null;
  /** Latest GitHub stars (raw.snapshot); null when no GH snapshot. */
  stars: number | null;
}

/**
 * Fuzzy project search over name + one_liner, powered by pg_trgm (migration
 * 0014). Combines a substring match on name (catches short queries the trigram
 * `%` threshold would miss, e.g. "ai") with trigram similarity on both columns,
 * ranked by name similarity then stars. Excludes dedup-merged projects. Empty /
 * whitespace query returns []. Capped at 20 rows.
 */
export async function searchProjects(query: string): Promise<ProjectSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const like = `%${q}%`;
  return await sql<ProjectSearchResult[]>`
    select
      p.slug, p.name, p.one_liner,
      latest.stars as stars
    from app.project p
    left join lateral (
      select s.stars
      from raw.snapshot s
      where s.project_id = p.id and s.platform = 'github'
      order by s.timestamp desc
      limit 1
    ) latest on true
    where p.merged_into_id is null
      and (p.name ilike ${like} or p.name % ${q} or p.one_liner % ${q})
    order by similarity(p.name, ${q}) desc nulls last, latest.stars desc nulls last
    limit 20
  `;
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
    -- Skip rows with no usable summary in EITHER language: they render as an
    -- empty card on /youtube-insights (just sentiment + "Watch on YouTube").
    -- Mirrors getTopVideoInsights; the pager (getVideoInsightCount) applies the
    -- same predicate so totals stay in sync.
    where (
      nullif(btrim(vi.key_insight), '') is not null
      or nullif(btrim(to_jsonb(vi) ->> 'key_insight_zh'), '') is not null
    )
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
      -- Skip insights with no usable summary text in EITHER language — they
      -- render as an empty card on the home page (just a "Watch on YouTube"
      -- link). key_insight_zh is read defensively via to_jsonb (migration 0009).
      and (
        nullif(btrim(vi.key_insight), '') is not null
        or nullif(btrim(to_jsonb(vi) ->> 'key_insight_zh'), '') is not null
      )
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
export async function getVideoInsightsByCategories(
  categories: string[],
  limit: number,
  offset = 0,
): Promise<VideoInsight[]> {
  if (categories.length === 0) return getVideoInsights(limit, offset);
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
    where (to_jsonb(vi) ->> 'category') = any(${categories})
      -- Same empty-summary guard as getVideoInsights (kept in sync with the pager).
      and (
        nullif(btrim(vi.key_insight), '') is not null
        or nullif(btrim(to_jsonb(vi) ->> 'key_insight_zh'), '') is not null
      )
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
export async function getVideoInsightCount(categories?: string[]): Promise<number> {
  const [row] =
    categories && categories.length > 0
      ? await sql<{ n: number }[]>`
        select count(*)::int as n
        from app.video_insight vi
        where (to_jsonb(vi) ->> 'category') = any(${categories})
          and (
            nullif(btrim(vi.key_insight), '') is not null
            or nullif(btrim(to_jsonb(vi) ->> 'key_insight_zh'), '') is not null
          )
      `
      : await sql<{ n: number }[]>`
        select count(*)::int as n
        from app.video_insight vi
        where (
          nullif(btrim(vi.key_insight), '') is not null
          or nullif(btrim(to_jsonb(vi) ->> 'key_insight_zh'), '') is not null
        )
      `;
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
    -- Count only rows that will actually render (same guard as the list/pager),
    -- so the dropdown badges match the visible card count.
    where (
      nullif(btrim(vi.key_insight), '') is not null
      or nullif(btrim(to_jsonb(vi) ->> 'key_insight_zh'), '') is not null
    )
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
export async function getLatestWeeklyTrend(weekStart?: string): Promise<WeeklyTrend | null> {
  try {
    const rows = await sql<WeeklyTrend[]>`
      select
        id::text,
        to_char(week_start, 'YYYY-MM-DD') as week_start,
        to_char(week_end, 'YYYY-MM-DD') as week_end,
        summary_en,
        summary_zh,
        coalesce(top_products, '[]'::jsonb) as top_products,
        coalesce(emerging_themes, '{}'::text[]) as emerging_themes,
        video_highlights,
        total_projects_scanned,
        total_signals_generated,
        total_insights_collected,
        to_char(created_at, 'YYYY-MM-DD') as created_at
      from app.weekly_trend
      -- Only weeks that have fully ended (week_end already in the past). Hides the
      -- in-progress current week so /trends never shows an incomplete/empty report
      -- (TASK-011). current_date is UTC, matching how week_start/_end are stored.
      where week_end < current_date
        ${weekStart ? sql`and week_start = ${weekStart}` : sql``}
      order by week_start desc
      limit 1
    `;
    return rows[0] ?? null;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42P01' || code === '42703') return null;
    throw err;
  }
}

/**
 * Distinct weeks that have a trend report, newest first — drives the /trends
 * week selector. Same empty-state resilience as the other trend queries
 * (returns [] before migration 0012 lands). ISO `YYYY-MM-DD` strings sort
 * chronologically, so ordering by the formatted `week_start` is correct.
 */
export async function getTrendWeeks(): Promise<{ week_start: string; week_end: string }[]> {
  try {
    return await sql<{ week_start: string; week_end: string }[]>`
      select distinct
        to_char(week_start, 'YYYY-MM-DD') as week_start,
        to_char(week_end, 'YYYY-MM-DD') as week_end
      from app.weekly_trend
      -- Exclude the in-progress current week from the selector (TASK-011).
      where week_end < current_date
      order by week_start desc
    `;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42P01' || code === '42703') return [];
    throw err;
  }
}

/**
 * The most recent `limit` weekly trend reports, newest first. Drives the /trends
 * week-over-week comparison (this week vs last). Same empty-state resilience as
 * getLatestWeeklyTrend — returns [] before migration 0012 lands.
 */
export async function getRecentWeeklyTrends(limit = 2): Promise<WeeklyTrend[]> {
  try {
    return await sql<WeeklyTrend[]>`
      select
        id::text,
        to_char(week_start, 'YYYY-MM-DD') as week_start,
        to_char(week_end, 'YYYY-MM-DD') as week_end,
        summary_en,
        summary_zh,
        coalesce(top_products, '[]'::jsonb) as top_products,
        coalesce(emerging_themes, '{}'::text[]) as emerging_themes,
        video_highlights,
        total_projects_scanned,
        total_signals_generated,
        total_insights_collected,
        to_char(created_at, 'YYYY-MM-DD') as created_at
      from app.weekly_trend
      -- Exclude the in-progress current week so week-over-week compares only
      -- fully-ended weeks (TASK-011).
      where week_end < current_date
      order by week_start desc
      limit ${limit}
    `;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42P01' || code === '42703') return [];
    throw err;
  }
}

/** One bar of the /trends distribution chart. */
export interface TrendDistributionBar {
  label: string;
  count: number;
}

/**
 * Distribution of the current week's top products for the /trends bar chart.
 * Buckets by the product's project `llm_category` when known, falling back to
 * its `platform` (then 'other') — most trend products are HN/PH posts that
 * aren't classified projects, so a pure llm_category chart would be a single
 * "uncategorized" bar. This yields a varied, real breakdown that auto-sharpens
 * into true categories as classification backfills. Empty before migration 0012.
 */
export async function getTrendCategoryDistribution(
  weekStart?: string,
): Promise<TrendDistributionBar[]> {
  try {
    return await sql<TrendDistributionBar[]>`
      with latest as (
        select top_products from app.weekly_trend
        ${weekStart ? sql`where week_start = ${weekStart}` : sql``}
        order by created_at desc limit 1
      )
      select
        case
          when p.llm_category is not null then p.llm_category
          when tp.platform in ('github','hacker_news','product_hunt','youtube','reddit','x')
            then tp.platform
          else 'other'
        end as label,
        count(*)::int as count
      from latest,
           jsonb_to_recordset(latest.top_products) as tp(slug text, platform text)
      left join app.project p on p.slug = tp.slug
      group by 1
      order by count desc, label asc
    `;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42P01' || code === '42703') return [];
    throw err;
  }
}

/**
 * The current week's top `limit` products by combined score, for the /trends
 * "Top products" list. Reads directly from the latest weekly_trend's
 * top_products jsonb (which carries name/slug/platform/description/score).
 */
export async function getTrendTopProducts(
  limit = 5,
  weekStart?: string,
): Promise<WeeklyTrendProduct[]> {
  try {
    return await sql<WeeklyTrendProduct[]>`
      with latest as (
        select top_products from app.weekly_trend
        ${weekStart ? sql`where week_start = ${weekStart}` : sql``}
        order by created_at desc limit 1
      )
      select tp.name, tp.slug, tp.platform, tp.description, coalesce(tp.score, 0)::int as score
      from latest,
           jsonb_to_recordset(latest.top_products)
             as tp(name text, slug text, platform text, description text, score numeric)
      order by tp.score desc nulls last
      limit ${limit}
    `;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42P01' || code === '42703') return [];
    throw err;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// User bookmarks (app.bookmark, migration 0017)
//
// Persisted per authenticated user. Accessed via this server-side connection
// (bypasses RLS), so every query MUST scope by the caller's verified user id —
// never trust a user id from the client. Callers pass the id resolved from the
// Supabase session (see lib/supabase/server.ts → getUser).
// ────────────────────────────────────────────────────────────────────────────

/** Slugs the user has bookmarked, newest-first. */
export async function getBookmarkedSlugs(userId: string): Promise<string[]> {
  const rows = await sql<{ slug: string }[]>`
    select p.slug
    from app.bookmark b
    join app.project p on p.id = b.project_id
    where b.user_id = ${userId}
    order by b.created_at desc
  `;
  return rows.map((r) => r.slug);
}

/** Full project cards for the user's bookmarks, newest-bookmarked first. */
export async function getBookmarkedProjects(userId: string): Promise<ProjectListItem[]> {
  return await sql<ProjectListItem[]>`
    select
      p.id,
      p.slug,
      p.name,
      p.one_liner,
      (to_jsonb(p) ->> 'ai_summary') as ai_summary,
      p.category,
      p.llm_category,
      p.primary_url,
      latest.stars as github_stars,
      latest.forks as github_forks,
      p.created_at,
      coalesce(p.tags, '{}') as tags,
      coalesce(
        (select array_agg(distinct il.platform)
         from app.identity_link il where il.project_id = p.id),
        '{}'
      ) as platforms
    from app.bookmark b
    join app.project p on p.id = b.project_id
    left join lateral (
      select s.stars, s.forks
      from raw.snapshot s
      where s.project_id = p.id and s.platform = 'github'
      order by s.timestamp desc
      limit 1
    ) latest on true
    where b.user_id = ${userId}
    order by b.created_at desc
  `;
}

/**
 * Toggle a bookmark by project slug. Returns the new state (true = bookmarked)
 * and whether the slug resolved to a real project. Unknown slugs are a no-op.
 */
export async function toggleBookmarkDb(
  userId: string,
  slug: string,
): Promise<{ bookmarked: boolean; found: boolean }> {
  const [project] = await sql<{ id: string }[]>`
    select id from app.project where slug = ${slug} limit 1
  `;
  if (!project) return { bookmarked: false, found: false };

  const deleted = await sql`
    delete from app.bookmark
    where user_id = ${userId} and project_id = ${project.id}
    returning project_id
  `;
  if (deleted.length > 0) return { bookmarked: false, found: true };

  await sql`
    insert into app.bookmark (user_id, project_id)
    values (${userId}, ${project.id})
    on conflict (user_id, project_id) do nothing
  `;
  return { bookmarked: true, found: true };
}

/**
 * Merge a set of slugs (e.g. a guest's localStorage bookmarks) into the user's
 * saved set on login. Idempotent — existing rows are left untouched. Returns
 * the resulting full slug set (newest-first) so the client can sync.
 */
export async function mergeBookmarks(userId: string, slugs: string[]): Promise<string[]> {
  if (slugs.length > 0) {
    await sql`
      insert into app.bookmark (user_id, project_id)
      select ${userId}, p.id
      from app.project p
      where p.slug = any(${slugs})
      on conflict (user_id, project_id) do nothing
    `;
  }
  return getBookmarkedSlugs(userId);
}

// ---------------------------------------------------------------------------
// User-submitted products (app.user_submission, migration 0018)
// ---------------------------------------------------------------------------

export interface UserSubmission {
  id: string;
  product_name: string;
  description: string;
  product_url: string;
  github_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  review_status: 'pending' | 'valid' | 'invalid' | null;
  review_reason: string | null;
  created_at: string;
  project_slug: string | null;
}

/**
 * Record a new product submission for the authenticated user. The async AI
 * review (apps/worker submission-review) picks it up from `review_status =
 * 'pending'` and approves/flags it. Inserts via the session-verified user id.
 */
export async function submitProduct(
  userId: string,
  productName: string,
  description: string,
  productUrl: string,
  githubUrl: string | null,
): Promise<{ id: string }> {
  const [row] = await sql<{ id: string }[]>`
    insert into app.user_submission
      (user_id, product_name, description, product_url, github_url, status, review_status)
    values
      (${userId}, ${productName}, ${description}, ${productUrl}, ${githubUrl}, 'pending', 'pending')
    returning id::text as id
  `;
  return { id: row!.id };
}

/** The authenticated user's own submissions, newest first (account history). */
export async function getUserSubmissions(userId: string): Promise<UserSubmission[]> {
  return await sql<UserSubmission[]>`
    select
      s.id::text as id,
      s.product_name,
      s.description,
      s.product_url,
      s.github_url,
      s.status,
      s.review_status,
      s.review_reason,
      to_char(s.created_at, 'YYYY-MM-DD') as created_at,
      p.slug as project_slug
    from app.user_submission s
    left join app.project p on p.id = s.project_id
    where s.user_id = ${userId}
    order by s.created_at desc
  `;
}

/**
 * Projects created from approved user submissions — the "Recently Submitted by
 * Developers" section on /projects. Same shape as the other project lists.
 * Resilient to the 0018 table not existing yet (returns []).
 */
export async function getRecentlySubmittedProjects(limit = 12): Promise<ProjectListItem[]> {
  try {
    return await sql<ProjectListItem[]>`
      select
        p.id,
        p.slug,
        p.name,
        p.one_liner,
        (to_jsonb(p) ->> 'ai_summary') as ai_summary,
        p.category,
        p.llm_category,
        p.primary_url,
        latest.stars as github_stars,
        latest.forks as github_forks,
        p.created_at,
        coalesce(p.tags, '{}') as tags,
        coalesce(
          (select array_agg(distinct il.platform)
           from app.identity_link il where il.project_id = p.id),
          '{}'
        ) as platforms
      from app.user_submission s
      join app.project p on p.id = s.project_id
      left join lateral (
        select sn.stars, sn.forks
        from raw.snapshot sn
        where sn.project_id = p.id and sn.platform = 'github'
        order by sn.timestamp desc
        limit 1
      ) latest on true
      where s.status = 'approved' and s.project_id is not null
      order by s.reviewed_at desc nulls last, s.created_at desc
      limit ${limit}
    `;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42P01' || code === '42703') return [];
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Product votes (app.product_vote, migration 0019)
// ---------------------------------------------------------------------------

export type VoteValue = -1 | 0 | 1;

export interface VoteResult {
  found: boolean;
  upvotes: number;
  downvotes: number;
  /** The user's vote after this write (0 when they toggled it off). */
  userVote: VoteValue;
}

/**
 * Cast (or change, or clear) the authenticated user's vote on a project.
 * Clicking the same direction twice toggles the vote off. After mutating
 * app.product_vote, the project's denormalised upvotes/downvotes tallies are
 * recomputed from the source rows and returned for the optimistic client.
 */
export async function voteOnProject(
  userId: string,
  projectId: string,
  vote: 1 | -1,
): Promise<VoteResult> {
  const [project] = await sql<{ id: string }[]>`
    select id from app.project where id = ${projectId} limit 1
  `;
  if (!project) return { found: false, upvotes: 0, downvotes: 0, userVote: 0 };

  const [existing] = await sql<{ vote: number }[]>`
    select vote from app.product_vote
    where user_id = ${userId} and project_id = ${projectId}
    limit 1
  `;

  let userVote: VoteValue = vote;
  if (existing && existing.vote === vote) {
    // Same direction again → clear the vote.
    await sql`
      delete from app.product_vote
      where user_id = ${userId} and project_id = ${projectId}
    `;
    userVote = 0;
  } else {
    await sql`
      insert into app.product_vote (user_id, project_id, vote)
      values (${userId}, ${projectId}, ${vote})
      on conflict (user_id, project_id) do update set vote = excluded.vote, created_at = now()
    `;
  }

  const [counts] = await sql<{ upvotes: number; downvotes: number }[]>`
    update app.project p set
      upvotes = (select count(*) from app.product_vote v where v.project_id = p.id and v.vote = 1),
      downvotes = (select count(*) from app.product_vote v where v.project_id = p.id and v.vote = -1)
    where p.id = ${projectId}
    returning upvotes, downvotes
  `;

  return {
    found: true,
    upvotes: counts?.upvotes ?? 0,
    downvotes: counts?.downvotes ?? 0,
    userVote,
  };
}

/**
 * Minimal project facts for the Open Graph share card (`/og/projects/[slug]`).
 * Lean by design — just the fields the image renders — so the card stays fast.
 * Returns null when the slug is unknown (route falls back to a generic card).
 */
export interface ProjectOgData {
  name: string;
  one_liner: string | null;
  llm_category: string | null;
  github_stars: number | null;
  upvotes: number;
  downvotes: number;
  platforms: string[];
}

export async function getProjectOgData(slug: string): Promise<ProjectOgData | null> {
  const [row] = await sql<ProjectOgData[]>`
    select
      p.name,
      p.one_liner,
      p.llm_category,
      latest.stars as github_stars,
      coalesce((to_jsonb(p) ->> 'upvotes')::int, 0) as upvotes,
      coalesce((to_jsonb(p) ->> 'downvotes')::int, 0) as downvotes,
      coalesce(
        (select array_agg(distinct il.platform)
         from app.identity_link il where il.project_id = p.id),
        '{}'
      ) as platforms
    from app.project p
    left join lateral (
      select s.stars
      from raw.snapshot s
      where s.project_id = p.id and s.platform = 'github'
      order by s.timestamp desc
      limit 1
    ) latest on true
    where p.slug = ${slug}
    limit 1
  `;
  return row ?? null;
}

/** The authenticated user's current vote on a project: 1, -1, or 0 (none). */
export async function getUserVote(userId: string, projectId: string): Promise<VoteValue> {
  try {
    const [row] = await sql<{ vote: number }[]>`
      select vote from app.product_vote
      where user_id = ${userId} and project_id = ${projectId}
      limit 1
    `;
    return (row?.vote as VoteValue) ?? 0;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42P01' || code === '42703') return 0;
    throw err;
  }
}
