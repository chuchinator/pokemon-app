#!/usr/bin/env bash
# Run a named Cloudflare tunnel — same public URL every time.
set -euo pipefail
cd "$(dirname "$0")/.."

CONFIG="cloudflared/config.yml"

if [[ ! -f "$CONFIG" ]]; then
  echo "No cloudflared/config.yml — run: npm run tunnel:setup -- pokefolio.yourdomain.com"
  exit 1
fi

if ! command -v cloudflared >/dev/null; then
  echo "Install cloudflared: brew install cloudflared"
  exit 1
fi

set -a
# shellcheck source=/dev/null
source server/.env 2>/dev/null || true
set +a

bash scripts/ensure-sync-server.sh

HOSTNAME=$(grep -E '^\s+-\s+hostname:' "$CONFIG" | head -1 | sed -E 's/.*hostname:\s*"?([^"]+)"?.*/\1/' | tr -d ' ')
STABLE_URL="https://${HOSTNAME}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Stable tunnel: ${STABLE_URL}"
echo "  (this URL does not change when you restart)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exec cloudflared tunnel --config "$CONFIG" run
