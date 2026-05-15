#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
# shellcheck source=/dev/null
source server/.env
set +a

PORT="${PORT:-3456}"

if curl -sf -o /dev/null -H "Authorization: Bearer ${POKEFOLIO_TOKEN:-x}" \
  "http://localhost:${PORT}/api/health" 2>/dev/null; then
  exit 0
fi

if curl -sf -o /dev/null -H "Authorization: Bearer ${POKEFOLIO_TOKEN}" \
  "http://localhost:${PORT}/api/cards" 2>/dev/null; then
  exit 0
fi

echo "Starting sync API on port ${PORT}…"
node server/index.mjs &
