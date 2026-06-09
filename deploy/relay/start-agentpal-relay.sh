#!/bin/sh
set -eu

if [ "$#" -gt 0 ]; then
  exec agentpal-relay "$@"
fi

HOST="${OAP_RELAY_HOST:-0.0.0.0}"
PORT="${PORT:-8790}"

exec agentpal-relay --host "$HOST" --port "$PORT"
