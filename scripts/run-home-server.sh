#!/usr/bin/env bash
# Run the sync API on your computer (for GitHub Pages + home server setup).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f server/.env ]]; then
  set -a
  # shellcheck source=/dev/null
  source server/.env
  set +a
elif [[ -z "${POKEFOLIO_TOKEN:-}" ]]; then
  echo "Create server/.env from server/.env.example (or set POKEFOLIO_TOKEN)."
  exit 1
fi

echo "Sync API → http://localhost:${PORT:-3456}"
echo "Allow GitHub Pages origin: ${CORS_ORIGIN:-*}"
echo "Data file: server/data/cards.json"
echo ""
echo "Expose HTTPS to the internet (required for GitHub Pages), e.g. Cloudflare Tunnel,"
echo "then set GitHub secret VITE_SYNC_URL to that https URL."
echo ""

exec node server/index.mjs
