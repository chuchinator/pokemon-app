#!/usr/bin/env bash
# One-time setup: permanent Cloudflare tunnel URL on YOUR domain.
#
# Usage:
#   npm run tunnel:setup -- pokefolio.yourdomain.com
#
# You need:
#   - Free Cloudflare account (https://dash.cloudflare.com)
#   - A domain on Cloudflare DNS (add site in dashboard, update nameservers)
#
set -euo pipefail
cd "$(dirname "$0")/.."

HOSTNAME="${1:-}"
TUNNEL_NAME="${TUNNEL_NAME:-pokefolio}"

if [[ -z "$HOSTNAME" ]]; then
  echo "Usage: npm run tunnel:setup -- pokefolio.yourdomain.com"
  echo ""
  echo "Example: npm run tunnel:setup -- pokefolio.example.com"
  echo ""
  echo "Your domain must use Cloudflare nameservers."
  exit 1
fi

if ! command -v cloudflared >/dev/null; then
  echo "Install cloudflared first: brew install cloudflared"
  exit 1
fi

mkdir -p cloudflared

echo "━━ Step 1/4: Log in to Cloudflare ━━"
echo "A browser window will open. Pick the domain that owns: ${HOSTNAME}"
echo ""
read -r -p "Press Enter to continue…"
cloudflared tunnel login

echo ""
echo "━━ Step 2/4: Create tunnel \"${TUNNEL_NAME}\" ━━"
if cloudflared tunnel list 2>/dev/null | grep -q "${TUNNEL_NAME}"; then
  echo "Tunnel ${TUNNEL_NAME} already exists."
else
  cloudflared tunnel create "${TUNNEL_NAME}"
fi

TUNNEL_ID=$(cloudflared tunnel list 2>/dev/null | awk -v n="$TUNNEL_NAME" '$0 ~ n {print $1; exit}')
if [[ -z "$TUNNEL_ID" ]]; then
  echo "Could not find tunnel ID. Run: cloudflared tunnel list"
  exit 1
fi

CREDS="${HOME}/.cloudflared/${TUNNEL_ID}.json"
if [[ ! -f "$CREDS" ]]; then
  echo "Missing credentials: ${CREDS}"
  exit 1
fi

PORT="${PORT:-3456}"
if [[ -f server/.env ]]; then
  # shellcheck source=/dev/null
  source server/.env
  PORT="${PORT:-3456}"
fi

cat > cloudflared/config.yml <<EOF
# Stable tunnel for PokéFolio — do not use quick tunnel after this is set up.
tunnel: ${TUNNEL_ID}
credentials-file: ${CREDS}

ingress:
  - hostname: ${HOSTNAME}
    service: http://localhost:${PORT}
  - service: http_status:404
EOF

echo ""
echo "━━ Step 3/4: DNS record → tunnel ━━"
cloudflared tunnel route dns "${TUNNEL_NAME}" "${HOSTNAME}" || {
  echo ""
  echo "If DNS route failed, add manually in Cloudflare dashboard:"
  echo "  CNAME ${HOSTNAME%%.*} → ${TUNNEL_ID}.cfargotunnel.com"
}

STABLE_URL="https://${HOSTNAME}"

echo ""
echo "━━ Step 4/4: Update app config ━━"
printf '%s\n' "{\"syncUrl\": \"${STABLE_URL}\"}" > public/sync-config.json
echo "${STABLE_URL}" > server/.tunnel-url

if [[ -f server/.env ]]; then
  if grep -q '^TUNNEL_PUBLIC_URL=' server/.env; then
    sed -i '' "s|^TUNNEL_PUBLIC_URL=.*|TUNNEL_PUBLIC_URL=${STABLE_URL}|" server/.env 2>/dev/null || \
    sed -i "s|^TUNNEL_PUBLIC_URL=.*|TUNNEL_PUBLIC_URL=${STABLE_URL}|" server/.env
  else
    echo "TUNNEL_PUBLIC_URL=${STABLE_URL}" >> server/.env
  fi
else
  echo "TUNNEL_PUBLIC_URL=${STABLE_URL}" >> server/.env.example
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Done! Permanent URL:"
echo "  ${STABLE_URL}"
echo ""
echo "  1. Start services:"
echo "       npm run sync:server"
echo "       npm run sync:tunnel"
echo ""
echo "  2. GitHub (one time):"
echo "       gh secret set VITE_SYNC_URL --body \"${STABLE_URL}\""
echo "       git add public/sync-config.json && git commit -m \"Set stable tunnel URL\" && git push"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
