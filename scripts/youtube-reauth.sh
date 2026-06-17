#!/usr/bin/env bash
#
# youtube-reauth.sh — re-authorize Google OAuth and mint a fresh refresh token.
#
# The collector + insights pipelines authenticate to the YouTube Data API with a
# long-lived GOOGLE_REFRESH_TOKEN (stored as a GitHub secret). Refresh tokens get
# revoked — Google expires unused ones, a password change kills them, and tokens
# from apps in "Testing" publishing status expire after 7 days. When that happens
# refresh-google-token.mjs starts returning `invalid_grant`.
#
# This script walks you through the OAuth consent flow once, by hand, and prints a
# NEW refresh token. It requests both scopes the project uses:
#   - https://www.googleapis.com/auth/youtube.readonly   (subscriptions + videos)
#   - https://www.googleapis.com/auth/gmail.send          (notification emails)
#
# Requirements: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment
# (the same OAuth *Desktop app* client used for the GitHub secrets). curl + a
# JSON parser (python3 or jq — both optional, falls back to grep).
#
# Usage:
#   export GOOGLE_CLIENT_ID=...        # or put them in apps/worker/.env and `source` it
#   export GOOGLE_CLIENT_SECRET=...
#   bash scripts/youtube-reauth.sh
#
# After it prints the refresh token:
#   gh secret set GOOGLE_REFRESH_TOKEN --body "<the token>"
# (or paste it into GitHub → Settings → Secrets and variables → Actions →
#  GOOGLE_REFRESH_TOKEN). Then trigger "Collect YouTube" / "YouTube Insights" to
#  confirm it works.
#
set -euo pipefail

CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}"

if [[ -z "$CLIENT_ID" || -z "$CLIENT_SECRET" ]]; then
  echo "ERROR: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first." >&2
  echo "  export GOOGLE_CLIENT_ID=...; export GOOGLE_CLIENT_SECRET=..." >&2
  echo "  (or: set -a; source apps/worker/.env; set +a)" >&2
  exit 1
fi

# Desktop-app OAuth clients use the loopback redirect. The browser will redirect
# to http://localhost/?code=... after you approve — the page won't load (nothing
# is listening), but the authorization code is right there in the address bar.
REDIRECT_URI="http://localhost"
SCOPE="https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/gmail.send"

# url-encode the scope (spaces → %20, slashes → %2F) without extra deps.
urlencode() {
  local s="$1" out="" c
  for ((i = 0; i < ${#s}; i++)); do
    c="${s:i:1}"
    case "$c" in
      [a-zA-Z0-9.~_-]) out+="$c" ;;
      *) printf -v c '%%%02X' "'$c"; out+="$c" ;;
    esac
  done
  printf '%s' "$out"
}

AUTH_URL="https://accounts.google.com/o/oauth2/v2/auth"
AUTH_URL+="?client_id=$(urlencode "$CLIENT_ID")"
AUTH_URL+="&redirect_uri=$(urlencode "$REDIRECT_URI")"
AUTH_URL+="&response_type=code"
AUTH_URL+="&scope=$(urlencode "$SCOPE")"
AUTH_URL+="&access_type=offline"   # ask for a refresh token
AUTH_URL+="&prompt=consent"        # force a NEW refresh token every time

cat <<EOF

==============================================================================
 STEP 1 — Open this URL in your browser and approve access:
------------------------------------------------------------------------------
$AUTH_URL
------------------------------------------------------------------------------
 STEP 2 — After approving, the browser redirects to a "localhost" page that
          fails to load. That's expected. Copy the value of the \`code\`
          parameter from the address bar:
            http://localhost/?code=THIS_PART&scope=...
==============================================================================

EOF

read -r -p "Paste the authorization code: " CODE
CODE="${CODE//[[:space:]]/}"
if [[ -z "$CODE" ]]; then
  echo "ERROR: no code entered." >&2
  exit 1
fi

echo "→ Exchanging code for tokens..."
RESPONSE="$(curl -sS https://oauth2.googleapis.com/token \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "code=${CODE}" \
  -d "grant_type=authorization_code" \
  --data-urlencode "redirect_uri=${REDIRECT_URI}")"

# Extract refresh_token with whatever JSON parser is around.
extract() { # $1 = key
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$RESPONSE" | python3 -c "import sys,json;print(json.load(sys.stdin).get('$1',''))"
  elif command -v jq >/dev/null 2>&1; then
    printf '%s' "$RESPONSE" | jq -r ".$1 // empty"
  else
    printf '%s' "$RESPONSE" | grep -o "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | sed -E 's/.*:[[:space:]]*"([^"]*)"/\1/'
  fi
}

REFRESH_TOKEN="$(extract refresh_token)"
if [[ -z "$REFRESH_TOKEN" ]]; then
  echo "ERROR: no refresh_token in the response. Full response:" >&2
  echo "$RESPONSE" >&2
  echo >&2
  echo "Tips: make sure the OAuth client is a *Desktop app* type, and that you" >&2
  echo "used prompt=consent (this script does). If you've authorized before," >&2
  echo "Google only returns a refresh_token when consent is re-prompted." >&2
  exit 1
fi

cat <<EOF

==============================================================================
 SUCCESS — your new refresh token:

   $REFRESH_TOKEN

 Update the GitHub secret:
   gh secret set GOOGLE_REFRESH_TOKEN --body "$REFRESH_TOKEN"

 (or GitHub → Settings → Secrets and variables → Actions → GOOGLE_REFRESH_TOKEN)

 Then verify by triggering the workflow:
   gh workflow run "YouTube Insights"
   gh workflow run "Collect YouTube"
==============================================================================
EOF
