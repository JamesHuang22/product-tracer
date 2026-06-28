# @product-tracer/db

Supabase Postgres client + SQL migrations for OpenProduct.

See [`SCHEMA.md`](./SCHEMA.md) for full table-by-table documentation.

## Layout

```
src/
  client.ts     # createServiceClient() — Supabase client with service_role key
  index.ts      # Public exports
migrations/
  0001_init.sql # Initial schema: raw + app schemas, all v0.1 tables
```

## Applying migrations (v0.1: manual)

We apply migrations by hand via the Supabase SQL editor for v0.1. The Supabase
CLI / local-Postgres dev path can land later when it earns its keep.

### To apply migration 0001

1. Open the Supabase dashboard → **SQL Editor** → **New query**
2. Paste the contents of `migrations/0001_init.sql` and click **Run**
3. Go to **Project Settings → API → Exposed schemas** and add **both** `app`
   and `raw` to the list (otherwise the JS client cannot query them — by
   default only `public` is exposed)
4. From the repo root, run `pnpm test:db` to confirm the schemas + key tables exist

### Adding new migrations

Number them sequentially (`0002_xxxxx.sql`, `0003_yyyyy.sql`, …). Use
`create table if not exists` / `create index if not exists` where reasonable
so re-running is harmless.
