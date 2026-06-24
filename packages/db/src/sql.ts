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

/**
 * Optionally switch Supabase's **session** pooler (port 5432) to the
 * **transaction** pooler (6543) — same host + credentials, only the port
 * differs. Session mode gives every client a dedicated server connection and
 * caps total clients very low (pool_size 15 here), so a serverless fan-out
 * exhausts it and throws `EMAXCONNSESSION`; transaction mode multiplexes many
 * clients over a small connection set and is the documented serverless choice.
 *
 * OPT-IN (`PG_USE_TRANSACTION_POOLER=1`) and off by default: enabling it live
 * caused DB requests to hang on this project (the :6543 endpoint did not behave
 * as a drop-in for :5432 from Vercel — likely needs Supabase-side config such as
 * the IPv4 add-on / pooler settings). The durable fix is for an operator to wire
 * DATABASE_URL to a verified transaction-pooler URL (or raise the session
 * pool_size) and flip this flag on. Safe codebase-wise: `prepare: false` is set
 * and no session-scoped features (LISTEN/NOTIFY, advisory locks, GUCs) are used.
 */
function preferTransactionPooler(url: string): string {
  if (process.env.PG_USE_TRANSACTION_POOLER !== '1') return url;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('.pooler.supabase.com') && u.port === '5432') {
      u.port = '6543';
      return u.toString();
    }
  } catch {
    // Not a parseable URL — leave it untouched.
  }
  return url;
}

export function createSqlClient(): SqlClient {
  if (g.__ptSql) return g.__ptSql;
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('Missing DATABASE_URL. Check .env (Supabase → Connect → Session pooler URI).');
  }
  const url = preferTransactionPooler(raw);
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
