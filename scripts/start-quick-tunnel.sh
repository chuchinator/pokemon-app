#!/usr/bin/env bash
# Temporary tunnel — URL changes every restart. Use tunnel:setup for a stable URL.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f server/.env ]]; then
  echo "Missing server/.env — copy server/.env.example"
  exit 1
fi

if ! command -v cloudflared >/dev/null; then
  echo "Install cloudflared: brew install cloudflared"
  exit 1
fi

set -a
# shellcheck source=/dev/null
source server/.env
set +a

PORT="${PORT:-3456}"

bash scripts/ensure-sync-server.sh

echo "Starting temporary Cloudflare tunnel → http://localhost:${PORT}"
echo "⚠ URL changes each restart. For a permanent URL: npm run tunnel:setup -- your.subdomain.com"
echo ""

cloudflared tunnel --url "http://localhost:${PORT}" 2>&1 | while IFS= read -r line; do
  echo "$line"
  if [[ "$line" =~ https://[a-z0-9-]+\.trycloudflare\.com ]]; then
    url=$(echo "$line" | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1)
    if [[ -n "$url" ]]; then
      echo "$url" > server/.tunnel-url
      printf '%s\n' "{\"syncUrl\": \"$url\"}" > public/sync-config.json
      echo ""
      echo "  Public URL: $url  (changes on restart)"
      echo "  gh secret set VITE_SYNC_URL --body \"$url\" && git add public/sync-config.json && git push"
      echo ""
    fi
  fi
done
