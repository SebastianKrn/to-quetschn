#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

log() {
  printf '[release:compose:check] %s\n' "$*"
}

fail() {
  printf '[release:compose:check][error] %s\n' "$*" >&2
}

if ! command -v docker >/dev/null 2>&1; then
  fail "Docker CLI not found."
  exit 1
fi

cd "$ROOT_DIR"

log "Validating docker-compose.yml"
docker compose -f docker-compose.yml config >/dev/null

log "Validating docker-compose.dev.yml"
docker compose -f docker-compose.dev.yml config >/dev/null

log "Validating docker-compose.pilot.yml"
docker compose -f docker-compose.pilot.yml config >/dev/null

log "Compose files are valid"
