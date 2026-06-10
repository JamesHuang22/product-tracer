# Assistant Queue — Claude Code → Alex (Backend)

## Task 1: Growth-signal / trending engine — ✅ done

Worker typecheck passes. Safe on empty data (every rule returns no rows → 0 signals).

### Files
| File | What |
|---|---|
| `packages/db/migrations/0006_signals.sql` | New `app.signal` table (trending schema). |
| `apps/worker/src/scripts/run-signals.ts` | New rule-based engine, 7 signal types. |
| `.github/workflows/signal-trending.yml` | New — daily 07:00 UTC (after data-quality 06:00). |
| `packages/db/SCHEMA.md` | Updated the `app.signal` section to the new schema. |

### ⚠️ Heads-up #1 — `app.signal` ALREADY existed (0001); 0006 replaces it
Migration 0001 created an `app.signal` table for the old v0.1 digest design
(`type` / `severity text` / `score` / `linked_snapshot_ids` / `sent_in_digest_at`).
A repo-wide search found **no code reads or writes it** — it was schema-only. So a
bare `create table app.signal` would have failed. `0006` does
`drop table if exists app.signal cascade` then recreates with the trending
schema. Safe: nothing references it (`digest_run` keeps signal ids as a plain
`uuid[]`, not a FK). **You must run 0006 in the Supabase SQL Editor** before the
engine works.

### Notes
- **Added `unique (project_id, signal_type)`** (not in your SQL spec) — required to
  honor "upsert by project_id + signal_type". One live signal of each type per
  project; re-runs refresh severity/title/`created_at`.
- **Implemented all 7 enum types**: the 6 in your rules table **plus
  `youtube_spike`** (views grew >50% in 24h AND Δ>1000) since the enum lists it
  and YouTube data flows. Easy to drop if unwanted.
- `metadata jsonb not null default '{}'`; `expires_at = created_at + 3 days`;
  stale rows (>3 days) deleted at the start of each run.
- "Update the migration index in packages/db/migrations/" — there is **no index
  file** there (just numbered `.sql` + `.gitkeep`). I updated `packages/db/SCHEMA.md`
  instead (the actual schema doc). Say the word if you meant something else.
- Rules use precomputed `project_metric.github_stars_delta_24h` for the burst /
  rising-trend signals, and latest-2-snapshot deltas for youtube_spike. All
  set-based (no N+1).

---

## Task 2: Reddit no-OAuth refactor — ✅ code done, ⚠️ endpoint is 403-blocked

Rewrote `collectors/reddit.ts` to use the public JSON endpoint only (OAuth
removed). Same exports (`RedditPost`, `fetchSubredditHot`, `isNoisePost`,
`postSlug`, `DEFAULT_SUBREDDITS`) → `collect-reddit.ts` needed **no change**.
Worker typecheck passes.

### Files
| File | What |
|---|---|
| `apps/worker/src/collectors/reddit.ts` | Removed `getAppToken`/OAuth; plain fetch to `/r/{sub}/hot.json`; `REDDIT_USER_AGENT` env (default built-in). |
| `.github/workflows/collect-reddit.yml` | Documented no-OAuth; added optional `REDDIT_USER_AGENT` (no OAuth secrets were present to remove). |

### 🛑 Heads-up #2 — live test: Reddit returns **403 Blocked** without auth
I verified against the live API and **every** unauthenticated variant 403s from
this machine:
- `www.reddit.com/r/{sub}/hot.json`, `old.reddit.com/...`, `api.reddit.com/...`,
  `/r/{sub}.json`, `?raw_json=1`
- with UA = `ProductTracer/1.0`, a full browser UA, **and** a descriptive
  `research-bot ... (contact: …)` UA.

All return Reddit's network-level `403 Blocked` HTML page. This matches the
**warning in the code I just removed**: Reddit blocks anonymous JSON from
datacenter/cloud IPs (and is now clamping residential too). **GitHub Actions
runners are datacenter IPs, so this collector will almost certainly 403 in CI.**

The rewrite is exactly what was requested and is ready the moment unauthenticated
access works, but as of testing it does **not** return data. Options to actually
collect Reddit again:
1. Route through a residential/proxy egress for the fetch.
2. Reinstate app-only OAuth (the blocker was app *creation* under the Responsible
   Builder Policy — if an app can be created, `oauth.reddit.com` is far more
   reliable than anonymous JSON; the old code path did this).
3. Accept Reddit as best-effort and let the collector log `403` to
   `raw.collector_error` (current behavior — it won't crash the pipeline).

Your call on direction — I implemented the no-OAuth path as asked and flagged the
reality rather than reporting a false success.

---

### Verification summary
- `pnpm --filter @product-tracer/worker typecheck` ✅ (both tasks)
- Signal engine: safe-on-empty by construction; SQL is set-based, idempotent upsert.
- Reddit: code path exercised live → 403 from this IP (see Heads-up #2).

### Shared-tree note
A frontend agent is operating concurrently in this clone. I staged **only my
backend files** (not `git add -A`): the two migrations/scripts/workflows above,
`reddit.ts`, `SCHEMA.md`, `RESPONSE.md`, and the `REQUEST.md` deletion.
