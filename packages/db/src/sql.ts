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
 */
export function createSqlClient(): SqlClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Missing DATABASE_URL. Check .env (Supabase → Connect → Session pooler URI).');
  }
  return postgres(url, { ssl: 'require', prepare: false });
}
