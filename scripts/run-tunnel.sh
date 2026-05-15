#!/usr/bin/env bash
# Prefer stable named tunnel (cloudflared/config.yml), else temporary quick tunnel.
set -euo pipefail
cd "$(dirname "$0")/.."

CONFIG="cloudflared/config.yml"

if [[ -f "$CONFIG" ]]; then
  exec bash scripts/run-stable-tunnel.sh
else
  exec bash scripts/start-quick-tunnel.sh
fi
