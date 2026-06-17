# Response: YouTube Insights pipeline + OAuth reauth ✅

Done — shipped as **PR #20** (merged to main, `0269083`). Production verified **HTTP/2 200**.

## What I built

A second YouTube pipeline that treats each video as a first-class entity, separate
from the collector (which only mines descriptions for GitHub repos → `app.project`).

| File | What |
|------|------|
| `apps/worker/src/scripts/youtube-insights.ts` | **New.** The insights pipeline. |
| `packages/db/migrations/0008_video_insight.sql` | **New.** `app.video_insight` table + indexes (idempotent). |
| `.github/workflows/youtube-insights.yml` | **New.** Daily 05:00 UTC + manual dispatch. |
| `scripts/youtube-reauth.sh` | **New.** Guided OAuth re-consent to re-mint `GOOGLE_REFRESH_TOKEN`. |
| `apps/worker/package.json` + root `package.json` | Added `youtube:insights` script. |
| `CHANGELOG.md`, `DECISIONS.md` | New entries. |

Untouched, as instructed: `apps/web/`, the existing collector/workflow, all other
`assistant-queue/` files.

## How the insights pipeline works

1. **Resolve auth + channels** the same way as the collector — OAuth subscriptions
   (`GOOGLE_OAUTH_TOKEN`) first, else API key + static channel list.
2. **Pull latest videos** per channel (≤10, polite 1s delay), then **dedupe** against
   `app.video_insight.video_id` — only genuinely new videos are analysed.
3. **One DeepSeek call per new video** (`callLlm`, JSON mode) extracting
   `{trends[], topics[], tools_mentioned[], sentiment, key_insight, relevance_score 1–10}`.
   Response is zod-validated + fence-tolerant parsed; sloppy output degrades safely
   (missing arrays → `[]`, unknown sentiment → `neutral`, score clamped 1–10).
4. **Store** one row per video (raw LLM response + token counts kept), `on conflict
   (video_id) do nothing`. `MAX_INSIGHTS_PER_RUN` (default 40, env-overridable) caps
   cost on the first-run backlog — the rest are picked up next run, newest first.
5. **Report** a per-run summary (counts + token usage + est. cost) to
   `raw.collector_error` (`platform='youtube'`, `error_type='youtube_insights_report'`)
   — same observability channel the other pipelines use.

Graceful no-op when auth **or** `LLM_API_KEY` is unset (mirrors existing collectors).

## Problem 1 — the revoked OAuth token

`GOOGLE_REFRESH_TOKEN` returning `invalid_grant` can't be fixed in code — re-minting a
refresh token requires interactive Google consent. So `scripts/youtube-reauth.sh` walks
you through it: it builds the consent URL (scopes `youtube.readonly` + `gmail.send`,
`access_type=offline`, `prompt=consent`), you approve in a browser, paste the code back,
and it exchanges it for a fresh refresh token + prints the `gh secret set` command.

## ⚠️ Two manual steps before this runs in production

These need you (the workflow alone can't do them):

1. **Apply the migration.** Supabase → SQL Editor → paste `0008_video_insight.sql` → Run.
   *Required before the first pipeline run — the script reads/writes `app.video_insight`.*
2. **Re-mint the token.** `export GOOGLE_CLIENT_ID=… GOOGLE_CLIENT_SECRET=…` then
   `bash scripts/youtube-reauth.sh`, and update the `GOOGLE_REFRESH_TOKEN` GitHub secret.
   Until this is done, both YouTube workflows fall back to the API key + static channels
   (no dynamic subscriptions), and the pipeline still runs — just over the static list.

## How to verify

- `pnpm --filter @product-tracer/worker typecheck` ✅ (passed in CI/locally)
- After the two manual steps: GitHub → Actions → **YouTube Insights** → *Run workflow*.
  Then:
  ```sql
  select video_title, sentiment, relevance_score, key_insight
  from app.video_insight order by created_at desc limit 10;

  select payload from raw.collector_error
  where error_type='youtube_insights_report' order by occurred_at desc limit 1;
  ```

## Token cost

Per video ≈ system + capped description (~1–1.5K input) + compact JSON (~150–300 output)
≈ **~$0.0003–0.0005/video**. A run is capped at 40 videos → **< 2¢/run**; steady state
(only new daily videos) is a handful of videos → fractions of a cent. Actuals are logged
in the run summary.

## Cross-cutting

This creates `app.video_insight`, which the frontend will need to display — that's a
separate `FRONTEND_REQUEST.md` (out of my scope). The schema above is the contract.

---

Ready for the next task. Until a new `REQUEST.md` appears I'll keep polling every 30 min
and shut down after 6 empty polls.
