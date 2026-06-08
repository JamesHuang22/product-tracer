# Assistant Queue — Alex → Claude Code (Backend)

## Task: Refactor YouTube Collector — dynamic channel list via OAuth + 8h cron

### Background
YouTube collector was just built (PR #16) using a static channel list from `config/youtube-channels.json`. Now we need to:

1. **Dynamically read the authenticated user's subscriptions** instead of a static list
2. **Change frequency to every 8 hours** (instead of weekly)
3. **Skip already-stored videos** (idempotent — should already work via `on conflict do nothing`, but verify)

### What to change

**1. Auth: Switch from API Key to OAuth 2.0**
The Google Cloud project already has OAuth credentials for alexchenog23@gmail.com (used for Gmail). We need to add the YouTube readonly scope.

Changes needed:
- In `collectors/youtube.ts`:
  - Add a new function `getSubscribedChannels(accessToken: string): Promise<YoutubeChannel[]>` that calls `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50`
  - The `isAuthConfigured()` check should now also accept OAuth token via `GOOGLE_OAUTH_TOKEN` env var
  - The OAuth scope needed is `https://www.googleapis.com/auth/youtube.readonly`

- In `scripts/collect-youtube.ts`:
  - Instead of `loadChannels()` from JSON, call `getSubscribedChannels()` with the OAuth token
  - The token should come from env var `GOOGLE_OAUTH_TOKEN` (set as GitHub secret)

**2. Handle the Gmail OAuth token**
The existing Gmail OAuth token (from alexchenog23) needs to be refreshed and passed as `GOOGLE_OAUTH_TOKEN`.

- Read refresh logic from `scripts/gmail-reauth.sh` or the existing scripts
- In the workflow, before collecting, refresh the token using the stored refresh_token + client credentials
- Then pass the fresh access_token to the collector

Alternatively (simpler): we can write a small Node.js script that refreshes the token and writes it to stdout, then use GitHub Actions step outputs to pass it as env var.

**3. Update `.github/workflows/collect-youtube.yml`**
- Change cron from `0 8 * * 1` (weekly Monday) to `0 */8 * * *` (every 8 hours)
- Add the OAuth token refresh step before collecting
- Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` as GitHub secrets
- These values come from the existing `secrets/gmail-credentials.json` and `secrets/gmail-token.json`

**4. Verify dedup**
The collector already uses `on conflict (platform, external_id) do nothing` for `identity_link` and `raw.snapshot`, so re-processing the same video should be a no-op. Just confirm this is the case.

### Path of existing secrets (for reference — do NOT read these files, they're local secrets)
- Gmail creds: `/Users/jameshuang/.openclaw/workspace/secrets/gmail-credentials.json`
- Gmail token: `/Users/jameshuang/.openclaw/workspace/secrets/gmail-token.json`
- These should NOT be committed — the workflow will use GitHub secrets instead

### What James needs to set up in GitHub secrets after this change:
| Secret | Source |
|---|---|
| `GOOGLE_CLIENT_ID` | From gmail-credentials.json |
| `GOOGLE_CLIENT_SECRET` | From gmail-credentials.json |
| `GOOGLE_REFRESH_TOKEN` | From gmail-token.json |
| `YOUTUBE_API_KEY` | Already set (keep for fallback) |

### Files to modify:
- `apps/worker/src/collectors/youtube.ts` — add `getSubscribedChannels()`, update auth check
- `apps/worker/src/scripts/collect-youtube.ts` — use OAuth token instead of static config
- `.github/workflows/collect-youtube.yml` — change cron + add token refresh step
- `apps/worker/package.json` — may need to add a lightweight OAuth2 token refresh lib? Actually Node.js native `fetch` is enough for the token refresh call.

### Verification
- `pnpm --filter @product-tracer/worker typecheck` passes
- The old API Key fallback still works (if `GOOGLE_REFRESH_TOKEN` is not set, fall back to YOUTUBE_API_KEY + DEFAULT_CHANNELS)
- After pushing, James needs to add the 3 new GitHub secrets

---

**不需要问问题。改完写 RESPONSE.md。**
