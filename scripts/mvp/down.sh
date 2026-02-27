#!/usr/bin/env bash
set -euo pipefail

# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

ensure_artifacts_dir

if [ -f "$PID_FILE" ]; then
  log "Stopping local app services"
  while IFS=: read -r service_name pid; do
    if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" >/dev/null 2>&1 || true
      log "Stopped $service_name (pid=$pid)"
    fi
  done <"$PID_FILE"
  rm -f "$PID_FILE"
fi

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  log "Stopping MVP infra services"
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" down --remove-orphans >/dev/null 2>&1 || true
fi

rm -f "$LOCAL_DOMAIN_STATE_FILE"

log "MVP teardown complete"
