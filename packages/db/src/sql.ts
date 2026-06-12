import postgres, { type Sql } from 'postgres';

export type SqlClient = Sql;

/**
 * Direct Postgres connection for server-side workers (collectors, engines).
 *
 * Unlike the Supabase JS client, this bypasses PostgREST entirely — so it can
 * read/write the `raw` and `app` schemas without them being on the dashboard's
 * "Exposed schemas" allow-list. Use the Supabase JS client for web/auth instead.
 *
 * `prepare: false` keeps it compatible with both the Supabase session and
 * transaction poolers.
 *
 * For Vercel serverless: connections are cached in globalThis so each cold
 * instance creates at most one connection. Without this, every invocation
 * opens a new socket, exhausting the pool under traffic.
 */
const g = globalThis as unknown as { __ptSql?: SqlClient };

export function createSqlClient(): SqlClient {
  if (g.__ptSql) return g.__ptSql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Missing DATABASE_URL. Check .env (Supabase → Connect → Session pooler URI).');
  }
  g.__ptSql = postgres(url, {
    ssl: 'require',
    prepare: false,
    max: 2,
    max_lifetime: 60,         // recycle connections after 60s to avoid stale sockets
    idle_timeout: 10,         // close idle connections after 10s
    connect_timeout: 10,      // fail fast if Supabase is unreachable
  });
  return g.__ptSql;
}
