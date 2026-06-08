/**
 * Exchange a long-lived Google OAuth refresh token for a short-lived access
 * token and print it to stdout. Used by the collect-youtube workflow to mint a
 * fresh GOOGLE_OAUTH_TOKEN each run (access tokens expire after ~1h).
 *
 * Reads from env (set these as GitHub secrets):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 *
 * Behaviour:
 *   - missing creds  → warn on stderr, exit 0, emit nothing (collector falls
 *                       back to YOUTUBE_API_KEY + static channel list)
 *   - refresh fails  → error on stderr, exit 1 (creds were given but are broken)
 *   - success        → write the access_token (only) to stdout
 *
 * Run: node apps/worker/src/scripts/refresh-google-token.mjs
 */
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

if (!clientId || !clientSecret || !refreshToken) {
  console.error(
    'refresh-google-token: missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN — no token emitted',
  );
  process.exit(0);
}

const res = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  }),
});

if (!res.ok) {
  const body = await res.text();
  console.error(`refresh-google-token: ${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
  process.exit(1);
}

const json = await res.json();
if (!json.access_token) {
  console.error('refresh-google-token: response had no access_token');
  process.exit(1);
}

process.stdout.write(json.access_token);
