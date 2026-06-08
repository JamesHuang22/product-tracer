# Assistant Queue — Claude Code → Alex (Backend)

## ✅ YouTube collector — OAuth + dynamic subscriptions + 8h cron — done

Worker typecheck passes. Graceful skip still works (no auth → logs + exit 0).
No new dependencies (native `fetch` only), so `--frozen-lockfile` is unaffected.

### What changed
| File | Change |
|---|---|
| `apps/worker/src/collectors/youtube.ts` | New `YtAuth` union (oauth bearer \| api key); `getSubscribedChannels(accessToken, maxChannels=100)` (paginated `subscriptions?mine=true`); `isAuthConfigured()` now true for `GOOGLE_OAUTH_TOKEN` **or** `YOUTUBE_API_KEY`; `getChannelVideos(channelId, auth, …)` re-signed to take `YtAuth`. |
| `apps/worker/src/scripts/collect-youtube.ts` | New `resolveSource()` — OAuth → live subscriptions; else static list. Loop passes `auth`. `YOUTUBE_MAX_CHANNELS` cap (default 100). |
| `apps/worker/src/scripts/refresh-google-token.mjs` | **New.** Exchanges refresh token → access token, prints it to stdout. Missing creds → exit 0 (no token); broken creds → exit 1. |
| `.github/workflows/collect-youtube.yml` | Cron `0 8 * * 1` → `0 */8 * * *`; added a masked OAuth-refresh step that feeds `GOOGLE_OAUTH_TOKEN` into the collector. |

### ⚠️ Heads-up #1 — the Gmail refresh token will NOT work as-is (action needed)
An OAuth refresh token only grants the scopes it was **consented to at mint time**.
The existing `alexchenog23` token was minted for Gmail scopes only, so it
**cannot** read YouTube subscriptions — `subscriptions?mine=true` will return
`403 insufficient scope` (the collector logs it and falls back to the static
list, so it won't crash, but you won't get dynamic subscriptions).

To actually get subscriptions you must **re-consent and mint a NEW refresh token**
whose scope set includes `https://www.googleapis.com/auth/youtube.readonly`
(alongside the Gmail scopes if you want one token for both). Use the same OAuth
client; just add the scope to the consent request and re-authorize. The new
`refresh_token` is what goes into the `GOOGLE_REFRESH_TOKEN` secret.

### ⚠️ Heads-up #2 — I switched the video fetch off `search.list` (quota)
The original collector fetched a channel's latest videos via `search.list` =
**100 quota units per channel**. With "every 8h × all subscriptions × 10 videos"
that blows the default 10k-unit/day quota almost immediately (≈100 channels =
one run = whole day's quota, and there are 3 runs/day).

I changed `getChannelVideos` to read the channel's **uploads playlist**
(`playlistItems.list`, **1 unit**) + `videos.list` (1 unit) = ~2 units/channel.
That's a 50× reduction and is what makes the 8h cadence over every subscription
actually viable (100 channels ≈ 200 units/run, ~600/day — well inside quota).
Implementation note: the uploads playlist id is the channel id with `UC` → `UU`
(standard for YT channels). Behaviour is otherwise identical (newest-first,
full description + stats from `videos.list`).

### Dedup — verified
- `app.project`: `insert … on conflict (slug) do update` — re-seen repos enrich,
  never duplicate.
- `app.identity_link`: `on conflict (platform, external_id) do nothing` —
  `external_id` is `"{videoId}:{owner/repo}"`, so re-processing a video is a
  no-op.
- `raw.snapshot`: **intentionally appends** one row per run (no conflict clause)
  — this is the time-series engagement record, identical to every other
  collector (github/hn/ph/reddit/x). Re-runs add fresh view/like points, they
  don't duplicate projects. So "skip already-stored videos" holds for
  projects/links; snapshots accumulate by design.

### Fallback chain (unchanged failure-safety)
1. `GOOGLE_OAUTH_TOKEN` set + subscriptions readable → **dynamic** subscriptions.
2. OAuth token set but subscriptions empty/403 → static `youtube-channels.json`
   (∪ `DEFAULT_CHANNELS`), fetched with the API key if present, else the token.
3. Only `YOUTUBE_API_KEY` set → static list (original behaviour).
4. Neither set → log + exit 0.

### GitHub secrets James needs to add
| Secret | Source | Notes |
|---|---|---|
| `GOOGLE_CLIENT_ID` | gmail-credentials.json | reuse existing OAuth client |
| `GOOGLE_CLIENT_SECRET` | gmail-credentials.json | |
| `GOOGLE_REFRESH_TOKEN` | **new** token minted with `youtube.readonly` scope | see Heads-up #1 — the current Gmail-only token won't grant subscriptions |
| `YOUTUBE_API_KEY` | already set | kept as fallback |
| `DATABASE_URL` | already set | |

`YOUTUBE_MAX_CHANNELS` (optional repo/Actions var) caps channels swept per run
(default 100).
