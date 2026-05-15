#!/usr/bin/env bash
# Start sync API + Cloudflare quick tunnel (HTTPS for GitHub Pages).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f server/.env ]]; then
  echo "Missing server/.env — copy server/.env.example and set POKEFOLIO_TOKEN."
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

if ! curl -sf -o /dev/null "http://localhost:${PORT}/api/health" 2>/dev/null; then
  if ! curl -sf -o /dev/null -H "Authorization: Bearer ${POKEFOLIO_TOKEN}" \
    "http://localhost:${PORT}/api/cards" 2>/dev/null; then
    echo "Starting sync API on port ${PORT}…"
    node server/index.mjs &
    API_PID=$!
    sleep 1
  fi
fi

echo "Starting Cloudflare tunnel → http://localhost:${PORT}"
echo "(Press Ctrl+C to stop the tunnel; API may keep running in background)"
echo ""

cloudflared tunnel --url "http://localhost:${PORT}" 2>&1 | tee /tmp/pokefolio-tunnel.log | while IFS= read -r line; do
  echo "$line"
  if [[ "$line" =~ https://[a-z0-9-]+\.trycloudflare\.com ]]; then
    url=$(echo "$line" | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1)
    if [[ -n "$url" && "$url" != "$(cat server/.tunnel-url 2>/dev/null || true)" ]]; then
      echo "$url" > server/.tunnel-url
      printf '%s\n' "{\"syncUrl\": \"$url\"}" > public/sync-config.json
      echo ""
      echo "  Updated public/sync-config.json — commit & push for GitHub Pages."
      echo ""
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "  Public URL: $url"
      echo "  If this changed, update GitHub secret VITE_SYNC_URL:"
      echo "    gh secret set VITE_SYNC_URL --body \"$url\""
      echo "  Then redeploy (push to main or re-run Deploy workflow)."
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo ""
    fi
  fi
done
