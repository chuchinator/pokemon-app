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

PORT="${PORT:-3456}"

api_ok() {
  curl -sf -o /dev/null -H "Authorization: Bearer ${POKEFOLIO_TOKEN}" \
    "http://localhost:${PORT}/api/cards" 2>/dev/null
}

echo "Sync API → http://localhost:${PORT}"
echo "Allow GitHub Pages origin: ${CORS_ORIGIN:-*}"
echo "Data file: server/data/cards.json"
echo ""

if api_ok; then
  echo "✓ Sync API is already running on port ${PORT}."
  echo "  Run: npm run sync:tunnel   (for GitHub Pages HTTPS access)"
  exit 0
fi

if lsof -i ":${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "✗ Port ${PORT} is in use but the API did not respond."
  echo "  Stop the other process: lsof -i :${PORT}"
  echo "  Or change PORT in server/.env"
  exit 1
fi

echo "Expose HTTPS with: npm run sync:tunnel"
echo ""

exec node server/index.mjs
