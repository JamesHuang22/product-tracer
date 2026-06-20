# Response: LLM-powered dedup pipeline ✅

Done — shipped as **PR #28** (merged to main, `d4c309d`). Production verified **HTTP/2 200**.

## What changed

| File | What |
|------|------|
| `packages/db/migrations/0011_dedup.sql` | **New.** `merged_into_id` + `dedup_status` on `app.project` & `app.video_insight`, partial scan indexes. |
| `apps/worker/src/scripts/dedup.ts` | **New.** The dedup pipeline (~440 lines incl. comments). |
| `.github/workflows/dedup.yml` | **New.** Daily 03:00 UTC + manual dispatch. |
| `apps/worker/package.json` + root `package.json` | Added `dedup` script. |
| `CHANGELOG.md`, `DECISIONS.md` | New entries. |

Untouched, as instructed: `apps/web/`, `assistant-queue/` (other files).

## How it works

1. **Candidates (cheap, deterministic).** Group active rows by a normalised key and
   pair within each group — projects by normalised `primary_url` *and* a stopword-stripped
   name key; insights by a normalised `video_title` key. Pairs are de-duped across keys.
   This avoids an O(n²) LLM bill — only genuine look-alikes reach the model.
2. **LLM confirmation.** One DeepSeek call per pair (`callLlm`, JSON mode) →
   `{is_duplicate, confidence 0–1, reason}`, zod-validated + fence-tolerant.
3. **Act.**
   - confidence **≥ 0.8** → **merge**: fold the poorer/newer row into the keeper
     (`dedup_status='merged'`, `merged_into_id`). For projects, **re-point**
     `app.identity_link` + `raw.snapshot` to the keeper inside a transaction, so no
     cross-platform evidence or engagement history is lost.
   - **0.5–0.8** → flag `dedup_status='duplicate_candidate'` for human review.
   - below → leave active.
4. **Report.** Summary row to `raw.collector_error` (`platform='dedup'`,
   `error_type='dedup_report'`) — counts, tokens, est. cost.

**Keeper choice:** the project with more `identity_link` rows (more corroboration), tie-broken
by older `created_at`; insights keep the older row. `DEDUP_MAX_PAIRS` (default 80) caps cost.

## Design notes / one safety simplification

- **Soft-merge, not DELETE** — auditable and reversible via `merged_into_id`.
- **Re-pointing is collision-free.** `app.identity_link` has a *global*
  `unique(platform, external_id)`, so two distinct projects can never hold the same link.
  That means folding a merged project's links into the keeper is a plain `UPDATE … set
  project_id = keeper` with no conflict handling needed. Each merge runs in a transaction.
- Insights have no links/snapshots, so their merge is just the status stamp.

## Manual step for James (required before first run)

Apply the migration: Supabase → SQL Editor → paste `0011_dedup.sql` → Run. The script
reads/writes `dedup_status` / `merged_into_id`, so the columns must exist first. Then
trigger **Dedup** (Actions → Run workflow) or wait for 03:00 UTC.

## Verification

- `pnpm --filter @product-tracer/worker typecheck` ✅ (CI + local)
- `prettier --check` ✅
- After a run:
  ```sql
  select payload from raw.collector_error
  where error_type='dedup_report' order by occurred_at desc limit 1;

  select dedup_status, count(*) from app.project group by 1;
  ```

## Cross-cutting

`app.project` and `app.video_insight` gained `dedup_status` / `merged_into_id`. The frontend
should filter out `dedup_status='merged'` rows (and may surface `duplicate_candidate` for
review) — that's a separate `FRONTEND_REQUEST.md` (out of my scope).

---

Ready for the next task. Until a new `REQUEST.md` appears I'll keep polling every 30 min
and shut down after 6 empty polls.
