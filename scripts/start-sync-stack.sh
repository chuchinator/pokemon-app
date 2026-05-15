#!/usr/bin/env bash
# Start sync API + tunnel (stable if configured, else temporary).
exec bash "$(dirname "$0")/run-tunnel.sh"
