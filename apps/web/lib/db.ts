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
