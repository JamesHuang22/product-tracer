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
 *
 * Pool sizing: the Supabase **session-mode** pooler caps total clients very low
 * (pool_size 15 on the current plan), and in session mode each client
 * connection holds a dedicated server connection for its whole lifetime. With
 * Vercel fanning out across many warm instances — plus the occasional worker
 * backfill — a per-instance `max` of 2 reached that ceiling and threw
 * `EMAXCONNSESSION`, 500-ing the public site. `max: 1` halves every instance's
 * footprint (and short idle/lifetime timeouts release connections fast) so far
 * more instances fit under the 15-client cap.
 *
 * Allow `PG_POOL_MAX` to override — e.g. a one-off worker run on its own can
 * safely use a couple of connections, and the real durable fix is to point
 * DATABASE_URL at Supabase's **transaction** pooler (port 6543), which
 * multiplexes hundreds of clients over a small connection set.
 */
const g = globalThis as unknown as { __ptSql?: SqlClient };

export function createSqlClient(): SqlClient {
  if (g.__ptSql) return g.__ptSql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Missing DATABASE_URL. Check .env (Supabase → Connect → Session pooler URI).');
  }
  const max = Math.max(1, Number(process.env.PG_POOL_MAX) || 1);
  g.__ptSql = postgres(url, {
    ssl: 'require',
    prepare: false,
    max,
    max_lifetime: 60,         // recycle connections after 60s to avoid stale sockets
    idle_timeout: 10,         // close idle connections after 10s
    connect_timeout: 10,      // fail fast if Supabase is unreachable
  });
  return g.__ptSql;
}
